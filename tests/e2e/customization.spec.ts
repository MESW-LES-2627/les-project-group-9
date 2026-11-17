import {expect, test} from '@playwright/test';

/**
 * Depends on store data: CI runs against mock.shop, which has no customization
 * metafields, so the test skips unless a product is marked as customizable.
 * Products that are not marked show no panel; that rule is covered by the
 * unit tests for `parseProductCustomization`.
 */
test('a customizable product shows only its allowed options', async ({page}) => {
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

    const panel = page.getByRole('region', {name: 'Customize'});
    if (!(await panel.count())) continue;

    const radios = panel.getByRole('radio');
    if (await radios.count()) {
      await expect(radios.first()).toBeChecked();
    }

    const engraving = panel.getByLabel('Engraving');
    if (await engraving.count()) {
      const max = Number(await engraving.getAttribute('maxlength'));
      expect(max).toBeGreaterThan(0);

      // Type key by key so the browser's maxlength enforcement applies.
      await engraving.pressSequentially('X'.repeat(max + 5));
      await expect(engraving).toHaveValue('X'.repeat(max));
    }
    return;
  }

  test.skip(true, 'No customizable product in this store');
});

test('the chosen gem color and engraving appear in the bag', async ({page}) => {
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

    const panel = page.getByRole('region', {name: 'Customize'});
    const addToBag = page.getByRole('button', {name: 'Add to bag'});
    const engraving = panel.getByLabel('Engraving');
    if (!(await panel.count()) || !(await addToBag.count())) continue;
    if (!(await engraving.count())) continue;

    // Text chosen by the test, not catalog data; cut to the product's limit.
    const max = Number(await engraving.getAttribute('maxlength'));
    const text = 'Zq7'.slice(0, max);
    await engraving.fill(text);

    // The radios are visually hidden; shoppers click their labels.
    const gemLabel = panel.locator('label:has(input[type="radio"])').last();
    const gemColor = (await gemLabel.count())
      ? ((await gemLabel.textContent()) ?? '').trim()
      : null;
    if (gemColor) await gemLabel.click();

    const saved = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.startsWith('/cart') &&
        response.request().method() === 'POST',
    );
    await addToBag.click();
    expect((await saved).status()).toBe(200);

    await page.goto('/cart');
    const cart = page.getByRole('region', {name: 'Cart page'});
    const line = cart.getByRole('listitem').filter({hasText: text}).first();

    await expect(line.getByText('Engraving', {exact: true})).toBeVisible();
    await expect(line.getByText(text, {exact: true})).toBeVisible();
    if (gemColor) {
      await expect(line.getByText('Gem color', {exact: true})).toBeVisible();
      await expect(line.getByText(gemColor, {exact: true})).toBeVisible();
    }
    return;
  }

  test.skip(true, 'No customizable product with engraving can be added to the bag');
});
