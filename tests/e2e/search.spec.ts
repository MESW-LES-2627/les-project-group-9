import {expect, test, type Page} from '@playwright/test';

async function searchTermFromStore(page: Page) {
  await page.goto('/collections/all');
  const href = await page
    .locator('a[href^="/products/"]')
    .first()
    .getAttribute('href');

  await page.goto(href!);

  const title = await page.getByRole('heading', {level: 1}).innerText();
  const word = title.split(/\s+/).find((part) => /^[a-z]{3,}$/i.test(part));

  if (!word) throw new Error(`No searchable word in "${title}"`);

  return word;
}

function expectProductResults(page: Page) {
  return Promise.all([
    expect(page.getByRole('heading', {name: 'Pieces'})).toBeVisible(),
    expect(page.locator('a[href^="/products/"]').first()).toBeVisible(),
  ]);
}

test('the search page asks for a term when none is given', async ({page}) => {
  await page.goto('/search');

  await expect(
    page.getByText('Search for a piece, material or collection.'),
  ).toBeVisible();
});

test('a term with no matches shows the empty state', async ({page}) => {
  // Shopify's search fuzzy-matches loose terms (a nonsense word can still
  // return products); an exact phrase does not.
  await page.goto(`/search?q=${encodeURIComponent('"zzqxwvnomatch"')}`);

  await expect(page.getByRole('heading', {name: 'No results'})).toBeVisible();
});

test('searching from the search page shows matching products', async ({
  page,
}) => {
  const term = await searchTermFromStore(page);

  await page.goto('/search');
  const searchbox = page.getByRole('searchbox', {name: 'Search products'});

  await searchbox.fill(term);
  await searchbox.press('Enter');

  await expect(page).toHaveURL(
    (url) => url.searchParams.get('q') === term,
  );
  await expectProductResults(page);
});

async function openHeaderSearch(page: Page, term: string) {
  await page.goto('/');
  await page.getByRole('banner').getByRole('button', {name: 'Search'}).click();

  const overlay = page.getByRole('dialog', {name: 'Search Jeweliette'});

  await overlay.getByRole('searchbox').fill(term);

  return overlay;
}

test('header suggestions show products as a grid of cards', async ({page}) => {
  const term = await searchTermFromStore(page);
  const overlay = await openHeaderSearch(page, term);

  const pieces = overlay.getByRole('region', {name: 'Pieces'});
  const cards = pieces.getByRole('link');

  await expect(cards.first()).toBeVisible();
  await expect(cards.first().getByRole('img')).toBeVisible();

  if ((await cards.count()) > 1) {
    await expect
      .poll(async () => {
        const first = await cards.nth(0).boundingBox();
        const second = await cards.nth(1).boundingBox();

        return Math.abs(second!.y - first!.y);
      })
      .toBeLessThan(1);
  }
});

test('clicking a suggestion opens the product and closes the panel', async ({
  page,
}) => {
  const term = await searchTermFromStore(page);
  const overlay = await openHeaderSearch(page, term);

  const card = overlay.getByRole('region', {name: 'Pieces'}).getByRole('link').first();
  const path = new URL((await card.getAttribute('href'))!, 'http://x').pathname;

  await card.click();

  await expect(page).toHaveURL((url) => url.pathname === path);
  await expect(overlay).toBeHidden();
});

test('"See all results" in the suggestions opens the search page', async ({
  page,
}) => {
  const term = await searchTermFromStore(page);
  const overlay = await openHeaderSearch(page, term);

  await overlay.getByRole('link', {name: 'See all results'}).click();

  await expect(page).toHaveURL(
    (url) => url.pathname === '/search' && url.searchParams.get('q') === term,
  );
  await expect(overlay).toBeHidden();
});

test('searching from the header opens the search page with results', async ({
  page,
}) => {
  const term = await searchTermFromStore(page);

  await page.goto('/');
  await page.getByRole('banner').getByRole('button', {name: 'Search'}).click();

  const overlay = page.getByRole('dialog', {name: 'Search Jeweliette'});

  await overlay.getByRole('searchbox').fill(term);
  await overlay.getByRole('button', {name: 'See all results'}).click();

  await expect(page).toHaveURL(
    (url) => url.pathname === '/search' && url.searchParams.get('q') === term,
  );
  await expectProductResults(page);
});
