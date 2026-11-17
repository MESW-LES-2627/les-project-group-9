import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslation} from '~/lib/i18n';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {
  cameraSupport,
  classifyCameraError,
  describeError,
  requestCamera,
  stopStream,
  type CameraAttempt,
  type CameraFailure,
} from '~/lib/try-on/camera';
import {
  createFaceDetector,
  type FaceDetector,
} from '~/lib/try-on/face-landmarker';
import {loadOverlayImage, overlayTransparency} from '~/lib/try-on/overlay';
import {Dialog, dialogButton} from '~/components/shared/Dialog';
import {CameraStage, type CameraStatus} from './CameraStage';
import {PhotoFallback} from './PhotoFallback';
import {StatusMessage} from './StatusMessage';

type Phase = 'loading' | 'ready' | 'camera' | 'photo' | 'unavailable';

type TryOnDialogProps = {
  onClose: () => void;
  piece: TryOnPiece;
  title: string;
  initialMode: 'camera' | 'photo';
  /**
   * `false` for QR deep links: a page load has no tap gesture, so the dialog
   * asks for one before opening the camera (iOS Safari).
   */
  autoStart?: boolean;
  /** Camera request started inside the tap handler, if any. */
  camera?: Promise<CameraAttempt> | null;
};

/**
 * Try-on modal.
 *
 * Fast path: the camera stream (requested in the shopper's tap) and the overlay
 * are shown as soon as they are ready, while the heavy face landmarker loads in
 * parallel. The landmarker and camera tracks are released on unmount; the
 * release is deferred by a tick so React StrictMode's simulated unmount does
 * not stop (and reopen) the hardware camera.
 */
