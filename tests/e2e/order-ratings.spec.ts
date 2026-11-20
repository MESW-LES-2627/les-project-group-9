import {expect, test, type APIResponse} from '@playwright/test';

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

type Result = {
  status: number;
  json: unknown;
  headers: ReturnType<APIResponse['headers']>;
};

// These POSTs are rejected before their body is read. The local MiniOxygen
// preview server then resets the next request on that keep-alive connection
// (ECONNRESET; curl shows the same), and a `Connection: close` request header
// did not stop Playwright from reusing it. Each POST therefore gets its own
// request context, so no connection is shared.
async function postRating(
  playwright: Parameters<Parameters<typeof test>[2]>[0]['playwright'],
  baseURL: string | undefined,
  data: unknown,
  headers: Record<string, string> = {},
): Promise<Result> {
  const context = await playwright.request.newContext({baseURL});
  try {
    const response = await context.post('/api/order-ratings', {data, headers});
    return {
      status: response.status(),
      json: await response.json(),
      headers: response.headers(),
    };
  } finally {
    await context.dispose();
  }
}

test.describe('rating endpoint', () => {
  test('only accepts POST', async ({request}) => {
    const response = await request.get('/api/order-ratings');
    expect(response.status()).toBe(405);
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
