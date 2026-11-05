import {expect, test} from '@playwright/test';

test('selecting a colour updates the variant and the main image', async ({
  page,
}) => {
  await page.goto('/products/teardrop-pave-necklace');

  const group = page.locator('fieldset');
  const unselected = group.getByRole('button', {pressed: false}).first();
  const label = await unselected.getAttribute('aria-label');

  if (!label) throw new Error('Option button has no aria-label');

  const option = group.getByRole('button', {name: label, exact: true});
  const mainImage = page.locator('img[loading="eager"]');
  const before = await mainImage.getAttribute('src');

  if (!before) throw new Error('Main image has no src before selecting');

  await option.click();

  await expect(option).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL((url) =>
    [...url.searchParams.values()].includes(label),
  );
  await expect(mainImage).not.toHaveAttribute('src', before);
});
