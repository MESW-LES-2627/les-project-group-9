export type CameraFailure = 'denied' | 'unavailable' | 'unsupported' | 'unknown';

export type CameraAttempt = {
  stream: MediaStream | null;
  error: unknown;
};

/** The subset of `HTMLVideoElement` the camera needs (keeps tests DOM-free). */
export type VideoTarget = {
  srcObject: MediaProvider | null;
  play: () => Promise<void>;
};

export type CameraHandle = {
  stream: MediaStream;
  stop: () => void;
};


type CameraRequest = (
  constraints: MediaStreamConstraints,
) => Promise<MediaStream>;

type VideoElementTarget = VideoTarget & {
  muted?: boolean;
  readyState?: number;
  setAttribute?: (name: string, value: string) => void;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

const PLAY_TIMEOUT_MS = 3000;

type AttachOptions = {
  /** Called when playback fails; the preview keeps running either way. */
  onError?: (error: unknown) => void;
};

/** Front-camera constraints: 720p, no audio. */
export function cameraConstraints(): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: 'user',
      width: {ideal: 1280},
      height: {ideal: 720},
    },
  };
}

/** Maps a `getUserMedia` rejection to a UI-friendly reason. */
export function classifyCameraError(error: unknown): CameraFailure {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as {name: unknown}).name)
      : '';

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'unavailable';
    case 'NotSupportedError':
      return 'unsupported';
    default:
      return 'unknown';
  }
}

/**
 * `null` when this page can use the camera, otherwise the reason. Catches the
 * two common phone traps: in-app browsers without `getUserMedia` and pages
 * served over plain HTTP.
 */
export function cameraSupport(): CameraFailure | null {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'unsupported';
  }

  return null;
}

/** Stops every track of a stream (camera LED off). */
export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Asks for the front camera. Kept separate from `startCamera` so the dialog can
 * request it as soon as the shopper taps Try on (iOS is happiest when the
 * permission request follows the gesture) while the landmarker loads.
 */
export async function openCameraStream(
  request: CameraRequest = requestFromNavigator(),
): Promise<MediaStream> {
  try {
    return await request(cameraConstraints());
  } catch (error) {
    // Some browsers reject `facingMode` constraints on tablets; retry plainly.
    if (!isOverconstrained(error)) throw error;
    return request({audio: false, video: true});
  }
}

/**
 * Starts the camera without rejecting: returns the stream or the browser
 * error. Call this synchronously from a tap handler — iOS Safari ties
 * `getUserMedia` to the user gesture.
 */
export function requestCamera(request?: CameraRequest): Promise<CameraAttempt> {
  try {
    return openCameraStream(request).then(
      (stream) => ({stream, error: null}),
      (error: unknown) => ({stream: null, error}),
    );
  } catch (error) {
    return Promise.resolve({stream: null, error});
  }
}

/**
 * Attaches a stream to the video element and starts playback.
 *
 * The preview **is** this element, so playback must not be awaited: Safari
 * leaves `play()` pending on some devices and stops the camera when nothing
 * consumes the stream. A failing `play()` is reported through `onError` and
 * iOS Safari's `AbortError` is retried once after `canplay`.
 */
export function attachCameraStream(
  video: VideoTarget,
  stream: MediaStream,
  options: AttachOptions = {},
): Promise<void> {
  const element = video as VideoElementTarget;

  // iOS only plays inline camera video when these are set before srcObject.
  element.muted = true;
  element.setAttribute?.('playsinline', 'true');
  element.setAttribute?.('webkit-playsinline', 'true');
  element.setAttribute?.('autoplay', 'true');
  element.srcObject = stream;

  const playback = playWithRetry(element).catch((error: unknown) => {
    options.onError?.(error);
  });

  return Promise.race([
    playback,
    new Promise<void>((resolve) => {
      setTimeout(resolve, PLAY_TIMEOUT_MS);
    }),
  ]);
}

/**
 * Human-readable `Name: message` for the on-screen diagnostic. Raw browser
 * errors are shown to the shopper so a phone can report the exact cause.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return joinErrorParts(error.name, error.message);
  }

  if (typeof error === 'object' && error !== null) {
    const {name, message} = error as {name?: unknown; message?: unknown};

    if (typeof name === 'string' || typeof message === 'string') {
      return joinErrorParts(
        typeof name === 'string' ? name : undefined,
        typeof message === 'string' ? message : undefined,
      );
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown camera error';
    }
  }

  return String(error);
}

function joinErrorParts(name?: string, message?: string): string {
  if (name && message) return `${name}: ${message}`;
  return message || name || 'Unknown camera error';
}

async function playWithRetry(element: VideoElementTarget): Promise<void> {
  try {
    await element.play();
  } catch (error) {
    if (!isAbort(error)) throw error;
    await waitForEvent(element, 'canplay', PLAY_TIMEOUT_MS);
    await element.play();
  }
}

function waitForEvent(
  element: VideoElementTarget,
  event: string,
  timeoutMs: number,
): Promise<void> {  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      element.removeEventListener?.(event, finish);
      clearTimeout(timer);
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);
    element.addEventListener?.(event, finish);
  });
}

function isAbort(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as {name: unknown}).name === 'AbortError'
  );
}

function isOverconstrained(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as {name: unknown}).name === 'OverconstrainedError'
  );
}

function requestFromNavigator(): CameraRequest {
  const mediaDevices =
    typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;

  if (!mediaDevices?.getUserMedia) {
    return () => Promise.reject(namedError('NotFoundError'));
  }

  return (constraints) => mediaDevices.getUserMedia(constraints);
}

function namedError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}
