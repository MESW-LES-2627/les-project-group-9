import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {ActionFunctionArgs} from 'react-router';
import {action, loader as ratingLoader} from '~/routes/api.order-ratings';
import {headers as orderHeaders, loader as orderLoader} from '~/routes/account.orders.$id';
import {
  CUSTOMER_ORDER_RATING_FULFILLMENTS_QUERY,
  CUSTOMER_ORDER_RATING_LINES_QUERY,
} from '~/graphql/customer-account/CustomerOrderRatingQueries';
import type {OrderRatingsView} from '~/lib/ratings/ratings.server';
import {
  ADMIN_ENV,
  CUSTOMER_A,
  CUSTOMER_B,
  deliveredOrder,
  fakeAdminApi,
  fakeCustomerAccount,
  PRODUCT_A,
  PRODUCT_B,
  PRODUCT_C,
  type FakeCustomerAccountOptions,
  type OrderFixture,
} from './support/ratings-fakes';

const ORIGIN = 'http://localhost';
const ENDPOINT = `${ORIGIN}/api/order-ratings`;
const ORDER_1 = 'gid://shopify/Order/101';
const ORDER_2 = 'gid://shopify/Order/102';

let admin: ReturnType<typeof fakeAdminApi>;

beforeEach(() => {
  admin = fakeAdminApi();
  vi.stubGlobal('fetch', admin.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function contextFor(
  options: Partial<FakeCustomerAccountOptions> & {orders: OrderFixture[]},
  env: Record<string, string> = ADMIN_ENV,
) {
  const fake = fakeCustomerAccount({customerId: CUSTOMER_A, ...options});
  return {
    fake,
    context: {customerAccount: fake.customerAccount, env} as unknown as ActionFunctionArgs['context'],
  };
}

function ratingRequest(
  body: unknown,
  {
    method = 'POST',
    headers = {Origin: ORIGIN},
  }: {method?: string; headers?: Record<string, string>} = {},
) {
  return new Request(ENDPOINT, {
    method,
    headers: {'Content-Type': 'application/json', ...headers},
    body: method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function submit(
  context: ActionFunctionArgs['context'],
  body: unknown,
  init?: Parameters<typeof ratingRequest>[1],
) {
  const result = (await action({
    request: ratingRequest(body, init),
    context,
    params: {},
  } as ActionFunctionArgs)) as unknown as {data: Record<string, unknown>; init: ResponseInit | null};
  return {
    status: result.init?.status ?? 200,
    body: result.data,
    headers: new Headers(result.init?.headers),
  };
}

const rate = (orderId: string, productId: string, rating: unknown) => ({orderId, productId, rating});

describe('POST /api/order-ratings', () => {
  it('saves a rating for a product of an own delivered order', async () => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});

    const response = await submit(context, rate(ORDER_1, PRODUCT_A, 4));

    expect(response.status).toBe(201);
    expect(response.body).toEqual({productId: PRODUCT_A, rating: 4});
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(admin.ratings()).toEqual([
      expect.objectContaining({
        customer_id: CUSTOMER_A,
        order_id: ORDER_1,
        product_id: PRODUCT_A,
        rating: '4',
      }),
    ]);
  });

  it.each([1, 2, 3, 4, 5])('accepts %i stars', async (value) => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});
    const response = await submit(context, rate(ORDER_1, PRODUCT_A, value));
    expect(response.status).toBe(201);
    expect(admin.ratings()[0]).toMatchObject({rating: String(value)});
  });

  it.each([0, 6, -2, 3.5, '4', null, undefined])(
    'rejects %j without calling Shopify',
    async (value) => {
      const {context, fake} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});
      const response = await submit(context, rate(ORDER_1, PRODUCT_A, value));
      expect(response.status).toBe(400);
      expect(response.body).toEqual({error: 'invalid_rating'});
      expect(fake.calls).toHaveLength(0);
      expect(admin.requests).toHaveLength(0);
    },
  );

  it('rejects malformed JSON', async () => {
    const {context} = contextFor({orders: []});
    const response = await submit(context, '{"rating": 5');
    expect(response).toMatchObject({status: 400, body: {error: 'invalid_json'}});
  });

  it('rejects anonymous shoppers before reading any order', async () => {
    const {context, fake} = contextFor({
      loggedIn: false,
      orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])],
    });
    const response = await submit(context, rate(ORDER_1, PRODUCT_A, 5));
    expect(response).toMatchObject({status: 401, body: {error: 'unauthenticated'}});
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(fake.calls).toHaveLength(0);
    expect(admin.requests).toHaveLength(0);
  });

  it.each([
    ['a cross-site Origin', {Origin: 'https://evil.example'}],
    ['no Origin nor Sec-Fetch-Site', {}],
    ['Sec-Fetch-Site cross-site', {'Sec-Fetch-Site': 'cross-site'}],
  ])('rejects %s', async (_name, headers) => {
    const {context, fake} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});
    const response = await submit(context, rate(ORDER_1, PRODUCT_A, 5), {headers});
    expect(response).toMatchObject({status: 403, body: {error: 'cross_origin'}});
    expect(fake.calls).toHaveLength(0);
  });

  it('accepts Sec-Fetch-Site same-origin when Origin is absent', async () => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});
    const response = await submit(context, rate(ORDER_1, PRODUCT_A, 5), {
      headers: {'Sec-Fetch-Site': 'same-origin'},
    });
    expect(response.status).toBe(201);
  });

  it('rejects other methods', async () => {
    const {context} = contextFor({orders: []});
    expect((await submit(context, {}, {method: 'PUT'})).status).toBe(405);
    const get = (await ratingLoader()) as unknown as {init: ResponseInit};
    expect(get.init.status).toBe(405);
  });

  it("rejects another customer's order as not found", async () => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_B, [PRODUCT_A])]});
    const response = await submit(context, rate(ORDER_1, PRODUCT_A, 5));
    expect(response).toMatchObject({status: 404, body: {error: 'order_not_found'}});
    expect(admin.requests).toHaveLength(0);
  });

  it('uses the session customer, not a forged customer or order owner', async () => {
    const {context} = contextFor({
      orders: [
        deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A]),
        deliveredOrder(ORDER_2, CUSTOMER_B, [PRODUCT_B]),
      ],
    });

    const forged = await submit(context, {
      ...rate(ORDER_2, PRODUCT_B, 5),
      customerId: CUSTOMER_B,
      verified: true,
    });
    expect(forged.status).toBe(404);

    await submit(context, {...rate(ORDER_1, PRODUCT_A, 5), customerId: CUSTOMER_B});
    expect(admin.ratings()).toEqual([expect.objectContaining({customer_id: CUSTOMER_A})]);
  });

  it('rejects a product that is not in the order', async () => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});
    const response = await submit(context, rate(ORDER_1, PRODUCT_B, 5));
    expect(response).toMatchObject({status: 422, body: {error: 'product_not_in_order'}});
    expect(admin.requests).toHaveLength(0);
  });

  describe('delivery', () => {
    function withDelivery(change: (order: OrderFixture) => void) {
      const order = deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A, PRODUCT_B]);
      change(order);
      return contextFor({orders: [order]}).context;
    }

    it.each([
      ['not delivered (in transit)', (order: OrderFixture) => {
        order.fulfillments[0].latestShipmentStatus = 'IN_TRANSIT';
      }],
      ['FULFILLED without a shipment status', (order: OrderFixture) => {
        order.fulfillments[0].latestShipmentStatus = null;
      }],
      ['partially delivered', (order: OrderFixture) => {
        const [first, second] = order.lines;
        order.fulfillments = [
          {id: 'f1', status: 'SUCCESS', latestShipmentStatus: 'DELIVERED', items: [{lineItemId: first.id, quantity: 1}]},
          {id: 'f2', status: 'SUCCESS', latestShipmentStatus: 'IN_TRANSIT', items: [{lineItemId: second.id, quantity: 1}]},
        ];
      }],
      ['not fulfilled', (order: OrderFixture) => {
        order.fulfillmentStatus = 'UNFULFILLED';
        order.fulfillments = [];
      }],
    ])('blocks a rating when the order is %s', async (_name, change) => {
      const response = await submit(withDelivery(change), rate(ORDER_1, PRODUCT_A, 5));
      expect(response).toMatchObject({status: 403, body: {error: 'not_delivered'}});
      expect(admin.requests).toHaveLength(0);
    });

    it('accepts split shipments once every one is delivered', async () => {
      const context = withDelivery((order) => {
        const [first, second] = order.lines;
        order.fulfillments = [
          {id: 'f1', status: 'SUCCESS', latestShipmentStatus: 'DELIVERED', items: [{lineItemId: first.id, quantity: 1}]},
          {id: 'f2', status: 'SUCCESS', latestShipmentStatus: 'DELIVERED', items: [{lineItemId: second.id, quantity: 1}]},
        ];
      });
      expect((await submit(context, rate(ORDER_1, PRODUCT_B, 3))).status).toBe(201);
    });
  });

  it('finds the product and the delivery evidence beyond the first pages', async () => {
    const products = Array.from({length: 7}, (_, index) => `gid://shopify/Product/${900 + index}`);
    const order = deliveredOrder(ORDER_1, CUSTOMER_A, products);
    // Five fulfillments, one per line except the last, which holds three items.
    order.fulfillments = [
      ...order.lines.slice(0, 4).map((line, index) => ({
        id: `f${index}`,
        status: 'SUCCESS',
        latestShipmentStatus: 'DELIVERED',
        items: [{lineItemId: line.id, quantity: 1}],
      })),
      {
        id: 'f-last',
        status: 'SUCCESS',
        latestShipmentStatus: 'DELIVERED',
        items: order.lines.slice(4).map((line) => ({lineItemId: line.id, quantity: 1})),
      },
    ];
    const {context, fake} = contextFor({orders: [order], linePageSize: 2, fulfillmentPageSize: 2, itemPageSize: 2});

    const response = await submit(context, rate(ORDER_1, products[6], 5));

    expect(response.status).toBe(201);
    const lines = fake.calls.filter((call) => call.operation === 'OrderRatingLines');
    const fulfillments = fake.calls.filter((call) => call.operation === 'OrderRatingFulfillments');
    expect(lines).toHaveLength(4);
    expect(fulfillments.length).toBeGreaterThan(3);
    expect(fulfillments.some((call) => call.variables.itemsAfter)).toBe(true);
  });

  it('fails closed when the order history is larger than the page limit', async () => {
    const products = Array.from({length: 25}, (_, index) => `gid://shopify/Product/${700 + index}`);
    const {context} = contextFor({
      orders: [deliveredOrder(ORDER_1, CUSTOMER_A, products)],
      linePageSize: 1,
    });
    const response = await submit(context, rate(ORDER_1, products[0], 5));
    expect(response).toMatchObject({status: 503, body: {error: 'verification_unavailable'}});
    expect(admin.requests).toHaveLength(0);
  });

  it.each([
    ['OrderRatingLines', 'errors'],
    ['OrderRatingLines', 'throw'],
    ['OrderRatingFulfillments', 'errors'],
    ['OrderRatingFulfillments', 'throw'],
  ] as const)('does not write when %s fails (%s)', async (operation, mode) => {
    const {context} = contextFor({
      orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])],
      failOn: {operation, mode},
    });
    const response = await submit(context, rate(ORDER_1, PRODUCT_A, 5));
    expect(response).toMatchObject({status: 503, body: {error: 'verification_unavailable'}});
    expect(admin.requests).toHaveLength(0);
  });

  it('reports ratings as unavailable without Admin configuration', async () => {
    const {context, fake} = contextFor(
      {orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]},
      {PUBLIC_STORE_DOMAIN: 'mock.shop'},
    );
    const response = await submit(context, rate(ORDER_1, PRODUCT_A, 5));
    expect(response).toMatchObject({status: 503, body: {error: 'ratings_unavailable'}});
    expect(fake.calls).toHaveLength(0);
  });

  it('reports a storage failure as not saved', async () => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});
    admin.fail('http');
    const response = await submit(context, rate(ORDER_1, PRODUCT_A, 5));
    expect(response).toMatchObject({status: 503, body: {error: 'save_failed'}});
    expect(admin.records.size).toBe(0);
  });

  it('never overwrites a saved rating on retry', async () => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});
    await submit(context, rate(ORDER_1, PRODUCT_A, 2));

    const retry = await submit(context, rate(ORDER_1, PRODUCT_A, 5));

    expect(retry).toMatchObject({status: 409, body: {error: 'already_rated', rating: 2}});
    expect(admin.ratings()).toEqual([expect.objectContaining({rating: '2'})]);
  });

  it('keeps one record for concurrent conflicting submissions', async () => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])]});

    const responses = await Promise.all(
      [5, 1, 3].map((value) => submit(context, rate(ORDER_1, PRODUCT_A, value))),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409]);
    const saved = responses.find((response) => response.status === 201)?.body.rating;
    for (const response of responses) expect(response.body.rating).toBe(saved);
    expect(admin.records.size).toBe(1);
  });

  it('gives one rating to several units and variants of a product', async () => {
    const order = deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A, PRODUCT_A]);
    order.lines[0].quantity = 3;
    order.fulfillments[0].items[0].quantity = 3;
    const {context} = contextFor({orders: [order]});

    expect((await submit(context, rate(ORDER_1, PRODUCT_A, 4))).status).toBe(201);
    expect((await submit(context, rate(ORDER_1, PRODUCT_A, 4))).status).toBe(409);
    expect(admin.records.size).toBe(1);
  });

  it('rates distinct products of one order separately', async () => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A, PRODUCT_B])]});
    expect((await submit(context, rate(ORDER_1, PRODUCT_A, 4))).status).toBe(201);
    expect((await submit(context, rate(ORDER_1, PRODUCT_B, 2))).status).toBe(201);
    expect(admin.records.size).toBe(2);
  });

  it('allows another rating of the same product from a later delivered order', async () => {
    const {context} = contextFor({
      orders: [
        deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A]),
        deliveredOrder(ORDER_2, CUSTOMER_A, [PRODUCT_A]),
      ],
    });
    expect((await submit(context, rate(ORDER_1, PRODUCT_A, 2))).status).toBe(201);
    expect((await submit(context, rate(ORDER_2, PRODUCT_A, 5))).status).toBe(201);
    expect(admin.records.size).toBe(2);
  });

  it('does not use payment or refund data for eligibility', () => {
    for (const document of [CUSTOMER_ORDER_RATING_LINES_QUERY, CUSTOMER_ORDER_RATING_FULFILLMENTS_QUERY]) {
      expect(document).not.toMatch(/financialStatus|refund|totalRefunded|cancelledAt/i);
    }
  });
});

