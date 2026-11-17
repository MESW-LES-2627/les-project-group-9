const MOBILE_USER_AGENT =
  /android|iphone|ipod|ipad|iemobile|opera mini|mobile|windows phone/i;

/** Coarse phone/tablet detection from a `User-Agent` string. */
export function isMobileUserAgent(
  userAgent: string | null | undefined,
): boolean {
  if (!userAgent) return false;

  return MOBILE_USER_AGENT.test(userAgent);
}

/**
 * Phone/tablet detection for a request.
 *
 * `Sec-CH-UA-Mobile` is checked first: it survives the reduced Chromium
 * user-agent strings. Otherwise the `User-Agent` is used. iPadOS 13+ reports a
 * macOS user-agent, so it lands on the desktop path here; the client refines
 * that with `maxTouchPoints` when the dialog opens.
 */
export function isMobileRequest(request: Pick<Request, 'headers'>): boolean {
  const clientHint = request.headers.get('sec-ch-ua-mobile');
  if (clientHint === '?1') return true;

  return isMobileUserAgent(request.headers.get('user-agent'));
}
