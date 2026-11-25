import {expect, test, type Page} from '@playwright/test';

/**
 * Depends on store data: CI runs against mock.shop, which has no customization
 * metafields, so these tests skip unless a product has an engraving limit.
 */
async function firstEngravableProduct(page: Page) {
  await page.goto('/collections/all');

  const hrefs = await page
    .locator('a[href^="/products/"]')
    .evaluateAll((links) => [
      ...new Set(
        links.map((link) => (link.getAttribute('href') ?? '').split('?')[0]),
      ),
    ]);

  for (const href of hrefs.slice(0, 15)) {
    await page.goto(href);
    if (await page.locator('input[name="engraving"]').count()) return true;
  }

  return false;
}

async function engravingLimit(page: Page): Promise<number> {
  const counter = page
    .locator('[data-engraving-editor]')
    .getByText(/^\d+\/\d+$/)
    .first();
  const text = (await counter.textContent()) ?? '0/20';
  return Number(text.split('/')[1]);
}

test('a customizable product shows the engraving row', async ({page}) => {
  if (!(await firstEngravableProduct(page))) {
    test.skip(true, 'No product with engraving in this store');
  }

  await expect(page.getByText('Engraving').first()).toBeVisible();
  await expect(page.getByText('Optional').first()).toBeVisible();
  await expect(page.locator('input[name="engraving"]')).toBeVisible();
  await expect(
    page.locator('[data-engraving-editor]').getByText(/^\d+\/\d+$/).first(),
  ).toBeVisible();
});

test('the engraving previews and appears in the bag', async ({page}) => {
  if (!(await firstEngravableProduct(page))) {
    test.skip(true, 'No product with engraving in this store');
  }

  const input = page.locator('input[name="engraving"]');
  const text = 'Zq7';
  await input.fill(text);

  await expect(page.getByText('Preview')).toBeVisible();
  await expect(page.getByText(text, {exact: true})).toBeVisible();

  const saved = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.startsWith('/cart') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', {name: 'Add to bag'}).click();
  expect((await saved).status()).toBe(200);

  await page.goto('/cart');
  const cart = page.getByRole('region', {name: 'Cart page'});
  const line = cart.getByRole('listitem').filter({hasText: text}).first();

  await expect(line.getByText('Engraving', {exact: true})).toBeVisible();
  await expect(line.getByText(text, {exact: true})).toBeVisible();
});

test('too-long engraving shows a message and blocks the cart', async ({page}) => {
  if (!(await firstEngravableProduct(page))) {
    test.skip(true, 'No product with engraving in this store');
  }

  const max = await engravingLimit(page);
  await page.locator('input[name="engraving"]').fill('X'.repeat(max + 1));

  await expect(
    page.getByText(new RegExp(`Engraving can be up to ${max} characters`)),
  ).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add to bag'})).toBeDisabled();
});

test('disallowed characters show a message and block the cart', async ({page}) => {
  if (!(await firstEngravableProduct(page))) {
    test.skip(true, 'No product with engraving in this store');
  }

  await page.locator('input[name="engraving"]').fill('<');

  await expect(
    page.getByText('Use letters, numbers, spaces and simple punctuation only.'),
  ).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add to bag'})).toBeDisabled();
});
