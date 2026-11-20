import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createWithCache, InMemoryCache} from '@shopify/hydrogen';
import {createAdminClient, productFieldQuery} from '~/lib/ratings/admin-client.server';
import {createCommentStore} from '~/lib/ratings/comment-store.server';
import {
  COMMENTS_PER_PRODUCT,
  loadProductReviews,
} from '~/lib/ratings/product-reviews.server';
import {commentHandle} from '~/lib/ratings/rating';
import {
  createRatingStore,
  listProductRatingValues,
  MAX_RATING_PAGES,
} from '~/lib/ratings/rating-store.server';
import {filledStars, summarizeRatings} from '~/lib/ratings/reviews';
import {formatNumber} from '~/lib/i18n';
import {
  ADMIN_ENV,
  CUSTOMER_A,
  CUSTOMER_B,
  fakeAdminApi,
  PRODUCT_A,
  PRODUCT_B,
  workersStrictFetch,
} from './support/ratings-fakes';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('summarizeRatings', () => {
  it('has no average and a zero count without ratings', () => {
    expect(summarizeRatings([])).toEqual({average: null, count: 0});
  });

  it('averages every rating to one decimal', () => {
    expect(summarizeRatings([5])).toEqual({average: 5, count: 1});
    expect(summarizeRatings([5, 4, 4])).toEqual({average: 4.3, count: 3});
    expect(summarizeRatings([1, 2])).toEqual({average: 1.5, count: 2});
    expect(summarizeRatings([5, 5, 4])).toEqual({average: 4.7, count: 3});
  });

  it('ignores values outside 1–5', () => {
    expect(summarizeRatings([5, 0, 6, 2.5, Number.NaN])).toEqual({average: 5, count: 1});
  });

  it('fills the nearest whole number of stars', () => {
    expect([1, 4.3, 4.5, 4.7, 5].map(filledStars)).toEqual([1, 4, 5, 5, 5]);
  });

  it('formats the average per language', () => {
    expect(formatNumber(4.3, 'en-US')).toBe('4.3');
    expect(formatNumber(4.3, 'pt-PT')).toBe('4,3');
    expect(formatNumber(4, 'fr-FR')).toBe('4,0');
  });
});

type Admin = ReturnType<typeof fakeAdminApi>;

async function seed(
  admin: Admin,
  entries: Array<{customer: string; order: string; product?: string; rating: number; comment?: string; publish?: boolean}>,
) {
  const fetchImpl = workersStrictFetch(admin.fetch);
  const ratings = createRatingStore(ADMIN_ENV, fetchImpl);
  const comments = createCommentStore(ADMIN_ENV, fetchImpl);
  for (const entry of entries) {
    const key = {
      customerId: entry.customer,
      orderId: `gid://shopify/Order/${entry.order}`,
      productId: entry.product ?? PRODUCT_A,
    };
    await ratings?.createRating(key, entry.rating);
    if (entry.comment) {
      await comments?.saveComment(key, entry.rating, entry.comment);
      if (entry.publish) admin.publish(await commentHandle(key));
    }
  }
  admin.requests.length = 0;
}

function clientFor(admin: Admin) {
  const client = createAdminClient(ADMIN_ENV, workersStrictFetch(admin.fetch));
  if (!client) throw new Error('client should be configured');
  return client;
}

