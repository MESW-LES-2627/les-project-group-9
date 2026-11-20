import {expect, test} from '@playwright/test';
import {postJson} from './support/api';

// US-058. The rating form lives on the signed-in order page, which needs a
// real Shopify customer login, so these tests cover the rating endpoint as an
// anonymous or cross-site client would reach it. The form itself is covered
// by tests/components/account/OrderRatings.test.tsx and the server rules by
// tests/unit/api-order-ratings.test.ts. Every case here is rejected before
// any Shopify call, so nothing is written to a shop.

const body = {
  orderId: 'gid://shopify/Order/1',
  productId: 'gid://shopify/Product/1',
  rating: 5,
  customerId: 'gid://shopify/Customer/1',
};

const postRating = (
  playwright: Parameters<typeof postJson>[0],
  baseURL: string | undefined,
  data: unknown,
  headers?: Record<string, string>,
) => postJson(playwright, baseURL, '/api/order-ratings', data, headers);

test.describe('rating endpoint', () => {
  test('only accepts POST', async ({request}) => {
    const response = await request.get('/api/order-ratings');
    expect(response.status()).toBe(405);
    expect(response.headers()['allow']).toBe('POST');
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('rejects requests without a same-site Origin', async ({
    playwright,
    baseURL,
  }) => {
    const missing = await postRating(playwright, baseURL, body);
    expect(missing.status).toBe(403);
    expect(missing.json).toEqual({error: 'cross_origin'});

    const crossSite = await postRating(playwright, baseURL, body, {
      Origin: 'https://attacker.example',
    });
    expect(crossSite.status).toBe(403);
  });

  test('rejects an anonymous shopper even with forged identity fields', async ({
    playwright,
    baseURL,
  }) => {
    const response = await postRating(
      playwright,
      baseURL,
      {...body, verified: true, hasPurchased: true},
      {Origin: new URL(baseURL ?? 'http://localhost:3000').origin},
    );
    expect(response.status).toBe(401);
    expect(response.json).toEqual({error: 'unauthenticated'});
    expect(response.headers['cache-control']).toContain('no-store');
  });
});
