import {describe, expect, it} from 'vitest';
import {isOrderFullyDelivered, type DeliveryEvidence} from '~/lib/ratings/delivery';
import {
  isRatingValue,
  parseRatingSubmission,
  rateableProducts,
  ratingHandle,
} from '~/lib/ratings/rating';

const ORDER = 'gid://shopify/Order/500';
const PRODUCT = 'gid://shopify/Product/11';

describe('rating values', () => {
  it.each([1, 2, 3, 4, 5])('accepts %i stars', (value) => {
    expect(isRatingValue(value)).toBe(true);
    expect(
      parseRatingSubmission({orderId: ORDER, productId: PRODUCT, rating: value}),
    ).toEqual({submission: {orderId: ORDER, productId: PRODUCT, rating: value}});
  });

  it.each([
    ['zero', 0],
    ['six', 6],
    ['negative', -1],
    ['fractional', 4.5],
    ['numeric string', '5'],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['null', null],
    ['boolean', true],
    ['array', [5]],
  ])('rejects a %s rating', (_name, rating) => {
    expect(
      parseRatingSubmission({orderId: ORDER, productId: PRODUCT, rating}),
    ).toEqual({error: 'invalid_rating'});
  });

  it('rejects a missing rating', () => {
    expect(parseRatingSubmission({orderId: ORDER, productId: PRODUCT})).toEqual({
      error: 'invalid_rating',
    });
  });

  it.each([null, 'rating=5', [1], 42])('rejects a malformed body (%j)', (body) => {
    expect(parseRatingSubmission(body)).toEqual({error: 'invalid_payload'});
  });

  it('rejects order and product IDs that are not Shopify GIDs', () => {
    expect(
      parseRatingSubmission({orderId: '500', productId: PRODUCT, rating: 5}),
    ).toEqual({error: 'invalid_order'});
    expect(
      parseRatingSubmission({
        orderId: ORDER,
        productId: 'gid://shopify/ProductVariant/1',
        rating: 5,
      }),
    ).toEqual({error: 'invalid_product'});
  });

  it('ignores customer IDs and purchase flags sent by the browser', () => {
    expect(
      parseRatingSubmission({
        orderId: ORDER,
        productId: PRODUCT,
        rating: 3,
        customerId: 'gid://shopify/Customer/999',
        verified: true,
        hasPurchased: true,
      }),
    ).toEqual({submission: {orderId: ORDER, productId: PRODUCT, rating: 3}});
  });
});

describe('rateableProducts', () => {
  const line = (id: string, productId: string | null, quantity = 1) => ({
    id,
    productId,
    quantity,
    title: `Title ${id}`,
  });

  it('gives one entry for several units and variants of a product', () => {
    expect(
      rateableProducts([
        line('l1', PRODUCT, 3),
        line('l2', PRODUCT, 1),
        line('l3', 'gid://shopify/Product/22', 1),
      ]).map((product) => product.productId),
    ).toEqual([PRODUCT, 'gid://shopify/Product/22']);
  });

  it('skips lines without a Shopify product or remaining quantity', () => {
    expect(
      rateableProducts([line('l1', null), line('l2', PRODUCT, 0)]),
    ).toEqual([]);
  });
});

describe('ratingHandle', () => {
  const key = {customerId: 'gid://shopify/Customer/1', orderId: ORDER, productId: PRODUCT};

  it('is deterministic and does not expose the IDs', async () => {
    const handle = await ratingHandle(key);
    expect(handle).toBe(await ratingHandle({...key}));
    expect(handle).toMatch(/^rating-[0-9a-f]{64}$/);
  });

  it('differs per customer, order and product', async () => {
    const handles = await Promise.all([
      ratingHandle(key),
      ratingHandle({...key, customerId: 'gid://shopify/Customer/2'}),
      ratingHandle({...key, orderId: 'gid://shopify/Order/501'}),
      ratingHandle({...key, productId: 'gid://shopify/Product/12'}),
    ]);
    expect(new Set(handles).size).toBe(4);
  });
});

