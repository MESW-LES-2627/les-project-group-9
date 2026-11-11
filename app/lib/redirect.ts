import {redirect} from 'react-router';

/**
 * Turns user-supplied redirect input into a same-origin path (path, query and
 * hash), or `fallback` when the input is missing, absolute, protocol-relative
 * or otherwise points to another origin. Prevents open redirects.
 */
export function toSafeRedirectPath(
  input: unknown,
  requestUrl: string,
  fallback = '/',
): string {
  if (typeof input !== 'string') return fallback;

  const value = input.trim();
  // Only root-relative paths; reject `//host`, `/\host` and control characters.
  const hasControlCharacter = Array.from(value).some(
    (char) => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f,
  );
  if (!value.startsWith('/') || /^\/[/\\]/.test(value) || hasControlCharacter) {
    return fallback;
  }

  const origin = new URL(requestUrl).origin;
  let target: URL;
  try {
    target = new URL(value, origin);
  } catch {
    return fallback;
  }

  if (target.origin !== origin) return fallback;
  return `${target.pathname}${target.search}${target.hash}`;
}

export function redirectIfHandleIsLocalized(
  request: Request,
  ...localizedResources: Array<{
    handle: string;
    data: {handle: string} & unknown;
  }>
) {
  const url = new URL(request.url);
  let shouldRedirect = false;

  localizedResources.forEach(({handle, data}) => {
    if (handle !== data.handle) {
      url.pathname = url.pathname.replace(handle, data.handle);
      shouldRedirect = true;
    }
  });

  if (shouldRedirect) {
    throw redirect(url.toString());
  }
}
