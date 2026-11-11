import {expect, test, type Page} from '@playwright/test';
import {addProductToBag, cartCount} from './support/cart';
import {expectTouchTarget} from './support/layout';

const LOCALE_COOKIE = 'jeweliette_locale';

function languageButton(
  page: Page,
  scope: 'banner' | 'dialog',
  code: 'EN' | 'PT',
) {
  const name = code === 'EN' ? /^EN — / : /^PT — /;
  return page.getByRole(scope).getByRole('button', {name});
}

/*
 * These tests cover the UI locale only (labels, <html lang>, cookie and
 * negotiation). Translated Shopify content is not asserted: Portuguese is not
 * yet published in the store, so the Storefront API returns English content.
 */

test('an English browser gets English', async ({page}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(languageButton(page, 'banner', 'EN')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('choosing PT keeps the page and query, and persists after reload', async ({
  page,
  context,
}) => {
  await page.goto('/search?q=ring');

  await languageButton(page, 'banner', 'PT').click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  await expect(page).toHaveURL(
    (url) => url.pathname === '/search' && url.searchParams.get('q') === 'ring',
  );
  await expect(
    page.getByRole('banner').getByRole('group', {name: 'Idioma'}),
  ).toBeVisible();

  const cookie = (await context.cookies()).find(
    (c) => c.name === LOCALE_COOKIE,
  );
  expect(cookie?.value).toBe('pt');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  expect(cookie?.path).toBe('/');

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  await expect(languageButton(page, 'banner', 'PT')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await languageButton(page, 'banner', 'EN').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
});

test('on a phone the language is chosen from the menu', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await page.goto('/');

  await page.getByRole('button', {name: 'Open menu'}).click();
  const button = languageButton(page, 'dialog', 'PT');
  await expect(button).toBeVisible();

  await expectTouchTarget(button);

  await button.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  await expect(page.getByRole('button', {name: 'Abrir menu'})).toBeVisible();

  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(375);
});

test('the language route rejects unsupported values and external redirects', async ({
  request,
}) => {
  const unsupported = await request.post('/locale', {
    form: {locale: 'fr', redirectTo: '/'},
    maxRedirects: 0,
  });
  expect(unsupported.status()).toBe(400);

  const external = await request.post('/locale', {
    form: {locale: 'pt', redirectTo: 'https://evil.example/'},
    maxRedirects: 0,
  });
  expect(external.status()).toBe(302);
  expect(external.headers()['location']).toBe('/');

  const get = await request.get('/locale', {maxRedirects: 0});
  expect(get.status()).toBe(405);
});

test('switching language keeps the cart and the market', async ({
  page,
  context,
}) => {
  await addProductToBag(page);
  const items = await cartCount(page);
  const cookiesBefore = await context.cookies();
  const cartCookie = cookiesBefore.find((c) => c.name === 'cart');
  const priceBefore = await page
    .locator('html')
    .evaluate(() => document.body.innerText.match(/[€$£]/)?.[0]);
  expect(cartCookie?.value).toBeTruthy();
  expect(priceBefore).toBeTruthy();

  await page.keyboard.press('Escape');
  await languageButton(page, 'banner', 'PT').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');

  await expect(
    page.getByRole('link', {
      name: `Abrir saco de compras com ${items} ${items === 1 ? 'artigo' : 'artigos'}`,
    }),
  ).toBeVisible();

  const cookiesAfter = await context.cookies();
  expect(cookiesAfter.find((c) => c.name === 'cart')?.value).toBe(
    cartCookie?.value,
  );
  for (const cookie of cookiesBefore.filter((c) => c.name !== LOCALE_COOKIE)) {
    expect(cookiesAfter.find((c) => c.name === cookie.name)?.value).toBe(
      cookie.value,
    );
  }

  const priceAfter = await page
    .locator('html')
    .evaluate(() => document.body.innerText.match(/[€$£]/)?.[0]);
  expect(priceAfter).toBe(priceBefore);
});

test('pages vary on the headers that decide the language', async ({
  request,
}) => {
  for (const path of ['/', '/collections/all']) {
    const response = await request.get(path);
    const vary = (response.headers()['vary'] ?? '').toLowerCase();
    expect(vary).toContain('cookie');
    expect(vary).toContain('accept-language');
  }
});

test.describe('a fresh Portuguese browser', () => {
  test.use({locale: 'pt-PT'});

  test('gets Portuguese without choosing, and no cookie is set', async ({
    page,
    context,
  }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
    await expect(
      page.getByRole('banner').getByRole('group', {name: 'Idioma'}),
    ).toBeVisible();
    await expect(languageButton(page, 'banner', 'PT')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === LOCALE_COOKIE)).toBeUndefined();
  });

  test('choosing English survives reload and navigation', async ({
    page,
    context,
  }) => {
    await page.goto('/collections/all?sort=newest');

    await languageButton(page, 'banner', 'EN').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/collections/all' &&
        url.searchParams.get('sort') === 'newest',
    );
    expect(
      (await context.cookies()).find((c) => c.name === LOCALE_COOKIE)?.value,
    ).toBe('en');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(
      page.getByRole('banner').getByRole('group', {name: 'Language'}),
    ).toBeVisible();
  });
});

test.describe('a fresh English browser', () => {
  test.use({locale: 'en-US'});

  test('gets English and no cookie is set', async ({page, context}) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(languageButton(page, 'banner', 'EN')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      (await context.cookies()).find((c) => c.name === LOCALE_COOKIE),
    ).toBeUndefined();
  });
});
