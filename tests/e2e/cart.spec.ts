import {expect, test, type Page} from '@playwright/test';

function cartBadge(page: Page) {
  return page.getByRole('link', {name: /^Open cart with \d+ items$/});
}

async function cartCount(page: Page) {
  const label = await cartBadge(page).getAttribute('aria-label');

  return Number(label?.match(/\d+/)?.[0] ?? 0);
}


async function openAvailableProduct(page: Page) {
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

async function addProductToBag(page: Page) {
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

test('an empty cart invites the shopper to keep shopping', async ({page}) => {
  await page.goto('/cart');

  const cart = page.getByRole('region', {name: 'Cart page'});

  await expect(
    cart.getByRole('heading', {name: 'Your bag is empty'}),
  ).toBeVisible();

  await cart.getByRole('link', {name: 'Continue shopping'}).click();

  await expect(page).toHaveURL((url) => url.pathname === '/collections');
});

test('adding a product opens the bag and updates the cart count', async ({
  page,
}) => {
  await addProductToBag(page);

  await expect(page.getByRole('heading', {name: 'Shopping bag'})).toBeVisible();
});

test('a cart line can change quantity and be removed', async ({page}) => {
  await addProductToBag(page);
  await page.goto('/cart');

  const cart = page.getByRole('region', {name: 'Cart page'});
  const line = cart.getByRole('listitem').first();
  const quantity = line.locator('[aria-live="polite"]');

  await expect(quantity).toHaveText('1');
  await expect(
    line.getByRole('button', {name: 'Decrease quantity'}),
  ).toBeDisabled();

  await line.getByRole('button', {name: 'Increase quantity'}).click();

  await expect(quantity).toHaveText('2');
  await expect(cartBadge(page)).toHaveAttribute(
    'aria-label',
    'Open cart with 2 items',
  );

  await line.getByRole('button', {name: 'Decrease quantity'}).click();

  await expect(quantity).toHaveText('1');

  await line.getByRole('button', {name: 'Remove'}).click();

  await expect(
    cart.getByRole('heading', {name: 'Your bag is empty'}),
  ).toBeVisible();
  await expect(cartBadge(page)).toHaveAttribute(
    'aria-label',
    'Open cart with 0 items',
  );
});
