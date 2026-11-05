import {expect, test, type Page} from '@playwright/test';

function discoverLinks(page: Page) {
  return page
    .getByRole('contentinfo')
    .getByRole('navigation', {name: 'Discover'})
    .getByRole('link');
}

for (const viewport of [
  {name: 'desktop', width: 1280, height: 800},
  {name: 'mobile', width: 375, height: 812},
]) {
  test(`Discover shows each link on its own line (${viewport.name})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const links = discoverLinks(page);

    await expect(links).toHaveText(['All pieces', 'Collections']);

    const allPieces = await links.nth(0).boundingBox();
    const collections = await links.nth(1).boundingBox();

    expect(collections!.y).toBeGreaterThan(allPieces!.y + allPieces!.height);
  });
}

for (const [name, path] of [
  ['All pieces', '/collections/all'],
  ['Collections', '/collections'],
] as const) {
  test(`Discover "${name}" opens ${path}`, async ({page}) => {
    await page.goto('/');

    await discoverLinks(page).getByText(name, {exact: true}).click();

    await expect(page).toHaveURL((url) => url.pathname === path);
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  });
}
