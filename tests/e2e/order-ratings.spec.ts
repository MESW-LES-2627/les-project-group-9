import {expect, test} from '@playwright/test';

// US-058. The rating form lives on the signed-in order page, which needs a
// real Shopify customer login, so these tests cover the rating endpoint as an
// anonymous or cross-site client would reach it. The form itself is covered
// by tests/components/account/OrderRatings.test.tsx and the server rules by
// tests/unit/api-order-ratings.test.ts. Every case here is rejected before
// any Shopify call, so nothing is written to a shop.

// These POSTs are rejected before their body is read. The local MiniOxygen
// preview server then resets a reused keep-alive connection (curl shows the
// same), so each one asks for its connection to be closed.
const CLOSE = {Connection: 'close'};

const body = {
  orderId: 'gid://shopify/Order/1',
  productId: 'gid://shopify/Product/1',
  rating: 5,
  customerId: 'gid://shopify/Customer/1',
};

test.describe('rating endpoint', () => {
  test('only accepts POST', async ({request}) => {
    const response = await request.get('/api/order-ratings');
    expect(response.status()).toBe(405);
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('rejects requests without a same-site Origin', async ({request}) => {
    const missing = await request.post('/api/order-ratings', {
      data: body,
      headers: CLOSE,
    });
    expect(missing.status()).toBe(403);
    expect(await missing.json()).toEqual({error: 'cross_origin'});

    const crossSite = await request.post('/api/order-ratings', {
      data: body,
      headers: {...CLOSE, Origin: 'https://attacker.example'},
    });
    expect(crossSite.status()).toBe(403);
  });

  test('rejects an anonymous shopper even with forged identity fields', async ({
    request,
    baseURL,
  }) => {
    const response = await request.post('/api/order-ratings', {
      data: {...body, verified: true, hasPurchased: true},
      headers: {
        ...CLOSE,
        Origin: new URL(baseURL ?? 'http://localhost:3000').origin,
      },
    });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({error: 'unauthenticated'});
    expect(response.headers()['cache-control']).toContain('no-store');
  });
});
