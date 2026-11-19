import type {TryOnPiece} from './catalog';

export type OverlayTransparency = 'transparent' | 'opaque' | 'unknown';

const cache = new Map<string, Promise<HTMLImageElement>>();

/**
 * Loads the overlay PNG with CORS so it can be drawn into a canvas without
 * tainting it. The URL already carries the `cors=1` cache key (see `url.ts`).
 * Results are memoised per URL, so an idle preload makes the dialog instant and
 * a failed load is retried next time.
 */
export function loadOverlayImage(url: string): Promise<HTMLImageElement> {
  const cached = cache.get(url);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`overlay-load: ${url}`));
    image.src = url;
  });

  cache.set(url, promise);
  promise.catch(() => cache.delete(url));

  return promise;
}

/** Fire-and-forget warm-up for the product/fitting-room pages. */
export function preloadOverlayImage(url: string): void {
  void loadOverlayImage(url).catch(() => undefined);
}

/** Natural width / height of a decoded overlay; 1 when it is not available. */
export function overlayAspect(
  image: Pick<HTMLImageElement, 'naturalWidth' | 'naturalHeight'>,
): number {
  return image.naturalWidth > 0 && image.naturalHeight > 0
    ? image.naturalWidth / image.naturalHeight
    : 1;
}

export type LoadedTryOnPiece = {
  piece: TryOnPiece;
  image: HTMLImageElement;
};

export type LoadTryOnOverlaysResult = {
  /** Usable overlays, in the order of the input pieces. */
  ready: LoadedTryOnPiece[];
  /** Pieces whose PNG is fully opaque and would cover the shopper. */
  opaque: number;
  /** Pieces whose PNG could not be fetched or decoded. */
  failed: number;
};

type OverlayOutcome =
  | {status: 'ready'; value: LoadedTryOnPiece}
  | {status: 'opaque'}
  | {status: 'failed'};

/**
 * Loads a whole look's overlays in parallel. A broken or opaque piece is left
 * out instead of blocking the rest of the look; the caller decides what to do
 * when nothing is usable.
 */
export async function loadTryOnOverlays(
  pieces: readonly TryOnPiece[],
): Promise<LoadTryOnOverlaysResult> {
  const outcomes = await Promise.all(
    pieces.map(async (piece): Promise<OverlayOutcome> => {
      try {
        const image = await loadOverlayImage(piece.overlayUrl);

        if (overlayTransparency(image) === 'opaque') {
          console.error(`Try-on overlay is opaque: ${piece.id}`);
          return {status: 'opaque'};
        }

        return {status: 'ready', value: {piece, image}};
      } catch (error) {
        console.error(`Try-on overlay could not load: ${piece.id}`, error);
        return {status: 'failed'};
      }
    }),
  );

  const ready: LoadedTryOnPiece[] = [];
  let opaque = 0;
  let failed = 0;

  for (const outcome of outcomes) {
    if (outcome.status === 'ready') ready.push(outcome.value);
    else if (outcome.status === 'opaque') opaque += 1;
    else failed += 1;
  }

  return {ready, opaque, failed};
}

/**
 * Samples the overlay to confirm it really is a transparent cut-out. A fully
 * opaque PNG would paint a rectangle over the shopper's face, so the dialog
 * refuses to start. Returns `unknown` when the canvas cannot be read (for
 * example when the CDN blocks CORS) instead of blocking the feature.
 */
export function overlayTransparency(
  image: CanvasImageSource,
): OverlayTransparency {
  const sample = 32;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = sample;
    canvas.height = sample;

    const context = canvas.getContext('2d', {willReadFrequently: true});
    if (!context) return 'unknown';

    context.drawImage(image, 0, 0, sample, sample);
    const {data} = context.getImageData(0, 0, sample, sample);

    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 240) return 'transparent';
    }

    return 'opaque';
  } catch {
    return 'unknown';
  }
}