describe('isOrderFullyDelivered', () => {
  const lines = [
    {id: 'l1', quantity: 2},
    {id: 'l2', quantity: 1},
  ];
  const delivered = (
    items: Array<{lineItemId: string; quantity: number | null}>,
    overrides: Partial<DeliveryEvidence['fulfillments'][number]> = {},
  ) => ({status: 'SUCCESS', latestShipmentStatus: 'DELIVERED', items, ...overrides});

  const evidence = (
    fulfillments: DeliveryEvidence['fulfillments'],
    fulfillmentStatus = 'FULFILLED',
  ): DeliveryEvidence => ({fulfillmentStatus, lines, fulfillments});

  it('is true when every unit is in a delivered fulfillment', () => {
    expect(
      isOrderFullyDelivered(
        evidence([delivered([{lineItemId: 'l1', quantity: 2}, {lineItemId: 'l2', quantity: 1}])]),
      ),
    ).toBe(true);
  });

  it('sums split shipments when all of them are delivered', () => {
    expect(
      isOrderFullyDelivered(
        evidence([
          delivered([{lineItemId: 'l1', quantity: 1}]),
          delivered([{lineItemId: 'l1', quantity: 1}, {lineItemId: 'l2', quantity: 1}]),
        ]),
      ),
    ).toBe(true);
  });

  it('is false when one shipment of a split order is still in transit', () => {
    expect(
      isOrderFullyDelivered(
        evidence([
          delivered([{lineItemId: 'l1', quantity: 2}]),
          delivered([{lineItemId: 'l2', quantity: 1}], {latestShipmentStatus: 'IN_TRANSIT'}),
        ]),
      ),
    ).toBe(false);
  });

  it('is false for a FULFILLED order without delivery confirmation', () => {
    for (const latestShipmentStatus of [null, 'CONFIRMED', 'OUT_FOR_DELIVERY', 'ATTEMPTED_DELIVERY']) {
      expect(
        isOrderFullyDelivered(
          evidence([
            delivered(
              [{lineItemId: 'l1', quantity: 2}, {lineItemId: 'l2', quantity: 1}],
              {latestShipmentStatus},
            ),
          ]),
        ),
      ).toBe(false);
    }
  });

  it('is false when only some units of a line were delivered', () => {
    expect(
      isOrderFullyDelivered(
        evidence([delivered([{lineItemId: 'l1', quantity: 1}, {lineItemId: 'l2', quantity: 1}])]),
      ),
    ).toBe(false);
  });

  it('ignores cancelled or failed fulfillments even if marked delivered', () => {
    for (const status of ['CANCELLED', 'FAILURE', 'ERROR', 'PENDING', null]) {
      expect(
        isOrderFullyDelivered(
          evidence([
            delivered([{lineItemId: 'l1', quantity: 2}, {lineItemId: 'l2', quantity: 1}], {status}),
          ]),
        ),
      ).toBe(false);
    }
  });

  it('does not count a missing fulfilled quantity', () => {
    expect(
      isOrderFullyDelivered(
        evidence([delivered([{lineItemId: 'l1', quantity: null}, {lineItemId: 'l2', quantity: 1}])]),
      ),
    ).toBe(false);
  });

  it('requires the order itself to be FULFILLED', () => {
    for (const status of ['PARTIALLY_FULFILLED', 'IN_PROGRESS', 'UNFULFILLED', 'ON_HOLD']) {
      expect(
        isOrderFullyDelivered(
          evidence(
            [delivered([{lineItemId: 'l1', quantity: 2}, {lineItemId: 'l2', quantity: 1}])],
            status,
          ),
        ),
      ).toBe(false);
    }
  });

  it('is false with no fulfillments or no lines', () => {
    expect(isOrderFullyDelivered(evidence([]))).toBe(false);
    expect(
      isOrderFullyDelivered({fulfillmentStatus: 'FULFILLED', lines: [], fulfillments: []}),
    ).toBe(false);
  });

  it('does not treat local pickup as delivery', () => {
    expect(
      isOrderFullyDelivered(
        evidence([
          delivered(
            [{lineItemId: 'l1', quantity: 2}, {lineItemId: 'l2', quantity: 1}],
            {latestShipmentStatus: 'PICKED_UP'},
          ),
        ]),
      ),
    ).toBe(false);
  });
});
