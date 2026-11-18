const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:/i;

/**
 * Adds the `cors=1` cache-buster to a try-on overlay URL.
 *
 * Overlay images are loaded into a canvas with `crossOrigin="anonymous"`. The
 * same file is usually already cached by the product page's `<img>` tag, and
 * `cdn.shopify.com` sends `Vary: Accept`, so the browser can reuse a non-CORS
 * response that taints the canvas. A unique query key makes it fetch a fresh,
 * CORS-approved response without changing the image.
 */
export function withCorsParam(url: string): string {
  const absolute = ABSOLUTE_URL.test(url);

  try {
    const parsed = new URL(url, 'https://try-on.local');
    parsed.searchParams.set('cors', '1');

    return absolute
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

/**
 * Absolute link a desktop shopper opens on their phone (via the QR code) to
 * start the try-on for a product, optionally preselecting a variant through its
 * option params.
 */
export function tryOnPageUrl(
  requestUrl: string,
  handle: string,
  options: ReadonlyArray<{name: string; value: string}> = [],
): string {
  const url = new URL(`/products/${encodeURIComponent(handle)}`, requestUrl);

  for (const option of options) {
    url.searchParams.set(option.name, option.value);
  }

  url.searchParams.set('tryOn', '1');
  return url.toString();
}

/**
 * The current product page (including the selected variant's option params)
 * with `tryOn=1`, so a desktop QR opens the same colourway on the phone.
 */
export function currentTryOnLink(pageUrl: string): string {
  const url = new URL(pageUrl);
  url.searchParams.set('tryOn', '1');
  return url.toString();
}

/**
 * Keeps the QR/deep link on HTTPS when the page is served over HTTPS but the
 * server built it from an internal `http://` request URL (dev tunnels and
 * proxies terminate TLS and forward plain HTTP, which HSTS then has to fix).
 */
export function secureTryOnLink(
  link: string,
  pageProtocol?: string,
): string {
  const current =
    pageProtocol ??
    (typeof window === 'undefined' ? null : window.location.protocol);

  if (current !== 'https:' || !link.startsWith('http://')) return link;

  return `https://${link.slice('http://'.length)}`;
}
