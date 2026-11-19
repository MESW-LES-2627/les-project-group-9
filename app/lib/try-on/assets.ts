import loaderUrl from '@mediapipe/tasks-vision/vision_wasm_internal.js?url';
import wasmUrl from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url';
import modelUrl from '~/assets/models/face_landmarker.task?url';

/**
 * MediaPipe's runtime, emitted by Vite as hashed client assets.
 *
 * They used to live in `public/` and be copied there by a script, which worked
 * in dev but not on the Oxygen deployment: an unversioned public file that is
 * not part of the client manifest can be answered with the platform's HTML 404
 * page, and Emscripten then aborts with "both async and sync fetching of the
 * wasm failed". Importing them with `?url` puts the loader, the WASM binary and
 * the model in `dist/client/assets` next to the app's JS/CSS, so Oxygen serves
 * them with a content hash, an immutable cache and the right MIME type.
 */
export const TRY_ON_ASSETS = {loaderUrl, wasmUrl, modelUrl} as const;

export type TryOnAssetKey = keyof typeof TRY_ON_ASSETS;

const ASSET_LABELS: Record<TryOnAssetKey, string> = {
  loaderUrl: 'loader',
  wasmUrl: 'wasm',
  modelUrl: 'model',
};

type AssetFetch = (url: string, init?: RequestInit) => Promise<Response>;

export type TryOnAssetProbe = {
  key: TryOnAssetKey;
  url: string;
  ok: boolean;
  status?: number;
  contentType?: string | null;
  error?: string;
};

/** True when a response is a plausible MediaPipe asset rather than an HTML page. */
function isBinaryResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') ?? '';
  return response.ok && !/text\/html/i.test(contentType);
}

async function probeAsset(
  key: TryOnAssetKey,
  url: string,
  fetchImpl: AssetFetch,
): Promise<TryOnAssetProbe> {
  try {
    // A ranged request keeps the probe cheap for the 14 MB WASM file; the body
    // is cancelled as soon as the status and headers are known.
    const response = await fetchImpl(url, {
      cache: 'no-store',
      headers: {Range: 'bytes=0-0'},
    });
    const result = {
      key,
      url,
      ok: isBinaryResponse(response),
      status: response.status,
      contentType: response.headers.get('content-type'),
    };

    await response.body?.cancel().catch(() => undefined);

    return result;
  } catch (error) {
    return {
      key,
      url,
      ok: false,
      error:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
    };
  }
}

/**
 * Checks the three assets without throwing. Run it only when the landmarker
 * fails: the happy path must download each file once, not twice.
 */
export function diagnoseTryOnAssets(
  fetchImpl: AssetFetch = fetch,
): Promise<TryOnAssetProbe[]> {
  const entries = Object.entries(TRY_ON_ASSETS) as Array<
    [TryOnAssetKey, string]
  >;

  return Promise.all(
    entries.map(([key, url]) => probeAsset(key, url, fetchImpl)),
  );
}

/** `wasm /assets/…-abc.wasm 404 text/html` — short enough for the phone banner. */
export function describeAssetProbes(
  probes: readonly TryOnAssetProbe[],
): string {
  return probes
    .map((probe) => {
      const path = assetPath(probe.url);
      const outcome =
        probe.status !== undefined
          ? `${probe.status} ${probe.contentType ?? 'no content-type'}`
          : (probe.error ?? 'fetch failed');

      return `${ASSET_LABELS[probe.key]} ${path} ${outcome}`.trim();
    })
    .join('; ');
}

export class TryOnAssetError extends Error {
  constructor(message: string, options?: {cause?: unknown}) {
    super(message, options);
    this.name = 'TryOnAssetError';
  }
}

function assetPath(url: string): string {
  try {
    return new URL(url, 'https://try-on.invalid').pathname;
  } catch {
    return url;
  }
}
