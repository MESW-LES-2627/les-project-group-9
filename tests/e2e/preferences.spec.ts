import {expect, test, type Page} from '@playwright/test';

const LOGGED_IN = {loggedIn: true, favorites: [], fittingRoom: []};

async function mockProfile(page: Page, preferences: unknown) {
  await page.route('**/api/profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({...LOGGED_IN, preferences}),
    }),
  );
}

/**
 * These checks need Jeweliette catalog data that the CI catalog (mock.shop)
 * does not have: the Teardrop Pavé Necklace carries an allergen metafield,
 * and the Round Signet Ring is the Rings product with a Size option.
 */
async function openFixtureProduct(page: Page, handle: string) {
  const response = await page.goto(`/products/${handle}`);

  test.skip(
    response?.status() === 404,
    `Fixture product "${handle}" is not in this catalog`,
  );
}

test('stops warning about an allergen once it is deleted', async ({page}) => {
  await mockProfile(page, {allergies: ['zinc']});
  await openFixtureProduct(page, 'teardrop-pave-necklace');

  // The logged-in favorite button proves the mocked profile was applied.
  await expect(
    page.getByRole('button', {
      name: 'Add Teardrop Pavé Necklace to favorites',
    }),
  ).toBeVisible();
  await expect(page.getByText('Allergen', {exact: true})).toBeVisible();

  await page.unroute('**/api/profile');
  await mockProfile(page, {allergies: []});
  await page.reload();

  await expect(
    page.getByRole('button', {
      name: 'Add Teardrop Pavé Necklace to favorites',
    }),
  ).toBeVisible();
  await expect(page.getByText('Allergen', {exact: true})).toHaveCount(0);
});

test('stops showing a ring size once it is deleted', async ({page}) => {
  await mockProfile(page, {ringSizes: {'left-ring': '6'}});
  await openFixtureProduct(page, 'customizable-round-signet-ring');

  await page.getByRole('button', {name: 'Measurement Guide'}).click();
  await expect(page.getByText('Ring: 6')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.unroute('**/api/profile');
  await mockProfile(page, {ringSizes: {}});
  await page.reload();

  await page.getByRole('button', {name: 'Measurement Guide'}).click();
  await expect(
    page.getByText('You have not saved your ring sizes yet.'),
  ).toBeVisible();
});
