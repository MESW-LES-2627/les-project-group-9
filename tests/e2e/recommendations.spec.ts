import {expect, test} from '@playwright/test';

const NO_PREFERENCES = {
  loggedIn: true,
  favorites: [],
  fittingRoom: [],
  preferences: null,
};

test('no suggestions without preferences or favorites', async ({page}) => {
  let recommendationRequests = 0;

  await page.route('**/api/profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(NO_PREFERENCES),
    }),
  );
  await page.route('**/api/recommendations*', (route) => {
    recommendationRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({products: [], reasons: {}}),
    });
  });

  const profileResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/profile') && response.status() === 200,
  );
  await page.goto('/');
  await profileResponse;

  await expect(
    page.locator('section[aria-labelledby="recommendations-heading"]'),
  ).toHaveCount(0);

  await page.goto('/favorites');
  await expect(
    page.getByRole('heading', {name: 'Nothing saved yet.'}),
  ).toBeVisible();
  await expect(
    page.locator('section[aria-labelledby="recommendations-heading"]'),
  ).toHaveCount(0);
  expect(recommendationRequests).toBe(0);
});
