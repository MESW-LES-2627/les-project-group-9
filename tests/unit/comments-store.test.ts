import {afterEach, describe, expect, it, vi} from 'vitest';
import {commentHandle} from '~/lib/ratings/rating';
import {
  COMMENT_METAOBJECT_TYPE,
  createCommentStore,
  type CommentStore,
} from '~/lib/ratings/comment-store.server';
import {RatingStoreError} from '~/lib/ratings/rating-store.server';
import {
  ADMIN_ENV,
  CUSTOMER_A,
  CUSTOMER_B,
  fakeAdminApi,
  PRODUCT_A,
  workersStrictFetch,
} from './support/ratings-fakes';

afterEach(() => {
  vi.restoreAllMocks();
});

const KEY = {customerId: CUSTOMER_A, orderId: 'gid://shopify/Order/1', productId: PRODUCT_A};

function storeFor(admin: ReturnType<typeof fakeAdminApi>): CommentStore {
  const store = createCommentStore(ADMIN_ENV, workersStrictFetch(admin.fetch));
  if (!store) throw new Error('store should be configured');
  return store;
}

describe('ShopifyCommentStore HTTP contract', () => {
  it('is unavailable without Admin configuration', () => {
    expect(createCommentStore({PUBLIC_STORE_DOMAIN: 'mock.shop'})).toBeNull();
  });

  it('upserts a draft under the rating’s comment handle with only the needed fields', async () => {
    const admin = fakeAdminApi();

    const saved = await storeFor(admin).saveComment(KEY, 4, 'Lovely');

    expect(saved).toEqual({text: 'Lovely', status: 'in_review'});
    const [request] = admin.requests;
    expect(request.query).toContain('metaobjectUpsert(');
    expect(request.query).not.toMatch(/metaobjectCreate|metaobjectUpdate|metaobjectDelete/);
    expect(request.variables).toEqual({
      handle: {type: COMMENT_METAOBJECT_TYPE, handle: await commentHandle(KEY)},
      metaobject: {
        fields: [
          {key: 'customer_id', value: CUSTOMER_A},
          {key: 'order_id', value: KEY.orderId},
          {key: 'product_id', value: PRODUCT_A},
          {key: 'rating', value: '4'},
          {key: 'comment', value: 'Lovely'},
        ],
        capabilities: {publishable: {status: 'DRAFT'}},
      },
    });
  });

  it('keeps one record per rating and sends an edit of a published comment back to review', async () => {
    const admin = fakeAdminApi();
    const store = storeFor(admin);
    await store.saveComment(KEY, 4, 'First version');
    admin.publish(await commentHandle(KEY));
    expect(await store.findComments([KEY])).toEqual([{text: 'First version', status: 'published'}]);

    const edited = await store.saveComment(KEY, 4, 'Second version');

    expect(edited).toEqual({text: 'Second version', status: 'in_review'});
    expect(admin.comments()).toEqual([
      expect.objectContaining({comment: 'Second version', status: 'DRAFT'}),
    ]);
  });

  it('reads comments by exact handle and returns null when there is none', async () => {
    const admin = fakeAdminApi();
    const store = storeFor(admin);
    const other = {...KEY, productId: 'gid://shopify/Product/99'};
    await store.saveComment(other, 2, 'Too small');
    admin.requests.length = 0;

    expect(await store.findComments([KEY, other])).toEqual([
      null,
      {text: 'Too small', status: 'in_review'},
    ]);
    expect(admin.requests).toHaveLength(1);
    expect(admin.requests[0].query).toContain('metaobjectByHandle');
  });

  it("does not return another customer's comment", async () => {
    const admin = fakeAdminApi();
    const store = storeFor(admin);
    await store.saveComment({...KEY, customerId: CUSTOMER_B}, 5, 'Mine');

    expect(await store.findComments([KEY])).toEqual([null]);
  });

  it('rejects a record whose fields do not match its key', async () => {
    const admin = fakeAdminApi();
    const store = storeFor(admin);
    await store.saveComment(KEY, 5, 'Nice');
    const record = admin.records.get(await commentHandle(KEY));
    if (!record) throw new Error('comment should exist');
    record.fields = record.fields.map((field) =>
      field.key === 'customer_id' ? {...field, value: CUSTOMER_B} : field,
    );

    await expect(store.findComments([KEY])).rejects.toBeInstanceOf(RatingStoreError);
  });

  it.each([
    ['empty', 4, ''],
    ['too long', 4, 'a'.repeat(1001)],
    ['an invalid rating', 6, 'Fine'],
  ])('rejects %s input before calling Shopify', async (_name, rating, text) => {
    const admin = fakeAdminApi();
    await expect(storeFor(admin).saveComment(KEY, rating, text)).rejects.toBeInstanceOf(
      RatingStoreError,
    );
    expect(admin.requests).toHaveLength(0);
  });

  it.each(['http', 'graphql', 'network'] as const)(
    'reports a %s failure as an error, never as saved',
    async (kind) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const admin = fakeAdminApi();
      admin.fail(kind);
      await expect(storeFor(admin).saveComment(KEY, 5, 'Hi')).rejects.toBeInstanceOf(
        RatingStoreError,
      );
      await expect(storeFor(admin).findComments([KEY])).rejects.toBeInstanceOf(RatingStoreError);
      expect(admin.comments()).toHaveLength(0);
    },
  );

  it('fails when Shopify rejects the upsert, logging codes but not the text', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const admin = fakeAdminApi();
    const fetchImpl: typeof fetch = async (input, init) => {
      if (String(init?.body).includes('metaobjectUpsert')) {
        return Response.json({
          data: {
            metaobjectUpsert: {
              metaobject: null,
              userErrors: [
                {field: ['fields', '4', 'value'], message: 'Secret text is too long', code: 'INVALID'},
              ],
            },
          },
        });
      }
      return admin.fetch(input, init);
    };
    const store = createCommentStore(ADMIN_ENV, fetchImpl);

    await expect(store?.saveComment(KEY, 5, 'Secret text')).rejects.toThrow('save_rejected');
    const logged = errors.mock.calls.map((call) => call.join(' ')).join(' | ');
    expect(logged).toContain('[ratings] metaobjectUpsert userErrors: INVALID@fields.4.value');
    expect(logged).not.toContain('Secret text');
    expect(logged).not.toContain(CUSTOMER_A);
  });

  it('refuses a save that Shopify reports as already published', async () => {
    const admin = fakeAdminApi();
    const fetchImpl: typeof fetch = async (input, init) => {
      const response = await admin.fetch(input, init);
      if (!String(init?.body).includes('metaobjectUpsert')) return response;
      const body = (await response.json()) as {
        data: {metaobjectUpsert: {metaobject: {capabilities: unknown}}};
      };
      body.data.metaobjectUpsert.metaobject.capabilities = {publishable: {status: 'ACTIVE'}};
      return Response.json(body);
    };
    const store = createCommentStore(ADMIN_ENV, fetchImpl);

    await expect(store?.saveComment(KEY, 5, 'Hi')).rejects.toThrow('save_mismatch');
  });
});
