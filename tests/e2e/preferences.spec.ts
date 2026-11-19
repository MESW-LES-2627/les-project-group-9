import {expect, test, type Locator, type Page} from '@playwright/test';

const LOGGED_IN = {loggedIn: true, favorites: [], fittingRoom: []};
const ALL_ALLERGIES = ['nickel', 'zinc', 'cobalt'];

/** Only the logged-in heart reads "Add … to favorites". */
const LOGGED_IN_HEART = {name: /^Add .+ to favorites$/};

async function mockProfile(page: Page, preferences: unknown) {
  await page.unroute('**/api/profile');
  await page.route('**/api/profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({...LOGGED_IN, preferences}),
    }),
  );
}

async function openProductWith(
  page: Page,
  find: (page: Page) => Locator,
): Promise<boolean> {
  await page.goto('/collections/all');

  const hrefs = await page
    .locator('a[href^="/products/"]')
    .evaluateAll((links) => [
      ...new Set(
        links.map((link) => (link.getAttribute('href') ?? '').split('?')[0]),
      ),
    ]);

  for (const href of hrefs.filter(Boolean).slice(0, 10)) {
    await page.goto(href);
    await page.getByRole('button', LOGGED_IN_HEART).first().waitFor();

    if (await find(page).first().isVisible()) return true;
  }

  return false;
}

const allergenBadge = (page: Page) =>
  page.getByRole('main').getByText('Allergen', {exact: true});

const measurementGuide = (page: Page) =>
  page.getByRole('button', {name: 'Measurement Guide'});

test('stops warning about an allergen once it is deleted', async ({page}) => {
  await mockProfile(page, {allergies: ALL_ALLERGIES});

  test.skip(
    !(await openProductWith(page, allergenBadge)),
    'No product in this catalog declares an allergen',
  );

  await mockProfile(page, {allergies: []});
  await page.reload();

  await expect(page.getByRole('button', LOGGED_IN_HEART).first()).toBeVisible();
  await expect(allergenBadge(page)).toHaveCount(0);
});

test('stops showing a ring size once it is deleted', async ({page}) => {
  await mockProfile(page, {ringSizes: {'left-ring': '6'}});

  test.skip(
    !(await openProductWith(page, measurementGuide)),
    'No ring product with a Size option in this catalog',
  );

  await measurementGuide(page).click();
  await expect(page.getByText('Ring: 6')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await mockProfile(page, {ringSizes: {}});
  await page.reload();

  await measurementGuide(page).click();
  await expect(
    page.getByText('You have not saved your ring sizes yet.'),
  ).toBeVisible();
});
