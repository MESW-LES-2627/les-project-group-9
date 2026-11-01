import {expect, test} from '@playwright/test';

test('home page loads', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});
