import {useEffect, useRef, useState} from 'react';
import {useTranslation} from '~/lib/i18n';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {
  createEarVisibilityState,
  createSmoothingState,
  smoothTransform,
  toPixelLandmarks,
  type SmoothingState,
} from '~/lib/try-on/anchors';
import {
  attachCameraStream,
  classifyCameraError,
  describeError,
  type CameraFailure,
} from '~/lib/try-on/camera';
import type {FaceDetector} from '~/lib/try-on/face-landmarker';
import {planFrame} from '~/lib/try-on/frame';
import {drawOverlays} from '~/lib/try-on/render';

export type CameraStatus = 'preparing' | 'tracking' | 'no-face';

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const MIN_FRAME_MS = 1000 / 30;

type CameraStageProps = {
  /** The heavy landmarker; `null` while it is still loading. */
  detector: FaceDetector | null;
  overlay: HTMLImageElement;
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
  const [aspect, setAspect] = useState<string | undefined>(undefined);

  useEffect(() => {
    detectorRef.current = detector;
  }, [detector]);

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

    function report(status: CameraStatus) {
      if (lastStatus === status) return;
      lastStatus = status;
      onStatus(status);
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

      if (!activeDetector) {
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
            overlayAspect,
            bounds: {width, height},
            earState,
          })
        : null;

      if (plan) earState = plan.earState;
      else {
        earState = createEarVisibilityState();
        Object.keys(smoothing).forEach((key) => delete smoothing[key]);
      }

      const overlays = (plan?.overlays ?? []).flatMap((planned) => {
        const previous = smoothing[planned.id] ?? createSmoothingState();
        const smoothed = smoothTransform(previous, planned.transform, {
          now,
          faceWidth: plan?.faceWidth ?? 0,
        });
        smoothing[planned.id] = smoothed.state;

        return smoothed.value
          ? [{transform: smoothed.value, masked: planned.masked}]
          : [];
      });

      const context = canvasElement.getContext('2d');

      if (context) {
        drawOverlays(context, {
          overlay,
          overlays,
          headMask: plan?.headMask ?? null,
          mirror: true,
          sourceWidth: width,
          sourceHeight: height,
        });
      }

      report(overlays.length > 0 ? 'tracking' : 'no-face');
      schedule();
    }

    void attachCameraStream(videoElement, stream, {
      onError: (error) => {
        if (disposed) return;
        console.error('Camera could not start', error);
        onFailure(classifyCameraError(error), describeError(error));
      },
    });

    // The camera can be released by the browser (another app takes it, or the
    // shopper switches away): tell the dialog so it can offer a retry.
    const track = stream.getVideoTracks?.()[0];
    track?.addEventListener?.('ended', () => {
      if (!disposed) {
        onFailure('unavailable', 'TrackEnded: the camera stream ended');
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
  }, [overlay, overlayAspect, piece.kind, piece.sizeCm, stream, onStatus, onFailure]);

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
