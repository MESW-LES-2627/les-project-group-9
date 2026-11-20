/**
 * Cross-site request protection for state-changing JSON endpoints that rely on
 * the session cookie (US-058 rating writes). No proxy headers are trusted and
 * no CORS is granted.
 *
 * - When the browser sends `Sec-Fetch-Site` (a header pages cannot set), it must
 *   be `same-origin`; `same-site`, `cross-site` and `none` are rejected. If an
 *   `Origin` header is also present, its host must be the host the worker sees.
 *   A browser reporting `same-origin` always sends its own origin, so a foreign
 *   `Origin` means contradictory (forged) headers. The scheme is not compared:
 *   behind a proxy or tunnel that terminates TLS the worker sees `http://` while
 *   the page is `https://`, and a real scheme difference is a different origin,
 *   which the browser would not report as `same-origin`.
 * - Otherwise (older browsers) the `Origin` header must equal the request's
 *   own origin exactly.
 * - A request with neither header is rejected; only non-browser clients send
 *   neither.
 */
export function isSameOriginRequest(request: Request): boolean {
  const url = new URL(request.url);
  const site = request.headers.get('Sec-Fetch-Site');
  const origin = request.headers.get('Origin');

  if (site !== null) {
    if (site !== 'same-origin') return false;
    return origin === null || hostOf(origin) === url.host;
  }
  return origin !== null && origin === url.origin;
}

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    // e.g. the literal "null" origin of sandboxed or opaque contexts.
    return null;
  }
}
