/**
 * Admin API access tokens for the US-058 rating store, from either:
 *
 * - a static token of a legacy custom app (created in the Shopify admin before
 *   2026-01-01), or
 * - a Dev Dashboard app's client ID and secret, exchanged with the client
 *   credentials grant for a token that lasts 24 hours. It only works when the
 *   app and the store belong to the same Shopify organization.
 *   https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant
 *
 * Tokens stay on the server. Exchanged tokens are cached per worker instance and
 * renewed a minute before they expire.
 */

export type AdminCredentials =
  | {kind: 'static'; token: string}
  | {kind: 'client_credentials'; clientId: string; clientSecret: string};

type CachedToken = {token: string; expiresAt: number};

/** Exchanged tokens, keyed by shop and client ID. */
export type AccessTokenCache = Map<string, Promise<CachedToken>>;

const sharedCache: AccessTokenCache = new Map();
const RENEW_BEFORE_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

/** A token could not be obtained; callers must fail closed. */
export class AdminTokenError extends Error {
  constructor(readonly code: string) {
    super(`Admin token error: ${code}`);
    this.name = 'AdminTokenError';
  }
}

export type AccessTokenProvider = {
  get(): Promise<string>;
  /** Forget a token Shopify rejected, so the next call exchanges a new one. */
  invalidate(): void;
};

export function createAccessTokenProvider({
  domain,
  credentials,
  fetchImpl,
  cache = sharedCache,
  now = Date.now,
}: {
  domain: string;
  credentials: AdminCredentials;
  fetchImpl: typeof fetch;
  cache?: AccessTokenCache;
  now?: () => number;
}): AccessTokenProvider {
  if (credentials.kind === 'static') {
    return {get: async () => credentials.token, invalidate: () => {}};
  }

  const key = `${domain}|${credentials.clientId}`;
  return {
    async get() {
      const cached = cache.get(key);
      if (cached) {
        try {
          const entry = await cached;
          if (entry.expiresAt - RENEW_BEFORE_MS > now()) return entry.token;
        } catch {
          // A failed exchange is not cached; fall through and retry.
        }
        if (cache.get(key) === cached) cache.delete(key);
      }
      // Share one exchange between concurrent requests.
      const pending = exchange(domain, credentials, fetchImpl, now);
      cache.set(key, pending);
      try {
        return (await pending).token;
      } catch (error) {
        if (cache.get(key) === pending) cache.delete(key);
        throw error;
      }
    },
    invalidate() {
      cache.delete(key);
    },
  };
}

async function exchange(
  domain: string,
  credentials: Extract<AdminCredentials, {kind: 'client_credentials'}>,
  fetchImpl: typeof fetch,
  now: () => number,
): Promise<CachedToken> {
  let response: Response;
  try {
    response = await fetchImpl(`https://${domain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new AdminTokenError('network');
  }
  if (!response.ok) throw new AdminTokenError(`http_${response.status}`);

  const body = (await response.json().catch(() => null)) as {
    access_token?: unknown;
    expires_in?: unknown;
  } | null;
  const token = body?.access_token;
  const expiresIn = body?.expires_in;
  if (typeof token !== 'string' || !token || typeof expiresIn !== 'number') {
    throw new AdminTokenError('invalid_response');
  }
  return {token, expiresAt: now() + expiresIn * 1000};
}
