import {expect, test} from '@playwright/test';
import {addProductToBag, cartBadge} from './support/cart';

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
