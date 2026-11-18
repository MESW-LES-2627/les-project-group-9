import {releaseFaceDetector, warmFaceDetector} from './face-landmarker';

let started = false;

/**
 * Warms the try-on assets (WASM, model and the MediaPipe JS chunk) while the
 * shopper is still browsing, so the overlay appears quickly after the tap.
 * Deliberately fire-and-forget: failures are ignored and the dialog retries.
 */
export function preloadTryOnAssets(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  if (!shouldPreload()) return;

  const assets = [
    '/mediapipe/wasm/vision_wasm_internal.wasm',
    '/models/face_landmarker.task',
  ];

  const load = () => {
    for (const asset of assets) {
      // Fills the HTTP cache; the landmarker then fetches instantly.
      void fetch(asset).catch(() => undefined);
    }

    // Warm the lazy JS chunk and compile the landmarker before the tap.
    void import('@mediapipe/tasks-vision')
      .then(() => warmFaceDetector())
      .catch(() => undefined);
  };

  const idle = (
    window as Window & {
      requestIdleCallback?: (callback: () => void, options?: {timeout: number}) => number;
    }
  ).requestIdleCallback;

  window.addEventListener('pagehide', releaseFaceDetector, {once: true});

  if (idle) idle(load, {timeout: 3000});
  else window.setTimeout(load, 1500);
}

/** Skip the ~18 MB warm-up on metered or very slow connections. */
function shouldPreload(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: {saveData?: boolean; effectiveType?: string};
    }
  ).connection;

  if (connection?.saveData) return false;

  return !/(^|-)2g$/.test(connection?.effectiveType ?? '');
}
