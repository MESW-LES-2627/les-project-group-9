import {expect, test, type Page} from '@playwright/test';

async function findProductWithOptions(page: Page) {
  await page.goto('/collections/all');

  const hrefs = await page
    .locator('a[href^="/products/"]')
    .evaluateAll((links) => [
      ...new Set(links.map((link) => link.getAttribute('href')!.split('?')[0])),
    ]);

  for (const href of hrefs.slice(0, 10)) {
    await page.goto(href);

    const option = page
      .locator('fieldset')
      .getByRole('button', {pressed: false, disabled: false})
      .first();

    if (await option.count()) return option;
  }

  return null;
}

test('selecting an option updates the selected variant', async ({page}) => {
  const unselected = await findProductWithOptions(page);

  test.skip(!unselected, 'No product in the store has a selectable option');

  const label = await unselected!.getAttribute('aria-label');

  if (!label) throw new Error('Option button has no aria-label');

  const option = page
    .locator('fieldset')
    .getByRole('button', {name: label, exact: true});

  await option.click();

  await expect(option).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL((url) =>
    [...url.searchParams.values()].includes(label),
  );
});
