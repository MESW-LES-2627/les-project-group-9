import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {action as commentAction, loader as commentLoader} from '~/routes/api.rating-comments';
import {action as ratingAction} from '~/routes/api.order-ratings';
import {loader as orderLoader} from '~/routes/account.orders.$id';
import {commentHandle} from '~/lib/ratings/rating';
import type {OrderRatingsView} from '~/lib/ratings/ratings.server';
import {
  CUSTOMER_A,
  CUSTOMER_B,
  deliveredOrder,
  fakeAdminApi,
  PRODUCT_A,
  PRODUCT_B,
} from './support/ratings-fakes';
import {
  callAction,
  contextFor,
  jsonRequest,
  ORIGIN,
  type JsonRequestInit,
  type RouteContext,
} from './support/ratings-route';

const ORDER_1 = 'gid://shopify/Order/101';
const ORDER_2 = 'gid://shopify/Order/102';

let admin: ReturnType<typeof fakeAdminApi>;

beforeEach(() => {
  admin = fakeAdminApi();
  vi.stubGlobal('fetch', admin.fetch);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const comment = (orderId: string, productId: string, text: unknown) => ({
  orderId,
  productId,
  comment: text,
});

function postComment(context: RouteContext, body: unknown, init?: JsonRequestInit) {
  return callAction(commentAction, jsonRequest(`${ORIGIN}/api/rating-comments`, body, init), context);
}

async function rate(context: RouteContext, orderId: string, productId: string, rating: number) {
  const response = await callAction(
    ratingAction,
    jsonRequest(`${ORIGIN}/api/order-ratings`, {orderId, productId, rating}),
    context,
  );
  expect(response.status).toBe(201);
}

/** A delivered order of CUSTOMER_A with PRODUCT_A already rated 4 stars. */
async function ratedOrder() {
  const setup = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A, PRODUCT_B])]});
  await rate(setup.context, ORDER_1, PRODUCT_A, 4);
  admin.requests.length = 0;
  return setup;
}

