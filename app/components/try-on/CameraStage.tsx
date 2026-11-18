import {useEffect, useRef, useState} from 'react';
import {useTranslation} from '~/lib/i18n';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {
  TRACKING_GRACE_MS,
  bufferTransform,
  createAnchorBuffer,
  createEarVisibilityState,
  createSmoothingState,
  smoothTransform,
  toPixelLandmarks,
  type AnchorBuffer,
  type Point,
  type SmoothingState,
} from '~/lib/try-on/anchors';
import {
  attachCameraStream,
  classifyCameraError,
  describeError,
  type CameraFailure,
} from '~/lib/try-on/camera';
import type {FaceDetector} from '~/lib/try-on/face-landmarker';
import {NECKLACE_SMOOTHING_TAU_MS, planFrame} from '~/lib/try-on/frame';
import {drawOverlays, type FrameOverlay} from '~/lib/try-on/render';

export type CameraStatus = 'preparing' | 'tracking' | 'no-face';

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const MIN_FRAME_MS = 1000 / 30;

type CameraStageProps = {
  /** The heavy landmarker; `null` while it is still loading. */
  detector: FaceDetector | null;
  /** The PNG cut-out; `null` until it has been fetched and decoded. */
  overlay: HTMLImageElement | null;
  overlayAspect: number;
  piece: Pick<TryOnPiece, 'kind' | 'sizeCm'>;
  /** Stream acquired by the dialog right after the tap (iOS-friendly). */
  stream: MediaStream;
  title: string;
  onStatus: (status: CameraStatus) => void;
  onFailure: (failure: CameraFailure, detail?: string) => void;
};

/**
 * Front-camera stage.
 *
 * The preview is the `<video>` element itself (visible, mirrored with CSS): iOS
 * Safari suspends a hidden video and releases the camera with it. The piece is
 * painted on a transparent canvas on top, and the landmarker joins later.
 */
