export type OverlayTransparency = 'transparent' | 'opaque' | 'unknown';

/**
 * Loads the overlay PNG with CORS so it can be drawn into a canvas without
 * tainting it. The URL already carries the `cors=1` cache key (see `url.ts`).
 */
export function loadOverlayImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`overlay-load: ${url}`));
    image.src = url;
  });
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
