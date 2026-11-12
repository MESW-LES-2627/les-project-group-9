import {expect, test, type Page} from '@playwright/test';

/*
 * US-047: the critical shopper flows show the interface in the browser's
 * language. Each language runs in its own browser context (test.use locale).
 * Only interface text is asserted: catalog content (product names, prices,
 * descriptions, Shopify menu titles) stays as Shopify returns it, which is
 * English until Portuguese and French are published in Shopify.
 * Account pages are not covered: they need Shopify Customer Account login.
 */
const LANGUAGES = [
  {
    locale: 'pt-PT',
    tag: 'pt-PT',
    homeTitle: 'Jeweliette | Use a sua história',
    announcement: /^Envio gratuito/,
    heroLink: 'Explorar a coleção',
    collectionsHeading: 'Coleções',
    sortBy: /Ordenar por/,
    piecesLoaded: /^\d+ peças? carregadas?$/,
    addToBag: 'Adicionar ao saco',
    soldOut: 'Esgotado',
    description: 'Descrição',
    bagHeading: 'Saco de compras',
    bagTitle: 'Saco de compras | Jeweliette',
    emptyBag: 'O seu saco de compras está vazio',
    searchHeading: 'Pesquisar na Jeweliette',
    searchResults: /^(Peças|Sem resultados)$/,
    favoritesLogin: 'Inicie sessão para guardar favoritos.',
    notFound: 'Página não encontrada.',
  },
  {
    locale: 'fr-FR',
    tag: 'fr-FR',
    homeTitle: 'Jeweliette | Portez votre histoire',
    announcement: /^Livraison offerte/,
    heroLink: 'Découvrir la collection',
    collectionsHeading: 'Collections',
    sortBy: /Trier par/,
    piecesLoaded: /^\d+ pièces? chargées?$/,
    addToBag: 'Ajouter au panier',
    soldOut: 'Épuisé',
    description: 'Description',
    bagHeading: 'Panier',
    bagTitle: 'Panier | Jeweliette',
    emptyBag: 'Votre panier est vide',
    searchHeading: 'Rechercher sur Jeweliette',
    searchResults: /^(Pièces|Aucun résultat)$/,
    favoritesLogin: 'Connectez-vous pour enregistrer vos favoris.',
    notFound: 'Page introuvable.',
  },
] as const;

async function firstHref(page: Page, prefix: string) {
  const href = await page
    .locator(`main a[href^="${prefix}"]`)
    .first()
    .getAttribute('href');
  expect(href).toBeTruthy();
  return href!.split('?')[0];
}

for (const t of LANGUAGES) {
  test.describe(`interface in ${t.locale}`, () => {
    test.use({locale: t.locale});

    test('home', async ({page}) => {
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', t.tag);
      await expect(page).toHaveTitle(t.homeTitle);
      await expect(page.getByText(t.announcement)).toBeVisible();
      await expect(
        page.getByRole('link', {name: t.heroLink}).first(),
      ).toBeVisible();
    });

    test('collection with sorting and filters', async ({page}) => {
      await page.goto('/collections');
      await expect(
        page.getByRole('heading', {level: 1, name: t.collectionsHeading}),
      ).toBeVisible();

      await page.goto(await firstHref(page, '/collections/'));

      await expect(page.getByText(t.sortBy)).toBeVisible();
      await expect(page.getByText(t.piecesLoaded)).toBeVisible();
    });

    test('product page', async ({page}) => {
      await page.goto('/collections/all');
      await page.goto(await firstHref(page, '/products/'));

      await expect(
        page
          .getByRole('button', {name: t.addToBag})
          .or(page.getByRole('button', {name: t.soldOut})),
      ).toBeVisible();
      // Accordion summaries hold the label plus +/- icons.
      await expect(
        page.locator('summary').filter({hasText: t.description}),
      ).toBeVisible();
    });

    test('empty bag', async ({page}) => {
      await page.goto('/cart');

      await expect(page).toHaveTitle(t.bagTitle);
      await expect(
        page.getByRole('heading', {level: 1, name: t.bagHeading}),
      ).toBeVisible();
      await expect(
        page.getByRole('main').getByRole('heading', {name: t.emptyBag}),
      ).toBeVisible();
    });

    test('search', async ({page}) => {
      await page.goto('/search?q=ring');

      await expect(
        page.getByRole('heading', {level: 1, name: t.searchHeading}),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', {level: 2, name: t.searchResults}).first(),
      ).toBeVisible();
    });

    test('favorites when logged out', async ({page}) => {
      await page.goto('/favorites');

      await expect(
        page.getByRole('heading', {name: t.favoritesLogin}),
      ).toBeVisible();
    });

    test('not found page', async ({page}) => {
      const response = await page.goto('/this-page-does-not-exist');

      expect(response?.status()).toBe(404);
      await expect(page.locator('html')).toHaveAttribute('lang', t.tag);
      await expect(
        page.getByRole('heading', {level: 1, name: t.notFound}),
      ).toBeVisible();
    });
  });
}