export function CameraStage({
  detector,
  overlay,
  overlayAspect,
  piece,
  stream,
  title,
  onStatus,
  onFailure,
}: CameraStageProps) {
  const t = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<FaceDetector | null>(detector);
  const overlayRef = useRef<HTMLImageElement | null>(overlay);
  const overlayAspectRef = useRef(overlayAspect);
  const onStatusRef = useRef(onStatus);
  const onFailureRef = useRef(onFailure);
  const [aspect, setAspect] = useState<string | undefined>(undefined);

  useEffect(() => {
    detectorRef.current = detector;
  }, [detector]);

  // The PNG arrives (or is replaced) without restarting the camera stream.
  useEffect(() => {
    overlayRef.current = overlay;
    overlayAspectRef.current = overlayAspect;
  }, [overlay, overlayAspect]);

  // Callback identity changes must not restart the camera either.
  useEffect(() => {
    onStatusRef.current = onStatus;
    onFailureRef.current = onFailure;
  }, [onStatus, onFailure]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Non-null locals for the frame callbacks (refs can change type-wise).
    const videoElement: HTMLVideoElement = video;
    const canvasElement: HTMLCanvasElement = canvas;

    let disposed = false;
    let animationHandle: number | null = null;
    let videoFrameHandle: number | null = null;
    let lastDetect = 0;
    let lastStatus: CameraStatus | null = null;
    let earState = createEarVisibilityState();
    const smoothing: Record<string, SmoothingState> = {};
    const anchorBuffers: Record<string, AnchorBuffer> = {};
    const tauMs = piece.kind === 'necklace' ? NECKLACE_SMOOTHING_TAU_MS : undefined;
    let lastOverlays: FrameOverlay[] = [];
    let lastMask: Point[] | null = null;
    let lastPlanAt = 0;

    function report(status: CameraStatus) {
      if (lastStatus === status) return;
      lastStatus = status;
      onStatusRef.current(status);
    }

    function schedule() {
      if (disposed) return;

      const callbackVideo = videoElement as VideoWithFrameCallback;

      if (callbackVideo.requestVideoFrameCallback) {
        videoFrameHandle = callbackVideo.requestVideoFrameCallback(renderFrame);
      } else {
        animationHandle = requestAnimationFrame(renderFrame);
      }
    }

    function renderFrame() {
      if (disposed) return;

      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;
      const now = performance.now();

      if (
        document.visibilityState === 'hidden' ||
        width === 0 ||
        height === 0 ||
        now - lastDetect < MIN_FRAME_MS
      ) {
        schedule();
        return;
      }

      lastDetect = now;

      if (canvasElement.width !== width || canvasElement.height !== height) {
        canvasElement.width = width;
        canvasElement.height = height;
        setAspect(`${width} / ${height}`);
      }

      const activeDetector = detectorRef.current;
      const activeOverlay = overlayRef.current;

      if (!activeDetector || !activeOverlay) {
        report('preparing');
        schedule();
        return;
      }

      const points = activeDetector.detectVideo(videoElement, now);
      const plan = points
        ? planFrame({
            points: toPixelLandmarks(points, width, height),
            kind: piece.kind,
            sizeCm: piece.sizeCm,
            overlayAspect: overlayAspectRef.current,
            bounds: {width, height},
            earState,
          })
        : null;

      let overlaysToDraw: FrameOverlay[] = [];
      let maskToDraw: Point[] | null = null;

      if (plan) {
        earState = plan.earState;
        lastPlanAt = now;

        overlaysToDraw = plan.overlays.flatMap((planned) => {
          // 1) short weighted buffer: rejects one-frame landmark spikes.
          const buffered = bufferTransform(
            anchorBuffers[planned.id] ?? createAnchorBuffer(),
            planned.transform,
          );
          anchorBuffers[planned.id] = buffered.buffer;

          // 2) exponential smoothing: removes sub-frame jitter.
          const previous = smoothing[planned.id] ?? createSmoothingState();
          const smoothed = smoothTransform(previous, buffered.transform, {
            now,
            faceWidth: plan.faceWidth,
            tauMs,
          });
          smoothing[planned.id] = smoothed.state;

          return smoothed.value
            ? [{transform: smoothed.value, masked: planned.masked}]
            : [];
        });

        maskToDraw = plan.headMask;
        lastOverlays = overlaysToDraw;
        lastMask = plan.headMask;
      } else if (now - lastPlanAt < TRACKING_GRACE_MS) {
        // Keep the last placement for a beat instead of flickering off.
        overlaysToDraw = lastOverlays;
        maskToDraw = lastMask;
      } else {
        earState = createEarVisibilityState();
        Object.keys(smoothing).forEach((key) => delete smoothing[key]);
        Object.keys(anchorBuffers).forEach((key) => delete anchorBuffers[key]);
        lastOverlays = [];
        lastMask = null;
      }

      const context = canvasElement.getContext('2d');

      if (context) {
        drawOverlays(context, {
          overlay: activeOverlay,
          overlays: overlaysToDraw,
          headMask: maskToDraw,
          mirror: true,
          sourceWidth: width,
          sourceHeight: height,
        });
      }

      report(overlaysToDraw.length > 0 ? 'tracking' : 'no-face');
      schedule();
    }

    void attachCameraStream(videoElement, stream, {
      onError: (error) => {
        if (disposed) return;
        console.error('Camera could not start', error);
        onFailureRef.current(classifyCameraError(error), describeError(error));
      },
    });

    // The camera can be released by the browser (another app takes it, or the
    // shopper switches away): tell the dialog so it can offer a retry.
    const track = stream.getVideoTracks?.()[0];
    track?.addEventListener?.('ended', () => {
      if (!disposed) {
        onFailureRef.current('unavailable', 'TrackEnded: the camera stream ended');
      }
    });

    schedule();

    return () => {
      disposed = true;

      if (animationHandle !== null) cancelAnimationFrame(animationHandle);
      if (videoFrameHandle !== null) {
        (videoElement as VideoWithFrameCallback).cancelVideoFrameCallback?.(
          videoFrameHandle,
        );
      }
    };
  }, [piece.kind, piece.sizeCm, stream]);

  return (
    <div
      className="relative overflow-hidden bg-ink"
      style={aspect ? {aspectRatio: aspect} : undefined}
    >
      <video
        aria-hidden="true"
        autoPlay
        className="absolute inset-0 h-full w-full object-cover -scale-x-100"
        muted
        playsInline
        ref={videoRef}
      />
      <canvas
        aria-label={t('tryOn.preview', {title})}
        className="pointer-events-none absolute inset-0 h-full w-full"
        ref={canvasRef}
        role="img"
      />
    </div>
  );
}
