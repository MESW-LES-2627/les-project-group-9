import {expect, test, type Page} from '@playwright/test';
import {expectTouchTarget} from './support/layout';

/**
 * The site header switches from the compact (menu button) layout to the
 * desktop layout at Tailwind's `xl` breakpoint (1280px). Below it, the
 * desktop navigation and header language selector do not fit next to the
 * header actions. See docs/responsive.md.
 */
const DESKTOP_HEADER_MIN_WIDTH = 1280;
const MIN_NAV_ACTIONS_GAP = 16;

const LABELS = {
  en: {
    openMenu: 'Open menu',
    mainNav: 'Main navigation',
    language: 'Language',
    account: 'Account',
    myAccount: 'My account',
    bag: 'Shopping bag',
    search: 'Search',
    favorites: 'Favorites',
    fittingRoom: 'Fitting room',
    cart: 'Open cart',
  },
  pt: {
    openMenu: 'Abrir menu',
    mainNav: 'Navegação principal',
    language: 'Idioma',
    account: 'Conta',
    myAccount: 'A minha conta',
    bag: 'Saco de compras',
    search: 'Pesquisar',
    favorites: 'Favoritos',
    fittingRoom: 'Provador',
    cart: 'Abrir saco de compras',
  },
  fr: {
    openMenu: 'Ouvrir le menu',
    mainNav: 'Navigation principale',
    language: 'Langue',
    account: 'Compte',
    myAccount: 'Mon compte',
    bag: 'Panier',
    search: 'Rechercher',
    favorites: 'Favoris',
    fittingRoom: 'Cabine d’essayage',
    cart: 'Ouvrir le panier',
  },
} as const;

/** One option per supported language: EN, PT, FR. */
const LANGUAGE_OPTIONS = Object.keys(LABELS).length;

type Lang = keyof typeof LABELS;

/** The site header only: drawer headers are inside dialogs, not the banner landmark. */
function siteHeader(page: Page) {
  return page.getByRole('banner');
}

async function openAt(page: Page, width: number, lang: Lang) {
  await page
    .context()
    .addCookies([
      {name: 'jeweliette_locale', value: lang, url: 'http://localhost:3000'},
    ]);
  await page.setViewportSize({width, height: 900});
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
}

async function expectNoHorizontalOverflow(page: Page) {
  const doc = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(doc.scroll).toBeLessThanOrEqual(doc.viewport);

  const header = await siteHeader(page).evaluate((element) => ({
    scroll: element.scrollWidth,
    client: element.clientWidth,
  }));
  expect(header.scroll).toBeLessThanOrEqual(header.client);
}

async function expectActionsAvailable(page: Page, lang: Lang) {
  const header = siteHeader(page);
  const t = LABELS[lang];
  await expect(
    header.getByRole('button', {name: t.search, exact: true}),
  ).toBeVisible();
  for (const name of [t.favorites, t.fittingRoom, t.cart]) {
    await expect(
      header.getByRole('link', {name: new RegExp(`^${name}`)}),
    ).toBeVisible();
  }
}

for (const lang of ['en', 'pt', 'fr'] as const) {
  const t = LABELS[lang];

  for (const width of [375, 800, DESKTOP_HEADER_MIN_WIDTH - 1]) {
    test(`compact header at ${width}px (${lang})`, async ({page}) => {
      await openAt(page, width, lang);
      const header = siteHeader(page);

      await expect(
        header.getByRole('button', {name: t.openMenu}),
      ).toBeVisible();
      await expect(
        header.getByRole('navigation', {name: t.mainNav}),
      ).toBeHidden();
      await expect(header.getByRole('group', {name: t.language})).toBeHidden();
      await expect(
        header.getByRole('link', {name: t.account, exact: true}),
      ).toBeHidden();
      await expectActionsAvailable(page, lang);
      await expectNoHorizontalOverflow(page);

      await header.getByRole('button', {name: t.openMenu}).click();
      const menu = page.getByRole('dialog');
      await expect(menu.getByRole('link', {name: t.myAccount})).toBeVisible();
      await expect(menu.getByRole('button', {name: t.bag})).toBeVisible();

      const languages = menu
        .getByRole('group', {name: t.language})
        .getByRole('button');
      await expect(languages).toHaveCount(LANGUAGE_OPTIONS);
      for (const button of await languages.all()) {
        await expectTouchTarget(button);
      }
    });
  }

  test(`desktop header at ${DESKTOP_HEADER_MIN_WIDTH}px (${lang})`, async ({
    page,
  }) => {
    await openAt(page, DESKTOP_HEADER_MIN_WIDTH, lang);
    const header = siteHeader(page);

    await expect(header.getByRole('button', {name: t.openMenu})).toBeHidden();
    const nav = header.getByRole('navigation', {name: t.mainNav});
    await expect(nav).toBeVisible();
    await expect(
      header.getByRole('link', {name: t.account, exact: true}),
    ).toBeVisible();
    await expectActionsAvailable(page, lang);
    await expectNoHorizontalOverflow(page);

    const languages = header
      .getByRole('group', {name: t.language})
      .getByRole('button');
    await expect(languages).toHaveCount(LANGUAGE_OPTIONS);
    for (const button of await languages.all()) {
      await expectTouchTarget(button);
    }

    const lastLinkRight = await nav
      .getByRole('link')
      .last()
      .evaluate((link) => link.getBoundingClientRect().right);
    const selectorLeft = await header
      .getByRole('group', {name: t.language})
      .evaluate((group) => group.getBoundingClientRect().left);
    expect(selectorLeft - lastLinkRight).toBeGreaterThanOrEqual(
      MIN_NAV_ACTIONS_GAP,
    );
  });
}
