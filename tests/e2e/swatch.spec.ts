import {expect, test} from '@playwright/test';

test('selecting a color updates the variant and the main image', async ({
  page,
}) => {
  await page.goto('/products/teardrop-pave-necklace');

  const mainImage = page.locator('img[loading="eager"]');

  const goldOption = page.getByRole('button', {name: 'Gold', exact: true});
  await goldOption.click();

  await expect(page).toHaveURL(/[?&]Cor=Gold\b/);
  await expect(goldOption).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', {name: 'Silver', exact: true}),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(mainImage).toHaveAttribute('src', /gold/i);
});
