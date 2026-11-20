import {expect, test} from '@playwright/test';
import {postJson} from './support/api';

// US-059. The comment form lives on the signed-in order page, which needs a
// real Shopify customer login, so these tests cover the comment endpoint as an
// anonymous or cross-site client would reach it. The form is covered by
// tests/components/account/RatingComment.test.tsx and the server rules by
// tests/unit/api-rating-comments.test.ts. Every case here is rejected before
// any Shopify call, so nothing is written to a shop.

const ENDPOINT = '/api/rating-comments';
const body = {
  orderId: 'gid://shopify/Order/1',
  productId: 'gid://shopify/Product/1',
  comment: 'A forged comment',
  customerId: 'gid://shopify/Customer/1',
  status: 'ACTIVE',
};

test.describe('comment endpoint', () => {
  test('only accepts POST', async ({request}) => {
    const response = await request.get(ENDPOINT);
    expect(response.status()).toBe(405);
    expect(response.headers()['allow']).toBe('POST');
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('rejects requests that are not same-origin', async ({playwright, baseURL}) => {
    const missing = await postJson(playwright, baseURL, ENDPOINT, body);
    expect(missing.status).toBe(403);
    expect(missing.json).toEqual({error: 'cross_origin'});

    const crossSite = await postJson(playwright, baseURL, ENDPOINT, body, {
      Origin: 'https://attacker.example',
    });
    expect(crossSite.status).toBe(403);
    expect(crossSite.json).toEqual({error: 'cross_origin'});
  });

  test('rejects an anonymous shopper even with forged identity fields', async ({
    playwright,
    baseURL,
  }) => {
    const response = await postJson(playwright, baseURL, ENDPOINT, body, {
      Origin: new URL(baseURL ?? 'http://localhost:3000').origin,
    });
    expect(response.status).toBe(401);
    expect(response.json).toEqual({error: 'unauthenticated'});
    expect(response.headers['cache-control']).toContain('no-store');
  });
});
