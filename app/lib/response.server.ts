import type {HydrogenSession} from '@shopify/hydrogen';
import {LOCALE_VARY_HEADERS} from '~/lib/i18n';

/**
 * Adds header names to `Vary` without duplicating existing ones
 * (case-insensitive). `Vary: *` already varies on everything and is left as is.
 */
export function appendVary(headers: Headers, names: readonly string[]): void {
  const current = (headers.get('Vary') ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  if (current.includes('*')) return;

  const present = new Set(current.map((name) => name.toLowerCase()));
  const missing = names.filter((name) => !present.has(name.toLowerCase()));
  if (!missing.length) return;

  headers.set('Vary', [...current, ...missing].join(', '));
}

/**
 * Last step for every app response in `server.ts`:
 * - appends the session cookie when the session changed. It appends rather than
 *   sets, because routes may already send cookies (e.g. the language cookie
 *   from `/locale`), and `set` would drop them;
 * - adds `Vary: Cookie, Accept-Language`, because the resolved language (and so
 *   the HTML and data) depends on both request headers.
 */
export async function finalizeResponse(
  response: Response,
  session: Pick<HydrogenSession, 'commit'> & {isPending: boolean},
): Promise<Response> {
  if (session.isPending) {
    response.headers.append('Set-Cookie', await session.commit());
  }

  appendVary(response.headers, LOCALE_VARY_HEADERS);
  return response;
}
