import {expect, test, type Page} from '@playwright/test';

function homeLink(page: Page) {
  return page.getByRole('banner').getByRole('link', {name: /— home$/});
}

async function backHomeThroughHeader(page: Page) {
  await homeLink(page).click();

  await expect(page).toHaveURL((url) => url.pathname === '/');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
});

test('home page loads', async ({page}) => {
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('the hero banner opens a collection and the header goes back home', async ({
  page,
}) => {
  await page
    .getByRole('link', {name: /^Explore /})
    .filter({has: page.locator('img')})
    .click();

  await expect(page).toHaveURL(/\/collections\//);

  await backHomeThroughHeader(page);
});

test('every featured product opens its page and the header goes back home', async ({
  page,
}) => {
  test.setTimeout(120_000);

  const featured = page.getByRole('region', {name: 'Currently coveted'});
  const hrefs = await featured
    .locator('a[href^="/products/"]')
    .evaluateAll((links) => [
      ...new Set(links.map((link) => link.getAttribute('href')!)),
    ]);

  expect(hrefs.length).toBeGreaterThan(0);

  for (const href of hrefs) {
    const handle = href.split('?')[0];

    await featured.locator(`a[href="${href}"]`).first().click();

    await expect(page).toHaveURL((url) => url.pathname === handle);
    await expect(
      page.getByRole('button', {name: /^(Add to bag|Sold out)$/}),
    ).toBeVisible();

    await backHomeThroughHeader(page);
  }
});
