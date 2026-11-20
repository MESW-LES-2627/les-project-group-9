/**
 * Cross-site request protection for state-changing JSON endpoints that rely on
 * the session cookie (US-058 rating writes).
 *
 * Accepts the request only when the browser says it comes from this site:
 * an `Origin` header equal to the request's own origin or, if `Origin` is
 * absent, `Sec-Fetch-Site: same-origin`. A request with neither header is
 * rejected: browsers send `Origin` on every `fetch` POST, so only non-browser
 * clients are affected.
 */
export function isSameOriginRequest(request: Request): boolean {
  const expected = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (origin !== null) return origin === expected;
  return request.headers.get('Sec-Fetch-Site') === 'same-origin';
}