describe('order page loader', () => {
  async function loadPage(context: ActionFunctionArgs['context'], orderId = ORDER_1) {
    const result = (await orderLoader({
      request: new Request(`${ORIGIN}/account/orders/x`),
      context,
      params: {id: btoa(orderId)},
    } as unknown as Parameters<typeof orderLoader>[0])) as {ratings: Promise<OrderRatingsView>};
    return result.ratings;
  }

  it('shows a saved rating read-only after a reload', async () => {
    const {context} = contextFor({orders: [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A, PRODUCT_B])]});
    await submit(context, rate(ORDER_1, PRODUCT_A, 3));

    const view = await loadPage(context);

    expect(view).toMatchObject({
      status: 'ready',
      delivered: true,
      products: [
        {productId: PRODUCT_A, rating: 3},
        {productId: PRODUCT_B, rating: null},
      ],
    });
  });

  it('keeps showing a saved rating if the order no longer reads as delivered', async () => {
    const order = deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A]);
    const {context} = contextFor({orders: [order]});
    await submit(context, rate(ORDER_1, PRODUCT_A, 4));
    // e.g. a later return: the rating is neither deleted nor hidden.
    order.fulfillments[0].latestShipmentStatus = 'FAILURE';

    expect(await loadPage(context)).toMatchObject({
      delivered: false,
      products: [{productId: PRODUCT_A, rating: 4}],
    });
  });

  it("never shows another customer's rating of the same product", async () => {
    const orderA = deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_C]);
    const orderB = deliveredOrder(ORDER_2, CUSTOMER_B, [PRODUCT_C]);
    await submit(contextFor({orders: [orderA]}).context, rate(ORDER_1, PRODUCT_C, 1));

    const viewB = await loadPage(
      contextFor({customerId: CUSTOMER_B, orders: [orderB]}).context,
      ORDER_2,
    );

    expect(viewB).toMatchObject({products: [{productId: PRODUCT_C, rating: null}]});
  });

  it('separates verification, storage and configuration problems', async () => {
    const orders = [deliveredOrder(ORDER_1, CUSTOMER_A, [PRODUCT_A])];
    expect(
      await loadPage(contextFor({orders, failOn: {operation: 'OrderRatingFulfillments', mode: 'errors'}}).context),
    ).toEqual({status: 'verification_error'});
    expect(
      await loadPage(contextFor({orders}, {PUBLIC_STORE_DOMAIN: 'mock.shop'}).context),
    ).toEqual({status: 'unavailable'});
    admin.fail('graphql');
    expect(await loadPage(contextFor({orders}).context)).toEqual({status: 'load_error'});
  });

  it('marks the page private and uncacheable', () => {
    const headers = new Headers(orderHeaders({} as never) as HeadersInit);
    expect(headers.get('Cache-Control')).toBe('no-store');
    expect(headers.get('Vary')).toBe('Cookie');
  });
});
