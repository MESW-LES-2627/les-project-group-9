import {afterEach, describe, expect, it, vi} from 'vitest';
import {ratingHandle} from '~/lib/ratings/rating';
import {
  ADMIN_API_VERSION,
  createRatingStore,
  RATING_METAOBJECT_TYPE,
  RatingStoreError,
  readAdminConfig,
  type RatingStore,
} from '~/lib/ratings/rating-store.server';
import {ADMIN_ENV, CUSTOMER_A, CUSTOMER_B, fakeAdminApi, PRODUCT_A} from './support/ratings-fakes';

afterEach(() => {
  vi.restoreAllMocks();
});

const KEY = {customerId: CUSTOMER_A, orderId: 'gid://shopify/Order/1', productId: PRODUCT_A};

function storeFor(admin: ReturnType<typeof fakeAdminApi>): RatingStore {
  const store = createRatingStore(ADMIN_ENV, admin.fetch);
  if (!store) throw new Error('store should be configured');
  return store;
}

describe('readAdminConfig', () => {
  it('needs a token and a myshopify.com domain', () => {
    expect(readAdminConfig({})).toBeNull();
    expect(readAdminConfig({PUBLIC_STORE_DOMAIN: 'mock.shop', PRIVATE_ADMIN_API_TOKEN: 'x'})).toBeNull();
    expect(readAdminConfig({PUBLIC_STORE_DOMAIN: ADMIN_ENV.PUBLIC_STORE_DOMAIN})).toBeNull();
    expect(readAdminConfig({...ADMIN_ENV, PRIVATE_ADMIN_API_TOKEN: '  '})).toBeNull();
    expect(readAdminConfig({...ADMIN_ENV, PUBLIC_STORE_DOMAIN: 'evil.example.com'})).toBeNull();
    expect(readAdminConfig(ADMIN_ENV)?.endpoint).toBe(
      `https://jeweliette-test.myshopify.com/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    );
  });
});

describe('ShopifyRatingStore HTTP contract', () => {
  it('creates a private metaobject with only the needed fields', async () => {
    const admin = fakeAdminApi();
    const result = await storeFor(admin).createRating(KEY, 4);

    expect(result).toEqual({status: 'created', rating: {...KEY, rating: 4}});
    const [request] = admin.requests;
    expect(request.url).toBe(readAdminConfig(ADMIN_ENV)?.endpoint);
    expect(request.headers.get('X-Shopify-Access-Token')).toBe(ADMIN_ENV.PRIVATE_ADMIN_API_TOKEN);
    expect(request.headers.get('Content-Type')).toBe('application/json');
    expect(request.query).toContain('metaobjectCreate(');
    expect(JSON.stringify(request.variables)).not.toContain(ADMIN_ENV.PRIVATE_ADMIN_API_TOKEN);
    expect(request.variables).toEqual({
      metaobject: {
        type: RATING_METAOBJECT_TYPE,
        handle: await ratingHandle(KEY),
        fields: [
          {key: 'customer_id', value: CUSTOMER_A},
          {key: 'order_id', value: KEY.orderId},
          {key: 'product_id', value: PRODUCT_A},
          {key: 'rating', value: '4'},
        ],
      },
    });
  });

  it('calls fetch the way the Workers runtime requires', async () => {
    // Oxygen/MiniOxygen (workerd) throw when the global fetch runs with another
    // object as `this`; Node does not, so model the stricter rule here.
    const admin = fakeAdminApi();
    const workersFetch = function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
      if (this !== undefined && this !== globalThis) {
        throw new TypeError('Illegal invocation: function called with incorrect `this` reference');
      }
      return admin.fetch(input, init);
    } as typeof fetch;
    const store = createRatingStore(ADMIN_ENV, workersFetch);

    expect(await store?.findRatings([KEY])).toEqual([null]);
    expect(await store?.createRating(KEY, 3)).toEqual({status: 'created', rating: {...KEY, rating: 3}});
  });

  it('never upserts or updates', async () => {
    const admin = fakeAdminApi();
    const store = storeFor(admin);
    await store.createRating(KEY, 4);
    await store.createRating(KEY, 1);
    await store.findRatings([KEY]);
    for (const {query} of admin.requests) {
      expect(query).not.toMatch(/metaobjectUpsert|metaobjectUpdate/);
    }
  });

  // Shopify does not document what metaobjectCreate does with an explicit
  // handle that exists. The fake models two possibilities ('taken': rejected,
  // 'suffix': stored under another handle). These tests check the adapter's
  // handling of each; they do not show which one Shopify actually does.
  it.each(['taken', 'suffix'] as const)(
    'keeps the first rating when the handle exists (modelled %s behaviour)',
    async (mode) => {
      const admin = fakeAdminApi({mode});
      const store = storeFor(admin);
      await store.createRating(KEY, 4);

      const retry = await store.createRating(KEY, 1);

      expect(retry).toEqual({status: 'exists', rating: {...KEY, rating: 4}});
      expect(admin.ratings()).toEqual([
        expect.objectContaining({handle: await ratingHandle(KEY), rating: '4'}),
      ]);
    },
  );

  it.each(['taken', 'suffix'] as const)(
    'concurrent creates leave one immutable record (modelled %s behaviour)',
    async (mode) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const admin = fakeAdminApi({mode});
      const store = storeFor(admin);

      const results = await Promise.all([
        store.createRating(KEY, 5),
        store.createRating(KEY, 2),
        store.createRating(KEY, 3),
      ]);

      expect(results.map((result) => result.status).sort()).toEqual([
        'created',
        'exists',
        'exists',
      ]);
      const winner = results.find((result) => result.status === 'created')?.rating.rating;
      expect(results.every((result) => result.rating.rating === winner)).toBe(true);
      expect(admin.records.size).toBe(1);
    },
  );

  it('sends metaobjectCreate on a retry instead of reading first', async () => {
    const admin = fakeAdminApi();
    const store = storeFor(admin);
    await store.createRating(KEY, 4);
    await store.createRating(KEY, 2);
    const creates = admin.requests.filter(({query}) => query.includes('metaobjectCreate('));
    expect(creates).toHaveLength(2);
    expect(admin.requests[0].query).toContain('metaobjectCreate(');
  });

  it('cannot guarantee one record if Shopify renames the handle and the clean-up fails', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const admin = fakeAdminApi({mode: 'suffix'});
    const store = storeFor(admin);
    await store.createRating(KEY, 4);
    admin.fail('http', 'metaobjectDelete');

    const retry = await store.createRating(KEY, 1);

    // The customer still sees the first rating...
    expect(retry).toEqual({status: 'exists', rating: {...KEY, rating: 4}});
    expect(await store.findRatings([KEY])).toEqual([{...KEY, rating: 4}]);
    // ...but a second record now exists: compensation is not a guarantee.
    expect(admin.records.size).toBe(2);
    expect(errors).toHaveBeenCalledWith(
      expect.stringContaining('uniqueness violation'),
    );
  });

  it('reads ratings by exact handle, many keys in chunks', async () => {
    const admin = fakeAdminApi();
    const store = storeFor(admin);
    const keys = Array.from({length: 30}, (_, index) => ({
      ...KEY,
      productId: `gid://shopify/Product/${index + 1}`,
    }));
    await store.createRating(keys[0], 5);
    await store.createRating(keys[29], 2);
    admin.requests.length = 0;

    const found = await store.findRatings(keys);

    expect(found).toHaveLength(30);
    expect(found[0]?.rating).toBe(5);
    expect(found[29]?.rating).toBe(2);
    expect(found.filter(Boolean)).toHaveLength(2);
    expect(admin.requests).toHaveLength(2);
    expect(admin.requests[0].query).toContain('metaobjectByHandle');
  });

  it("does not return another customer's rating", async () => {
    const admin = fakeAdminApi();
    const store = storeFor(admin);
    await store.createRating({...KEY, customerId: CUSTOMER_B}, 5);

    expect(await store.findRatings([KEY])).toEqual([null]);
  });

  it('rejects a record whose fields do not match its key', async () => {
    const admin = fakeAdminApi();
    const store = storeFor(admin);
    await store.createRating(KEY, 5);
    const record = [...admin.records.values()][0];
    record.fields = record.fields.map((field) =>
      field.key === 'customer_id' ? {...field, value: CUSTOMER_B} : field,
    );

    await expect(store.findRatings([KEY])).rejects.toBeInstanceOf(RatingStoreError);
  });

  it.each(['http', 'graphql', 'network'] as const)(
    'reports a %s failure as an error, never as saved',
    async (kind) => {
      const admin = fakeAdminApi();
      admin.fail(kind);
      await expect(storeFor(admin).createRating(KEY, 5)).rejects.toBeInstanceOf(RatingStoreError);
      await expect(storeFor(admin).findRatings([KEY])).rejects.toBeInstanceOf(RatingStoreError);
      expect(admin.records.size).toBe(0);
    },
  );

  it('fails when a create is rejected and no rating exists', async () => {
    const admin = fakeAdminApi();
    const fetchImpl: typeof fetch = async (input, init) => {
      const body = String(init?.body);
      if (body.includes('metaobjectCreate')) {
        return new Response(
          JSON.stringify({
            data: {
              metaobjectCreate: {
                metaobject: null,
                userErrors: [{field: ['fields'], message: 'Invalid', code: 'INVALID'}],
              },
            },
          }),
        );
      }
      return admin.fetch(input, init);
    };
    const store = createRatingStore(ADMIN_ENV, fetchImpl);

    await expect(store?.createRating(KEY, 5)).rejects.toThrow('create_rejected');
  });

  it('rejects out-of-range values before calling Shopify', async () => {
    const admin = fakeAdminApi();
    await expect(storeFor(admin).createRating(KEY, 6)).rejects.toBeInstanceOf(RatingStoreError);
    expect(admin.requests).toHaveLength(0);
  });
});
