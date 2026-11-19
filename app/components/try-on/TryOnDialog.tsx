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
import {getFaceDetector, type FaceDetector} from '~/lib/try-on/face-landmarker';
import {loadTryOnOverlays, type LoadedTryOnPiece} from '~/lib/try-on/overlay';
import {Dialog, dialogButton} from '~/components/shared/Dialog';
import {CameraStage, type CameraStatus} from './CameraStage';
import {PhotoFallback} from './PhotoFallback';
import {StatusMessage} from './StatusMessage';

type Phase = 'loading' | 'ready' | 'camera' | 'photo' | 'unavailable';

type TryOnDialogProps = {
  onClose: () => void;
  /** One or more pieces drawn together in the same camera frame. */
  pieces: TryOnPiece[];
  /** Product title for a single piece; omitted for a fitting-room look. */
  title?: string;
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
 * Fast path: the camera stream (requested in the shopper's tap) is shown as soon
 * as it is ready, while the overlays and the heavy face landmarker load in
 * parallel. The landmarker and camera tracks are released on unmount; the
 * release is deferred by a tick so React StrictMode's simulated unmount does
 * not stop (and reopen) the hardware camera.
 */
export function TryOnDialog({
  onClose,
  pieces,
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
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(
    null,
  );
  const [ready, setReady] = useState<LoadedTryOnPiece[]>([]);
  const [detector, setDetector] = useState<FaceDetector | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const requestRef = useRef<Promise<CameraAttempt> | null>(null);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const piecesRef = useRef(pieces);
  const copyRef = useRef({t, title});

  // A new array with the same pieces must not restart the camera.
  const piecesKey = pieces
    .map((piece) => `${piece.id}:${piece.overlayUrl}:${piece.sizeCm}`)
    .join('|');

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  useEffect(() => {
    copyRef.current = {t, title};
  }, [t, title]);

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
        : (camera ?? (requestRef.current ??= requestCamera()));

    // Start the landmarker immediately: it is the long pole and must not delay
    // the camera (or be delayed by it). It is shared for the page session.
    const detectorPromise = getFaceDetector();
    // The overlay path may stop early (nothing usable); keep a rejection from
    // becoming an unhandled promise while the main path still logs it.
    void detectorPromise.catch(() => undefined);
    // The PNGs are fetched in parallel and never delay the preview.
    const overlayPromise = loadTryOnOverlays(piecesRef.current);

    async function load() {
      const opened = await attempt;

      if (!active) return;

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

      // The overlay PNGs decode while the live preview is already on screen.
      try {
        const overlays = await overlayPromise;
        if (!active) return;

        if (overlays.ready.length === 0) {
          const {t: translate, title: currentTitle} = copyRef.current;

          stopStream(streamRef.current);
          streamRef.current = null;
          setStream(null);
          setReady([]);
          setUnavailableMessage(
            overlays.opaque > 0
              ? currentTitle
                ? translate('tryOn.opaque')
                : translate('tryOn.lookUnavailable')
              : translate('tryOn.failed'),
          );
          setPhase('unavailable');
          return;
        }

        setReady(overlays.ready);
      } catch (error) {
        if (!active) return;
        console.error('Try-on could not start', error);
        stopStream(streamRef.current);
        streamRef.current = null;
        setStream(null);
        setFailure('unknown');
        setDetail(describeError(error));
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
      }, 0);
    };
  }, [piecesKey, initialMode, autoStart, camera]);

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
        const faceDetector = await getFaceDetector();
        detectorRef.current = faceDetector;
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

  const heading = title ? t('tryOn.title', {title}) : t('tryOn.lookTitle');
  const startPrompt = title
    ? t('tryOn.startPrompt', {title})
    : t('tryOn.lookPrompt');
  const previewLabel = title
    ? t('tryOn.preview', {title})
    : t('tryOn.lookPreview');

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
      title={heading}
    >
      {phase === 'loading' ? (
        <div className="space-y-3">
          <div
            aria-hidden="true"
            className="aspect-[4/5] w-full animate-pulse bg-secondary"
          />
          <StatusMessage message={t('tryOn.loading')} />
        </div>
      ) : null}

      {phase === 'ready' ? (
        <>
          <p className="text-sm leading-7 text-primary">{startPrompt}</p>
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
        <p className="text-sm leading-7 text-primary">
          {unavailableMessage ?? t('tryOn.opaque')}
        </p>
      ) : null}

      {phase === 'camera' && stream ? (
        <>
          <CameraStage
            detector={detector}
            key={cameraAttempt}
            onFailure={handleFailure}
            onStatus={handleStatus}
            pieces={ready}
            previewLabel={previewLabel}
            stream={stream}
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
          {detector && ready.length > 0 ? (
            <PhotoFallback
              detector={detector}
              pieces={ready}
              previewLabel={previewLabel}
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