export function TryOnDialog({
  onClose,
  piece,
  title,
  initialMode,
  autoStart = true,
  camera = null,
}: TryOnDialogProps) {
  const t = useTranslation();
  const [phase, setPhase] = useState<Phase>('loading');
  const [status, setStatus] = useState<CameraStatus | 'starting'>('starting');
  const [failure, setFailure] = useState<CameraFailure | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<HTMLImageElement | null>(null);
  const [detector, setDetector] = useState<FaceDetector | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const detectorPromiseRef = useRef<Promise<FaceDetector> | null>(null);
  const requestRef = useRef<Promise<CameraAttempt> | null>(null);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cancel the deferred release from StrictMode's simulated unmount: the
    // stream and landmarker are still needed by this mount.
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }

    let active = true;
    const wantsCamera = initialMode === 'camera';
    const support = wantsCamera ? cameraSupport() : null;
    const attempt: Promise<CameraAttempt> =
      !wantsCamera || !autoStart || support
        ? Promise.resolve({stream: null, error: null})
        : camera ?? (requestRef.current ??= requestCamera());

    // Start the landmarker immediately: it is the long pole and must not delay
    // the camera (or be delayed by it).
    const detectorPromise =
      detectorPromiseRef.current ?? createFaceDetector();
    detectorPromiseRef.current = detectorPromise;

    async function load() {
      let opened: CameraAttempt;

      try {
        const [image, cameraResult] = await Promise.all([
          loadOverlayImage(piece.overlayUrl),
          attempt,
        ]);
        opened = cameraResult;

        if (!active) return;

        if (overlayTransparency(image) === 'opaque') {
          stopStream(opened.stream);
          setPhase('unavailable');
          return;
        }

        setOverlay(image);
      } catch (error) {
        if (!active) return;
        // The overlay failed: release a camera that was already opened.
        const settled = await attempt;
        stopStream(settled.stream);
        throw error;
      }

      if (opened.stream) {
        streamRef.current = opened.stream;
        setStream(opened.stream);
      }

      if (!wantsCamera) {
        setPhase('photo');
      } else if (support) {
        setFailure(support);
        setDetail(null);
        setPhase('photo');
      } else if (!autoStart) {
        setPhase('ready');
      } else if (opened.stream) {
        setPhase('camera');
      } else {
        logCameraFailure(opened.error);
        setFailure(classifyCameraError(opened.error));
        setDetail(describeError(opened.error));
        setPhase('photo');
      }

      try {
        const faceDetector = await detectorPromise;
        if (!active) return;

        detectorRef.current = faceDetector;
        setDetector(faceDetector);
      } catch (error) {
        if (!active) return;
        console.error('Try-on could not start', error);
        detectorPromiseRef.current = null;
        // The camera is of no use without the landmarker; release it.
        stopStream(streamRef.current);
        streamRef.current = null;
        setStream(null);
        setFailure('unknown');
        setDetail(describeError(error));
        setPhase('photo');
      }
    }

    load().catch((error: unknown) => {
      if (!active) return;
      // The real cause (overlay URL or asset load) is shown and logged.
      console.error('Try-on could not start', error);
      setFailure('unknown');
      setDetail(describeError(error));
      setPhase('photo');
    });

    return () => {
      active = false;

      // Defer the release one tick: StrictMode unmounts and re-mounts in the
      // same task, so the next effect run cancels this and keeps the stream.
      releaseTimerRef.current = setTimeout(() => {
        releaseTimerRef.current = null;

        stopStream(streamRef.current);
        streamRef.current = null;

        // The request may still be in flight when the dialog really closes.
        void attempt.then((value) => stopStream(value.stream));

        const pendingDetector = detectorPromiseRef.current;
        detectorPromiseRef.current = null;
        void pendingDetector
          ?.then((faceDetector) => faceDetector.close())
          .catch(() => undefined);
      }, 0);
    };
  }, [piece.overlayUrl, initialMode, autoStart, camera]);

  const handleStatus = useCallback((next: CameraStatus) => {
    setStatus(next);
  }, []);

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
  }, []);

  const handleFailure = useCallback(
    (reason: CameraFailure, detailText?: string) => {
      stopCamera();
      setFailure(reason);
      setDetail(detailText ?? null);
      setPhase('photo');
    },
    [stopCamera],
  );

  const goToPhoto = useCallback(() => {
    stopCamera();
    setPhase('photo');
  }, [stopCamera]);

  /** Starts the camera from a click (also used as the retry action). */
  const startCameraNow = useCallback(async () => {
    setFailure(null);
    setDetail(null);
    setStatus('preparing');

    const support = cameraSupport();
    if (support) {
      setFailure(support);
      setPhase('photo');
      return;
    }

    // Called synchronously in the click handler, before any await.
    const opened = await requestCamera();

    if (!opened.stream) {
      logCameraFailure(opened.error);
      setFailure(classifyCameraError(opened.error));
      setDetail(describeError(opened.error));
      setPhase('photo');
      return;
    }

    streamRef.current = opened.stream;
    setStream(opened.stream);
    setPhase('camera');
    setCameraAttempt((current) => current + 1);

    if (!detector) {
      try {
        const faceDetector = await createFaceDetector();
        detectorRef.current = faceDetector;
        detectorPromiseRef.current = Promise.resolve(faceDetector);
        setDetector(faceDetector);
      } catch (error) {
        console.error('Try-on could not start', error);
        stopStream(opened.stream);
        streamRef.current = null;
        setStream(null);
        setFailure('unknown');
        setDetail(describeError(error));
        setPhase('photo');
      }
    }
  }, [detector]);

  const failureMessage =
    failure === 'denied'
      ? t('tryOn.denied')
      : failure === 'unavailable'
        ? t('tryOn.unavailable')
        : failure === 'unsupported'
          ? t('tryOn.unsupported')
          : failure === 'unknown'
            ? t('tryOn.failed')
            : null;

  const cameraStatus =
    status === 'starting'
      ? t('tryOn.starting')
      : status === 'preparing'
        ? t('tryOn.preparing')
        : status === 'no-face'
          ? t('tryOn.noFace')
          : null;

  const overlayAspect =
    overlay && overlay.naturalHeight > 0
      ? overlay.naturalWidth / overlay.naturalHeight
      : 1;

  return (
    <Dialog
      bodyClassName="mt-3 space-y-3"
      className="max-w-lg p-4"
      footer={
        <>
          {phase === 'camera' || phase === 'ready' ? (
            <button
              className={dialogButton.secondary}
              onClick={goToPhoto}
              type="button"
            >
              {t('tryOn.upload')}
            </button>
          ) : null}
          <button
            className={dialogButton.primary}
            onClick={onClose}
            type="button"
          >
            {t('nav.close')}
          </button>
        </>
      }
      onClose={onClose}
      open
      title={t('tryOn.title', {title})}
    >
      {phase === 'loading' ? (
        <StatusMessage message={t('tryOn.loading')} />
      ) : null}

      {phase === 'ready' ? (
        <>
          <p className="text-sm leading-7 text-primary">
            {t('tryOn.startPrompt', {title})}
          </p>
          <button
            className={`${dialogButton.primary} w-full`}
            onClick={() => void startCameraNow()}
            type="button"
          >
            {t('tryOn.startCamera')}
          </button>
        </>
      ) : null}

      {phase === 'unavailable' ? (
        <p className="text-sm leading-7 text-primary">{t('tryOn.opaque')}</p>
      ) : null}

      {phase === 'camera' && overlay && stream ? (
        <>
          <CameraStage
            detector={detector}
            key={cameraAttempt}
            onFailure={handleFailure}
            onStatus={handleStatus}
            overlay={overlay}
            overlayAspect={overlayAspect}
            piece={piece}
            stream={stream}
            title={title}
          />
          <StatusMessage message={cameraStatus} />
        </>
      ) : null}

      {phase === 'photo' ? (
        <>
          {failureMessage ? (
            <div className="space-y-2">
              <StatusMessage message={failureMessage} tone="error" />
              {detail ? (
                <p className="break-words text-xs leading-6 text-primary">
                  {t('tryOn.errorDetail', {detail})}
                </p>
              ) : null}
              <button
                className={dialogButton.secondary}
                onClick={() => void startCameraNow()}
                type="button"
              >
                {t('tryOn.retry')}
              </button>
            </div>
          ) : null}
          {detector && overlay ? (
            <PhotoFallback
              detector={detector}
              overlay={overlay}
              overlayAspect={overlayAspect}
              piece={piece}
              title={title}
            />
          ) : (
            <StatusMessage message={t('tryOn.loading')} />
          )}
        </>
      ) : null}

      <p className="text-xs leading-6 text-primary">{t('tryOn.privacy')}</p>
    </Dialog>
  );
}

/** Logs enough context to diagnose a phone that refuses the camera. */
function logCameraFailure(error: unknown): void {
  if (typeof window === 'undefined') return;

  console.error('Try-on camera could not start', error, {
    secureContext: window.isSecureContext,
    hasMediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
    userAgent: navigator.userAgent,
  });
}
