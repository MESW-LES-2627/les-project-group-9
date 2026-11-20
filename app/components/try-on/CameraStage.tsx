import {useEffect, useRef, useState} from 'react';
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
import {overlayAspect, type LoadedTryOnPiece} from '~/lib/try-on/overlay';
import {drawOverlays, type FrameLayer} from '~/lib/try-on/render';

export type CameraStatus = 'preparing' | 'tracking' | 'no-face';

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const MIN_FRAME_MS = 1000 / 30;

type CameraStageProps = {
  /** The heavy landmarker; `null` while it is still loading. */
  detector: FaceDetector | null;
  /** Every usable piece of the look, with its decoded PNG. */
  pieces: LoadedTryOnPiece[];
  /** Stream acquired by the dialog right after the tap (iOS-friendly). */
  stream: MediaStream;
  /** Ready-made accessible label for the preview canvas. */
  previewLabel: string;
  onStatus: (status: CameraStatus) => void;
  onFailure: (failure: CameraFailure, detail?: string) => void;
};

/**
 * Front-camera stage.
 *
 * The preview is the `<video>` element itself (visible, mirrored with CSS): iOS
 * Safari suspends a hidden video and releases the camera with it. The pieces are
 * painted on a transparent canvas on top, and the landmarker joins later.
 */
export function CameraStage({
  detector,
  pieces,
  stream,
  previewLabel,
  onStatus,
  onFailure,
}: CameraStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<FaceDetector | null>(detector);
  const piecesRef = useRef<LoadedTryOnPiece[]>(pieces);
  const onStatusRef = useRef(onStatus);
  const onFailureRef = useRef(onFailure);
  const [aspect, setAspect] = useState<string | undefined>(undefined);

  useEffect(() => {
    detectorRef.current = detector;
  }, [detector]);

  // Pieces join (or are replaced) without restarting the camera stream.
  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

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
    let lastLayers: FrameLayer[] = [];
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
      const activePieces = piecesRef.current;

      if (!activeDetector || activePieces.length === 0) {
        report('preparing');
        schedule();
        return;
      }

      const points = activeDetector.detectVideo(videoElement, now);
      const plan = points
        ? planFrame({
            points: toPixelLandmarks(points, width, height),
            pieces: activePieces.map(({piece, image}) => ({
              ...piece,
              overlayAspect: overlayAspect(image),
            })),
            bounds: {width, height},
            earState,
          })
        : null;

      let layersToDraw: FrameLayer[] = [];
      let maskToDraw: Point[] | null = null;

      if (plan) {
        earState = plan.earState;
        lastPlanAt = now;

        const images = new Map(
          activePieces.map(({piece, image}) => [piece.id, image]),
        );
        const activeKeys = new Set<string>();

        layersToDraw = plan.overlays.flatMap((planned) => {
          const key = `${planned.id}:${planned.slot}`;
          activeKeys.add(key);

          // 1) short weighted buffer: rejects one-frame landmark spikes.
          const buffered = bufferTransform(
            anchorBuffers[key] ?? createAnchorBuffer(),
            planned.transform,
          );
          anchorBuffers[key] = buffered.buffer;

          // 2) exponential smoothing: removes sub-frame jitter.
          const previous = smoothing[key] ?? createSmoothingState();
          const smoothed = smoothTransform(previous, buffered.transform, {
            now,
            faceWidth: planned.referenceWidth,
            tauMs:
              planned.slot === 'necklace'
                ? NECKLACE_SMOOTHING_TAU_MS
                : undefined,
          });
          smoothing[key] = smoothed.state;

          const image = images.get(planned.id);

          return smoothed.value && image
            ? [
                {
                  image,
                  transform: smoothed.value,
                  masked: planned.masked,
                },
              ]
            : [];
        });

        for (const key of Object.keys(smoothing)) {
          if (!activeKeys.has(key)) delete smoothing[key];
        }
        for (const key of Object.keys(anchorBuffers)) {
          if (!activeKeys.has(key)) delete anchorBuffers[key];
        }

        maskToDraw = plan.headMask;
        lastLayers = layersToDraw;
        lastMask = plan.headMask;
      } else if (now - lastPlanAt < TRACKING_GRACE_MS) {
        // Keep the last placement for a beat instead of flickering off.
        layersToDraw = lastLayers;
        maskToDraw = lastMask;
      } else {
        earState = createEarVisibilityState();
        Object.keys(smoothing).forEach((key) => delete smoothing[key]);
        Object.keys(anchorBuffers).forEach((key) => delete anchorBuffers[key]);
        lastLayers = [];
        lastMask = null;
      }

      const context = canvasElement.getContext('2d');

      if (context) {
        drawOverlays(context, {
          layers: layersToDraw,
          headMask: maskToDraw,
          mirror: true,
          sourceWidth: width,
          sourceHeight: height,
        });
      }

      report(layersToDraw.length > 0 ? 'tracking' : 'no-face');
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
        onFailureRef.current(
          'unavailable',
          'TrackEnded: the camera stream ended',
        );
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
  }, [stream]);

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
        aria-label={previewLabel}
        className="pointer-events-none absolute inset-0 h-full w-full"
        ref={canvasRef}
        role="img"
      />
    </div>
  );
}
