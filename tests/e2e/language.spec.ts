import {expect, test, type Page} from '@playwright/test';
import {addProductToBag, cartCount} from './support/cart';

const LOCALE_COOKIE = 'jeweliette_locale';

function languageButton(
  page: Page,
  scope: 'banner' | 'dialog',
  code: 'EN' | 'PT',
) {
  const name = code === 'EN' ? /^EN — / : /^PT — /;
  return page.getByRole(scope).getByRole('button', {name});
}

test('English is the default language', async ({page}) => {
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

  const box = await button.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);

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
    page.getByRole('link', {name: `Abrir saco com ${items} artigos`}),
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
