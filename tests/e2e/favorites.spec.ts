import {expect, test, type Page} from '@playwright/test';

// /account/login redirects to Shopify's Customer Account login, which is out of
// scope, so the request is answered locally instead.
test.beforeEach(async ({page}) => {
  await page.route('**/account/login*', (route) =>
    route.fulfill({contentType: 'text/html', body: '<h1>Login</h1>'}),
  );
});

async function expectLoginPage(page: Page) {
  await expect(page).toHaveURL((url) => url.pathname === '/account/login');
}

test('a logged-out shopper is asked to log in on the favorites page', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', {name: /^Favorites/}).click();

  await expect(page).toHaveURL((url) => url.pathname === '/favorites');
  await expect(
    page.getByRole('heading', {name: 'Log in to save favorites.'}),
  ).toBeVisible();
  await expect(page.getByRole('link', {name: 'Log in'})).toHaveAttribute(
    'href',
    '/account/login',
  );
});

test('the heart on a product page sends a logged-out shopper to log in', async ({
  page,
}) => {
  await page.goto('/collections/all');

  const href = await page
    .locator('a[href^="/products/"]')
    .first()
    .getAttribute('href');

  await page.goto(href!);

  const title = await page.getByRole('heading', {level: 1}).innerText();

  await page
    .getByRole('button', {name: `Log in to save ${title} to favorites`})
    .first()
    .click();

  await expectLoginPage(page);
});

test('the heart on a product card sends a logged-out shopper to log in', async ({
  page,
}) => {
  await page.goto('/collections/all');

  await page
    .getByRole('button', {name: /^Log in to save .+ to favorites$/})
    .first()
    .click();

  await expectLoginPage(page);
});
