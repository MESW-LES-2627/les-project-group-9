import {expect, type Page} from '@playwright/test';

/** Cart helpers shared by E2E specs. They use the English labels (default language). */

export function cartBadge(page: Page) {
  return page.getByRole('link', {name: /^Open cart with \d+ items$/});
}

export async function cartCount(page: Page) {
  const label = await cartBadge(page).getAttribute('aria-label');

  return Number(label?.match(/\d+/)?.[0] ?? 0);
}

export async function openAvailableProduct(page: Page) {
  await page.goto('/collections/all');

  const hrefs = await page
    .locator('a[href^="/products/"]')
    .evaluateAll((links) => [
      ...new Set(links.map((link) => link.getAttribute('href')!.split('?')[0])),
    ]);

  for (const href of hrefs.slice(0, 10)) {
    await page.goto(href);

    const addToBag = page.getByRole('button', {name: 'Add to bag'});

    if (await addToBag.count()) return addToBag;
  }

  throw new Error('No product in the store can be added to the bag');
}

export async function addProductToBag(page: Page) {
  const addToBag = await openAvailableProduct(page);
  const before = await cartCount(page);

  await expect(addToBag).toBeEnabled();

  const saved = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.startsWith('/cart') &&
      response.request().method() === 'POST',
  );

  await addToBag.click();
  await saved;

  await expect(cartBadge(page)).toHaveAttribute(
    'aria-label',
    `Open cart with ${before + 1} items`,
  );
}
