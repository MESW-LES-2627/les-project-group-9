import {describe, expect, it} from 'vitest';
import {
  AdminTokenError,
  createAccessTokenProvider,
  type AccessTokenCache,
} from '~/lib/ratings/admin-token.server';
import {createRatingStore, readAdminConfig} from '~/lib/ratings/rating-store.server';
import {CLIENT_ENV, CUSTOMER_A, fakeAdminApi, PRODUCT_A} from './support/ratings-fakes';

const DOMAIN = CLIENT_ENV.PUBLIC_STORE_DOMAIN;
const CREDENTIALS = {
  kind: 'client_credentials' as const,
  clientId: CLIENT_ENV.PRIVATE_ADMIN_API_CLIENT_ID,
  clientSecret: CLIENT_ENV.PRIVATE_ADMIN_API_CLIENT_SECRET,
};
const KEY = {customerId: CUSTOMER_A, orderId: 'gid://shopify/Order/1', productId: PRODUCT_A};

describe('Admin API credentials', () => {
  it('uses the client ID and secret when no static token is set', () => {
    expect(readAdminConfig(CLIENT_ENV)?.credentials).toEqual(CREDENTIALS);
    expect(
      readAdminConfig({...CLIENT_ENV, PRIVATE_ADMIN_API_TOKEN: 'shpat_x'})?.credentials,
    ).toEqual({kind: 'static', token: 'shpat_x'});
    expect(readAdminConfig({...CLIENT_ENV, PRIVATE_ADMIN_API_CLIENT_SECRET: ''})).toBeNull();
  });

  it('exchanges the client credentials with a form POST and caches the token', async () => {
    const admin = fakeAdminApi();
    let time = 0;
    const provider = createAccessTokenProvider({
      domain: DOMAIN,
      credentials: CREDENTIALS,
      fetchImpl: admin.fetch,
      cache: new Map(),
      now: () => time,
    });

    const [first, concurrent] = await Promise.all([provider.get(), provider.get()]);
    time = 86_399_000 - 61_000;
    const cached = await provider.get();

    expect(first).toBe('exchanged-1');
    expect(concurrent).toBe('exchanged-1');
    expect(cached).toBe('exchanged-1');
    expect(admin.tokenExchanges).toHaveLength(1);
    expect(Object.fromEntries(admin.tokenExchanges[0])).toEqual({
      grant_type: 'client_credentials',
      client_id: CREDENTIALS.clientId,
      client_secret: CREDENTIALS.clientSecret,
    });
  });

  it('renews the token shortly before it expires', async () => {
    const admin = fakeAdminApi();
    let time = 0;
    const provider = createAccessTokenProvider({
      domain: DOMAIN,
      credentials: CREDENTIALS,
      fetchImpl: admin.fetch,
      cache: new Map(),
      now: () => time,
    });
    await provider.get();
    time = 86_399_000 - 30_000;
    expect(await provider.get()).toBe('exchanged-2');
  });

  it('exchanges the token with a Workers-compatible fetch call', async () => {
    const admin = fakeAdminApi();
    const workersFetch = function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
      if (this !== undefined && this !== globalThis) {
        throw new TypeError('Illegal invocation: function called with incorrect `this` reference');
      }
      return admin.fetch(input, init);
    } as typeof fetch;
    const store = createRatingStore(CLIENT_ENV, workersFetch, new Map());

    expect(await store?.findRatings([KEY])).toEqual([null]);
    expect(admin.tokenExchanges).toHaveLength(1);
  });

  it('fails closed and retries later when the exchange is rejected', async () => {
    const admin = fakeAdminApi();
    const cache: AccessTokenCache = new Map();
    const bad = createAccessTokenProvider({
      domain: DOMAIN,
      credentials: {...CREDENTIALS, clientSecret: 'wrong'},
      fetchImpl: admin.fetch,
      cache,
    });
    await expect(bad.get()).rejects.toBeInstanceOf(AdminTokenError);
    expect(cache.size).toBe(0);
  });

  it('saves ratings with an exchanged token and re-exchanges after a 401', async () => {
    const admin = fakeAdminApi();
    const store = createRatingStore(CLIENT_ENV, admin.fetch, new Map());

    await store?.createRating(KEY, 4);
    expect(admin.requests[0].headers.get('X-Shopify-Access-Token')).toBe('exchanged-1');

    admin.revokeTokens();
    await expect(store?.findRatings([KEY])).rejects.toThrow('http_401');
    expect(await store?.findRatings([KEY])).toEqual([{...KEY, rating: 4}]);
    expect(admin.tokenExchanges).toHaveLength(2);
  });

  it('reports a failed exchange as a store error without calling GraphQL', async () => {
    const admin = fakeAdminApi();
    const store = createRatingStore(
      {...CLIENT_ENV, PRIVATE_ADMIN_API_CLIENT_SECRET: 'wrong'},
      admin.fetch,
      new Map(),
    );
    await expect(store?.createRating(KEY, 4)).rejects.toThrow('token_http_401');
    expect(admin.requests).toHaveLength(0);
  });
});