describe('listProductRatingValues', () => {
  it('reads every rating of the product, filtered by product and paginated', async () => {
    const admin = fakeAdminApi({listPageSize: 2});
    await seed(admin, [
      {customer: CUSTOMER_A, order: '1', rating: 5},
      {customer: CUSTOMER_A, order: '2', rating: 4},
      {customer: CUSTOMER_B, order: '3', rating: 2},
      {customer: CUSTOMER_B, order: '4', product: PRODUCT_B, rating: 1},
    ]);

    const values = await listProductRatingValues(clientFor(admin), PRODUCT_A);

    expect(values.sort()).toEqual([2, 4, 5]);
    expect(admin.requests).toHaveLength(2);
    expect(admin.requests[0].variables).toMatchObject({
      type: 'product_rating',
      query: `fields.product_id:"${PRODUCT_A}"`,
    });
  });

  it('never selects customer or order IDs', async () => {
    const admin = fakeAdminApi();
    await listProductRatingValues(clientFor(admin), PRODUCT_A);
    expect(admin.requests[0].query).not.toMatch(/customer_id|order_id|fields\s*\{/);
  });

  it('fails closed when there are more pages than the limit', async () => {
    const admin = fakeAdminApi({listPageSize: 1});
    await seed(
      admin,
      Array.from({length: MAX_RATING_PAGES + 1}, (_, index) => ({
        customer: CUSTOMER_A,
        order: String(index + 1),
        rating: 5,
      })),
    );
    await expect(listProductRatingValues(clientFor(admin), PRODUCT_A)).rejects.toThrow(
      'too_many_ratings',
    );
  });

  it('accepts exactly the page limit', async () => {
    const admin = fakeAdminApi({listPageSize: 1});
    await seed(
      admin,
      Array.from({length: MAX_RATING_PAGES}, (_, index) => ({
        customer: CUSTOMER_A,
        order: String(index + 1),
        rating: 4,
      })),
    );
    expect(await listProductRatingValues(clientFor(admin), PRODUCT_A)).toHaveLength(
      MAX_RATING_PAGES,
    );
  });

  it('rejects a product ID that is not a product GID before querying', () => {
    expect(() => productFieldQuery('gid://shopify/Product/1" OR type:x')).toThrow('invalid_product');
  });
});

describe('published comments', () => {
  it('lists only published comments of the product, newest first, without IDs', async () => {
    const admin = fakeAdminApi({listPageSize: 2});
    await seed(admin, [
      {customer: CUSTOMER_A, order: '1', rating: 5, comment: 'Oldest published', publish: true},
      {customer: CUSTOMER_A, order: '2', rating: 4, comment: 'Still in review'},
      {customer: CUSTOMER_B, order: '3', rating: 3, comment: 'Newest published', publish: true},
      {customer: CUSTOMER_B, order: '4', product: PRODUCT_B, rating: 1, comment: 'Other piece', publish: true},
    ]);
    const store = createCommentStore(ADMIN_ENV, workersStrictFetch(admin.fetch));

    const comments = await store?.listPublished(PRODUCT_A, 10);

    expect(comments).toEqual([
      {rating: 3, text: 'Newest published', date: expect.any(String)},
      {rating: 5, text: 'Oldest published', date: expect.any(String)},
    ]);
    expect(JSON.stringify(comments)).not.toMatch(/Customer|Order/);
  });

  it('stops at the requested number of comments', async () => {
    const admin = fakeAdminApi({listPageSize: 2});
    await seed(
      admin,
      Array.from({length: 5}, (_, index) => ({
        customer: CUSTOMER_A,
        order: String(index + 1),
        rating: 4,
        comment: `Comment ${index + 1}`,
        publish: true,
      })),
    );
    const store = createCommentStore(ADMIN_ENV, workersStrictFetch(admin.fetch));

    expect(await store?.listPublished(PRODUCT_A, 3)).toHaveLength(3);
    expect(admin.requests).toHaveLength(2);
  });

  it('hides a published comment again once its author edits it', async () => {
    const admin = fakeAdminApi();
    await seed(admin, [{customer: CUSTOMER_A, order: '1', rating: 5, comment: 'First', publish: true}]);
    const store = createCommentStore(ADMIN_ENV, workersStrictFetch(admin.fetch));
    await store?.saveComment(
      {customerId: CUSTOMER_A, orderId: 'gid://shopify/Order/1', productId: PRODUCT_A},
      5,
      'Edited',
    );

    expect(await store?.listPublished(PRODUCT_A, 10)).toEqual([]);
  });
});

describe('loadProductReviews', () => {
  const load = (admin: Admin, options: Partial<Parameters<typeof loadProductReviews>[0]> = {}) =>
    loadProductReviews({
      env: ADMIN_ENV,
      productId: PRODUCT_A,
      fetchImpl: workersStrictFetch(admin.fetch),
      ...options,
    });

  it('gives the average and count of all ratings and the published comments', async () => {
    const admin = fakeAdminApi();
    await seed(admin, [
      {customer: CUSTOMER_A, order: '1', rating: 5, comment: 'Gorgeous', publish: true},
      {customer: CUSTOMER_A, order: '2', rating: 4, comment: 'Waiting for review'},
      {customer: CUSTOMER_B, order: '3', rating: 4},
    ]);

    expect(await load(admin)).toEqual({
      status: 'ready',
      summary: {average: 4.3, count: 3},
      comments: [{rating: 5, text: 'Gorgeous', date: expect.any(String)}],
    });
  });

  it('is ready with no ratings for a product nobody has rated', async () => {
    expect(await load(fakeAdminApi())).toEqual({
      status: 'ready',
      summary: {average: null, count: 0},
      comments: [],
    });
  });

  it('is unavailable without Admin configuration', async () => {
    const admin = fakeAdminApi();
    expect(await load(admin, {env: {PUBLIC_STORE_DOMAIN: 'mock.shop'}})).toEqual({
      status: 'unavailable',
    });
    expect(admin.requests).toHaveLength(0);
  });

  it.each(['http', 'graphql', 'network'] as const)(
    'reports a %s failure as an error instead of throwing',
    async (kind) => {
      const admin = fakeAdminApi();
      admin.fail(kind);
      expect(await load(admin)).toEqual({status: 'error'});
    },
  );

  it(`shows at most ${COMMENTS_PER_PRODUCT} comments`, async () => {
    const admin = fakeAdminApi();
    await seed(
      admin,
      Array.from({length: COMMENTS_PER_PRODUCT + 2}, (_, index) => ({
        customer: CUSTOMER_A,
        order: String(index + 1),
        rating: 5,
        comment: `Comment ${index + 1}`,
        publish: true,
      })),
    );
    const view = await load(admin);
    expect(view.status === 'ready' && view.comments).toHaveLength(COMMENTS_PER_PRODUCT);
    expect(view.status === 'ready' && view.summary.count).toBe(COMMENTS_PER_PRODUCT + 2);
  });

  describe('with the worker cache', () => {
    function cacheFor() {
      const pending: Array<Promise<unknown>> = [];
      const withCache = createWithCache({
        cache: new InMemoryCache(),
        waitUntil: (promise) => {
          pending.push(promise);
        },
        request: new Request('https://shop.example/products/x'),
      });
      return {withCache, settle: () => Promise.all(pending)};
    }

    it('serves repeated views from the cache', async () => {
      const admin = fakeAdminApi();
      await seed(admin, [{customer: CUSTOMER_A, order: '1', rating: 5}]);
      const {withCache, settle} = cacheFor();

      const first = await load(admin, {withCache});
      await settle();
      const calls = admin.requests.length;
      const second = await load(admin, {withCache});

      expect(second).toEqual(first);
      expect(admin.requests.length).toBe(calls);
    });

    it('does not cache an error', async () => {
      const admin = fakeAdminApi();
      const {withCache, settle} = cacheFor();
      admin.fail('http');
      expect(await load(admin, {withCache})).toEqual({status: 'error'});
      await settle();

      admin.fail(null);
      expect(await load(admin, {withCache})).toMatchObject({status: 'ready'});
    });
  });
});