describe('POST /api/rating-comments', () => {
  it('saves a comment on a rated product and sends it to review', async () => {
    const {context} = await ratedOrder();

    const response = await postComment(context, comment(ORDER_1, PRODUCT_A, '  Shines all day.  '));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      productId: PRODUCT_A,
      comment: {text: 'Shines all day.', status: 'in_review'},
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(admin.comments()).toEqual([
      expect.objectContaining({
        customer_id: CUSTOMER_A,
        order_id: ORDER_1,
        product_id: PRODUCT_A,
        rating: '4',
        comment: 'Shines all day.',
        status: 'DRAFT',
      }),
    ]);
  });

  it.each([
    ['empty', '', 'empty_comment'],
    ['blank', '   \n  ', 'empty_comment'],
    ['too long', 'a'.repeat(1001), 'comment_too_long'],
  ])('does not save an %s comment', async (_name, text, error) => {
    const {context, fake} = await ratedOrder();
    fake.calls.length = 0;

    const response = await postComment(context, comment(ORDER_1, PRODUCT_A, text));

    expect(response).toMatchObject({status: 400, body: {error}});
    expect(fake.calls).toHaveLength(0);
    expect(admin.requests).toHaveLength(0);
    expect(admin.comments()).toHaveLength(0);
  });

  it('lets the customer edit the comment, which goes back to review', async () => {
    const {context} = await ratedOrder();
    await postComment(context, comment(ORDER_1, PRODUCT_A, 'First thoughts'));
    admin.publish(
      await commentHandle({customerId: CUSTOMER_A, orderId: ORDER_1, productId: PRODUCT_A}),
    );

    const response = await postComment(context, comment(ORDER_1, PRODUCT_A, 'After a month'));

    expect(response.body).toMatchObject({comment: {text: 'After a month', status: 'in_review'}});
    expect(admin.comments()).toEqual([
      expect.objectContaining({comment: 'After a month', status: 'DRAFT'}),
    ]);
  });

  it('refuses a comment on a product the customer has not rated', async () => {
    const {context} = await ratedOrder();
    const response = await postComment(context, comment(ORDER_1, PRODUCT_B, 'Not rated yet'));
    expect(response).toMatchObject({status: 409, body: {error: 'not_rated'}});
    expect(admin.comments()).toHaveLength(0);
  });

  it('refuses a product that is not in the order', async () => {
    const {context} = await ratedOrder();
    const response = await postComment(
      context,
      comment(ORDER_1, 'gid://shopify/Product/999', 'Hello'),
    );
    expect(response).toMatchObject({status: 422, body: {error: 'product_not_in_order'}});
  });

  it("treats another customer's order as not found, even if it was rated", async () => {
    const other = contextFor({
      customerId: CUSTOMER_B,
      orders: [deliveredOrder(ORDER_2, CUSTOMER_B, [PRODUCT_A])],
    });
    await rate(other.context, ORDER_2, PRODUCT_A, 5);
    const {context} = contextFor({orders: [deliveredOrder(ORDER_2, CUSTOMER_B, [PRODUCT_A])]});

    const response = await postComment(context, {
      ...comment(ORDER_2, PRODUCT_A, 'Forged'),
      customerId: CUSTOMER_B,
    });

    expect(response).toMatchObject({status: 404, body: {error: 'order_not_found'}});
    expect(admin.comments()).toHaveLength(0);
  });

  it('rejects anonymous shoppers before reading any order', async () => {
    const {context, fake} = contextFor({
      loggedIn: false,
      orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])],
    });
    const response = await postComment(context, comment(ORDER_1, PRODUCT_A, 'Hi'));
    expect(response).toMatchObject({status: 401, body: {error: 'unauthenticated'}});
    expect(fake.calls).toHaveLength(0);
    expect(admin.requests).toHaveLength(0);
  });

  it.each([
    ['a cross-site Origin', {Origin: 'https://evil.example'}],
    ['no Origin nor Sec-Fetch-Site', {}],
    ['Sec-Fetch-Site cross-site', {'Sec-Fetch-Site': 'cross-site'}],
  ])('rejects %s', async (_name, headers) => {
    const {context, fake} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});
    const response = await postComment(context, comment(ORDER_1, PRODUCT_A, 'Hi'), {headers});
    expect(response).toMatchObject({status: 403, body: {error: 'cross_origin'}});
    expect(fake.calls).toHaveLength(0);
  });

  it('rejects other methods and malformed JSON', async () => {
    const {context} = contextFor({orders: []});
    const put = await postComment(context, {}, {method: 'PUT'});
    expect(put.status).toBe(405);
    expect(put.headers.get('Allow')).toBe('POST');
    expect((await postComment(context, '{"comment": "x"')).body).toEqual({error: 'invalid_json'});
    const get = (await commentLoader()) as unknown as {init: ResponseInit};
    expect(get.init.status).toBe(405);
  });

  it('reports comments as unavailable without Admin configuration', async () => {
    const {context, fake} = contextFor(
      {orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]},
      {PUBLIC_STORE_DOMAIN: 'mock.shop'},
    );
    const response = await postComment(context, comment(ORDER_1, PRODUCT_A, 'Hi'));
    expect(response).toMatchObject({status: 503, body: {error: 'ratings_unavailable'}});
    expect(fake.calls).toHaveLength(0);
  });

  it('does not save when the order cannot be verified', async () => {
    const {context} = contextFor({
      orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])],
      failOn: {operation: 'OrderRatingLines', mode: 'throw'},
    });
    const response = await postComment(context, comment(ORDER_1, PRODUCT_A, 'Hi'));
    expect(response).toMatchObject({status: 503, body: {error: 'verification_unavailable'}});
    expect(admin.requests).toHaveLength(0);
  });

  it('reports a storage failure as not saved', async () => {
    const {context} = await ratedOrder();
    admin.fail('http', 'metaobjectUpsert');
    const response = await postComment(context, comment(ORDER_1, PRODUCT_A, 'Hi'));
    expect(response).toMatchObject({status: 503, body: {error: 'save_failed'}});
    expect(admin.comments()).toHaveLength(0);
  });
});

describe('order page loader with comments', () => {
  async function loadPage(context: RouteContext) {
    const result = (await orderLoader({
      request: new Request(`${ORIGIN}/account/orders/x`),
      context,
      params: {id: btoa(ORDER_1)},
    } as unknown as Parameters<typeof orderLoader>[0])) as {ratings: Promise<OrderRatingsView>};
    return result.ratings;
  }

  it("shows the customer's own comment and its review state after a reload", async () => {
    const {context} = await ratedOrder();
    await postComment(context, comment(ORDER_1, PRODUCT_A, 'Beautiful'));

    expect(await loadPage(context)).toMatchObject({
      status: 'ready',
      products: [
        {productId: PRODUCT_A, rating: 4, comment: {text: 'Beautiful', status: 'in_review'}},
        {productId: PRODUCT_B, rating: null, comment: null},
      ],
    });

    admin.publish(
      await commentHandle({customerId: CUSTOMER_A, orderId: ORDER_1, productId: PRODUCT_A}),
    );
    expect(await loadPage(context)).toMatchObject({
      products: [{comment: {text: 'Beautiful', status: 'published'}}, {comment: null}],
    });
  });

  it('only reads comments for rated products', async () => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});
    await loadPage(context);
    expect(admin.requests.some(({query}) => query.includes('ReviewCommentsByHandle'))).toBe(false);
  });

  it('shows a load error when comments cannot be read', async () => {
    const {context} = await ratedOrder();
    admin.fail('graphql', 'ReviewCommentsByHandle');
    expect(await loadPage(context)).toEqual({status: 'load_error'});
  });
});
