import {expect, test, type Page} from '@playwright/test';

async function productPaths(page: Page) {
  return page
    .locator('a[href^="/products/"]')
    .evaluateAll((links) => [
      ...new Set(links.map((link) => link.getAttribute('href')!.split('?')[0])),
    ]);
}

async function openFirstProduct(page: Page) {
  const [path] = await productPaths(page);

  expect(path).toBeDefined();

  await page.locator(`a[href^="${path}"]`).first().click();

  await expect(page).toHaveURL((url) => url.pathname === path);
  await expect(
    page.getByRole('button', {name: /^(Add to bag|Sold out)$/}),
  ).toBeVisible();
}

test('the collections page opens a collection', async ({page}) => {
  await page.goto('/collections');

  await expect(
    page.getByRole('heading', {level: 1, name: 'Collections'}),
  ).toBeVisible();

  const card = page.locator('main a[href^="/collections/"]').first();
  const title = await card.getByRole('heading').innerText();

  await card.click();

  await expect(page).toHaveURL(/\/collections\/.+/);
  await expect(page.getByRole('heading', {level: 1})).toHaveText(title);
});

test('a collection lists its pieces and opens a product', async ({page}) => {
  await page.goto('/collections/all');

  const pieces = await productPaths(page);

  expect(pieces.length).toBeGreaterThan(0);

  await openFirstProduct(page);
});

test('browse from home to a collection and then to a product', async ({
  page,
}) => {
  await page.goto('/');

  await page
    .getByRole('link', {name: 'View all pieces'})
    .filter({visible: true})
    .click();

  await expect(page).toHaveURL(/\/collections\/.+/);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();

  await openFirstProduct(page);
});
