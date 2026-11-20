/**
 * Cross-site request protection for state-changing JSON endpoints that rely on
 * the session cookie (US-058 rating writes).
 *
 * - When the browser sends `Sec-Fetch-Site` (a header pages cannot set), only
 *   `same-origin` is accepted; `same-site`, `cross-site` and `none` are not.
 *   This does not depend on the URL the worker sees, which is `http://` behind
 *   a proxy or tunnel that terminates TLS while the page's origin is `https://`.
 * - Otherwise (older browsers) the `Origin` header must equal the request's
 *   own origin.
 * - A request with neither header is rejected; only non-browser clients send
 *   neither.
 */
export function isSameOriginRequest(request: Request): boolean {
  const site = request.headers.get('Sec-Fetch-Site');
  if (site !== null) return site === 'same-origin';

  const origin = request.headers.get('Origin');
  return origin !== null && origin === new URL(request.url).origin;
}
