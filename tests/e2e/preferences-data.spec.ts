import {expect, test} from '@playwright/test';

test('preference data endpoints require a logged-in shopper', async ({
  request,
}) => {
  const exported = await request.get('/api/profile/preferences/export');
  expect(exported.status()).toBe(401);
  expect(exported.headers()['cache-control']).toContain('no-store');
  expect(exported.headers()['content-disposition']).toBeUndefined();

  const deleted = await request.delete('/api/profile/preferences');
  expect(deleted.status()).toBe(401);
  expect(deleted.headers()['cache-control']).toContain('no-store');
});
