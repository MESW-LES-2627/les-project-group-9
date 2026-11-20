import {expect, test} from '@playwright/test';
import {productLinks} from './support/catalog';

// US-060. Public reviews come from the Admin API, which mock.shop (CI) does
// not have, so there the section shows "not available". With a real store it
// shows the reviews or the invitation to write the first one. Either way the
// section must render without breaking the product page. The states and texts
// are covered by tests/components/product/ProductReviews.test.tsx and the data
// by tests/unit/product-reviews.test.ts. No product names or prices asserted.

const STATES = [
  'Reviews are not available at the moment.',
  "We couldn't load the reviews right now. Please try again later.",
  'No reviews yet. Bought this piece? Rate it from your orders once it has been delivered.',
];

test('the product page has a reviews section', async ({page}) => {
  const href = (await productLinks(page))[0];
  test.skip(!href, 'The catalog has no products');
  await page.goto(href);

  const section = page.getByRole('region', {name: 'Reviews'});
  await expect(section).toBeVisible();
  await expect(section.getByRole('heading', {level: 2, name: 'Reviews'})).toBeVisible();
  await expect(page.getByText('Loading reviews…')).toHaveCount(0);

  // One of the known states, or a summary with an average out of 5.
  const text = (await section.textContent()) ?? '';
  expect(STATES.some((state) => text.includes(state)) || /out of 5/.test(text)).toBe(true);
});

test('the invitation links to the orders page when a product has no reviews', async ({page}) => {
  const href = (await productLinks(page))[0];
  test.skip(!href, 'The catalog has no products');
  await page.goto(href);

  const link = page.getByRole('region', {name: 'Reviews'}).getByRole('link', {name: 'Go to my orders'});
  test.skip((await link.count()) === 0, 'This product already has reviews or reviews are unavailable');
  await expect(link).toHaveAttribute('href', '/account/orders');
});
