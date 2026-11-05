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
  await page.goto('/search?q=zzqxwvnomatch');

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
