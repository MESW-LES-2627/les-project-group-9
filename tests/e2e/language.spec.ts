import {expect, test} from '@playwright/test';
import {addProductToBag, cartCount} from './support/cart';
import {
  chooseLanguage,
  expectCurrentLanguage,
  languageOption,
  languageTrigger,
} from './support/language';
import {expectTouchTarget} from './support/layout';

const LOCALE_COOKIE = 'jeweliette_locale';

/*
 * These tests cover the application locale only (labels, <html lang>, cookie
 * and negotiation). Translated Shopify content is not asserted: Portuguese and
 * French are not yet published in the store, so the Storefront API returns
 * English content. Each locale case runs in its own browser context; the
 * config default is en-US and the describe blocks override it.
 */

test('an English browser gets English', async ({page}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expectCurrentLanguage(page.getByRole('banner'), 'EN');
});

test('choosing PT keeps the page and query, and persists after reload', async ({
  page,
  context,
}) => {
  await page.goto('/search?q=ring');
  const banner = page.getByRole('banner');

  await chooseLanguage(banner, 'PT');

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  await expect(page).toHaveURL(
    (url) => url.pathname === '/search' && url.searchParams.get('q') === 'ring',
  );
  await expect(languageTrigger(banner)).toContainText(
    'Idioma atual: Português (Portugal)',
  );

  const cookie = (await context.cookies()).find(
    (c) => c.name === LOCALE_COOKIE,
  );
  expect(cookie?.value).toBe('pt');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  expect(cookie?.path).toBe('/');

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  await expectCurrentLanguage(banner, 'PT');

  await chooseLanguage(banner, 'EN');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
});

test('the desktop dropdown opens above the page, marks the current language and closes', async ({
  page,
}) => {
  await page.goto('/');
  const banner = page.getByRole('banner');
  const trigger = languageTrigger(banner);

  await expectTouchTarget(trigger);
  await trigger.click();

  const options = banner
    .getByRole('list', {name: 'Language'})
    .getByRole('button');
  await expect(options).toHaveCount(3);
  await expect(languageOption(banner, 'EN')).toHaveAttribute(
    'aria-current',
    'true',
  );
  for (const option of await options.all()) {
    await expectTouchTarget(option);
    // Not clipped by the header and layered above the page content.
    const hit = await option.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return element.contains(top);
    });
    expect(hit).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(options.first()).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole('heading', {level: 1}).click();
  await expect(options.first()).toBeHidden();
});

test('the dropdown works with the keyboard alone', async ({page}) => {
  await page.goto('/');
  const banner = page.getByRole('banner');

  await languageTrigger(banner).focus();
  await page.keyboard.press('Enter');
  await expect(languageOption(banner, 'EN')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(languageOption(banner, 'EN')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(languageOption(banner, 'PT')).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
});

test('on a phone the language is chosen from the menu', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await page.goto('/');

  await page.getByRole('button', {name: 'Open menu'}).click();
  const menu = page.getByRole('dialog');
  const trigger = languageTrigger(menu);
  await expectTouchTarget(trigger);
  await trigger.click();

  const option = languageOption(menu, 'PT');
  await expect(option).toBeVisible();
  await expectTouchTarget(option);
  // The inline list stays inside the drawer.
  const inside = await option.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.right <= window.innerWidth && box.left >= 0;
  });
  expect(inside).toBe(true);

  await option.click();
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
    form: {locale: 'de', redirectTo: '/'},
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
  await chooseLanguage(page.getByRole('banner'), 'PT');
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
    await expectCurrentLanguage(page.getByRole('banner'), 'PT');
    await expect(languageTrigger(page.getByRole('banner'))).toContainText(
      'Idioma atual',
    );

    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === LOCALE_COOKIE)).toBeUndefined();
  });

  test('choosing English survives reload and navigation', async ({
    page,
    context,
  }) => {
    await page.goto('/collections/all?sort=newest');

    await chooseLanguage(page.getByRole('banner'), 'EN');
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
    await expectCurrentLanguage(page.getByRole('banner'), 'EN');
  });
});

test.describe('a fresh English browser', () => {
  test.use({locale: 'en-US'});

  test('gets English and no cookie is set', async ({page, context}) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expectCurrentLanguage(page.getByRole('banner'), 'EN');
    expect(
      (await context.cookies()).find((c) => c.name === LOCALE_COOKIE),
    ).toBeUndefined();
  });
});

test.describe('a fresh French browser', () => {
  test.use({locale: 'fr-FR'});

  test('gets French without choosing, and no cookie is set', async ({
    page,
    context,
  }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');
    await expectCurrentLanguage(page.getByRole('banner'), 'FR');
    await expect(languageTrigger(page.getByRole('banner'))).toContainText(
      'Langue actuelle',
    );
    await expect(
      page.getByRole('banner').getByRole('button', {name: 'Rechercher'}),
    ).toBeVisible();
    expect(
      (await context.cookies()).find((c) => c.name === LOCALE_COOKIE),
    ).toBeUndefined();
  });

  test('choosing English survives reload and navigation', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await chooseLanguage(page.getByRole('banner'), 'EN');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    expect(
      (await context.cookies()).find((c) => c.name === LOCALE_COOKIE)?.value,
    ).toBe('en');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await page.goto('/collections/all');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  });
});

test.describe('a fresh Canadian French browser', () => {
  test.use({locale: 'fr-CA'});

  test('falls back to the available French experience', async ({page}) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');
  });
});

test.describe('choosing French', () => {
  for (const browserLocale of ['en-US', 'pt-PT'] as const) {
    test.describe(`in a ${browserLocale} browser`, () => {
      test.use({locale: browserLocale});

      test('keeps the page and query, and persists after reload and navigation', async ({
        page,
        context,
      }) => {
        await page.goto('/search?q=ring&sort=price');

        await chooseLanguage(page.getByRole('banner'), 'FR');

        await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');
        await expect(page).toHaveURL(
          (url) =>
            url.pathname === '/search' &&
            url.searchParams.get('q') === 'ring' &&
            url.searchParams.get('sort') === 'price',
        );
        const cookie = (await context.cookies()).find(
          (c) => c.name === LOCALE_COOKIE,
        );
        expect(cookie?.value).toBe('fr');
        expect(cookie?.httpOnly).toBe(true);

        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');

        await page.goto('/collections/all');
        await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');
        await expectCurrentLanguage(page.getByRole('banner'), 'FR');
      });
    });
  }

  test('from the phone menu, with a French plural cart label', async ({
    page,
  }) => {
    await page.setViewportSize({width: 375, height: 812});
    await page.goto('/');

    await page.getByRole('button', {name: 'Open menu'}).click();
    await chooseLanguage(page.getByRole('dialog'), 'FR');

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr-FR');
    await expect(
      page.getByRole('link', {name: /^Ouvrir le panier \(\d+ articles?\)$/}),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {name: 'Ouvrir le menu'}),
    ).toBeVisible();
  });
});
