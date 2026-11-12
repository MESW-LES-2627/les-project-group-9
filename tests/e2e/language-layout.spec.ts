import {expect, test, type Locator, type Page} from '@playwright/test';

/*
 * Portuguese and French labels are longer than English ones. On a phone they
 * must not push the page sideways or spill out of their buttons and links.
 * The language is set with the same cookie the language selector writes.
 */

const PHONE = {width: 375, height: 812};
const LOCALE_COOKIE = 'jeweliette_locale';

const LANGUAGES = [
  {code: 'pt', lang: 'pt-PT', openMenu: 'Abrir menu'},
  {code: 'fr', lang: 'fr-FR', openMenu: 'Ouvrir le menu'},
] as const;

const PAGES = ['/', '/collections', '/collections/all', '/cart', '/search'];

async function expectNoSidewaysScroll(page: Page) {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(PHONE.width);
}

/**
 * Visible links and buttons in `scope` that leave the screen or whose text
 * overflows their own box. Text cut on purpose with an ellipsis is fine.
 */
async function overflowingControls(scope: Locator) {
  return scope.evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>('a, button, summary')]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => getComputedStyle(element).textOverflow !== 'ellipsis')
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return (
          box.right > window.innerWidth + 1 ||
          box.left < -1 ||
          element.scrollWidth > element.clientWidth + 1
        );
      })
      .map((element) => element.textContent?.trim() || element.outerHTML),
  );
}

for (const language of LANGUAGES) {
  test.describe(`${language.code} on a phone`, () => {
    test.beforeEach(async ({context, page, baseURL}) => {
      await context.addCookies([
        {name: LOCALE_COOKIE, value: language.code, url: baseURL!},
      ]);
      await page.setViewportSize(PHONE);
    });

    for (const path of PAGES) {
      test(`${path} does not scroll sideways`, async ({page}) => {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          language.lang,
        );

        await expectNoSidewaysScroll(page);
        expect(await overflowingControls(page.getByRole('banner'))).toEqual([]);
      });
    }

    test('the menu labels fit inside the drawer', async ({page}) => {
      await page.goto('/');
      await page.getByRole('button', {name: language.openMenu}).click();

      const menu = page.getByRole('dialog');
      await expect(menu).toBeVisible();

      // The drawer slides in: measure again until it has settled.
      await expect.poll(() => overflowingControls(menu)).toEqual([]);
      await expectNoSidewaysScroll(page);
    });

    test('a product page does not scroll sideways', async ({page}) => {
      await page.goto('/collections/all');
      const href = await page
        .locator('a[href^="/products/"]')
        .first()
        .getAttribute('href');

      await page.goto(href!);

      await expectNoSidewaysScroll(page);
      expect(await overflowingControls(page.getByRole('main'))).toEqual([]);
    });
  });
}
