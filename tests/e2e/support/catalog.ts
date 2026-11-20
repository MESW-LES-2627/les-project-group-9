import {expect, type Page} from '@playwright/test';

/** How many collection products to inspect before declaring a feature absent. */
const MAX_PRODUCTS = 20;

export type CatalogProductLink = {
  href: string;
  variantId: string;
  title: string;
};

/**
 * Product links from the all-products collection. Client hydration can cause a
 * navigation right after the first load, which destroys the evaluate context;
 * retry once the page has settled.
 */
export async function productLinks(page: Page): Promise<string[]> {
  await page.goto('/collections/all');

  const links = page.locator('a[href^="/products/"]');
  await expect(links.first()).toBeVisible();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await links.evaluateAll((items) =>
        Array.from(
          new Set(
            items
              .map((item) => item.getAttribute('href') ?? '')
              .filter((href) => href.startsWith('/products/')),
          ),
        ),
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !/Execution context was destroyed/.test(error.message)
      ) {
        throw error;
      }

      await page.waitForLoadState('load');
    }
  }

  throw new Error('Could not read the product links');
}

/**
 * Finds up to `count` products with distinct selected variants that match the
 * requested try-on capability. `null`/a shorter list means the active store
 * does not have enough products, so store-dependent tests can skip.
 */
export async function findProducts(
  page: Page,
  options: {tryOn: boolean; count: number},
): Promise<CatalogProductLink[]> {
  const hrefs = await productLinks(page);
  const matches: CatalogProductLink[] = [];
  const seenVariants = new Set<string>();

  for (const href of hrefs.slice(0, MAX_PRODUCTS)) {
    await page.goto(href);

    const tryOnButtons = page.getByRole('button', {name: 'Try on'});
    const hasTryOn = (await tryOnButtons.count()) > 0;

    if (hasTryOn !== options.tryOn) continue;

    const variantId = await page
      .locator('[data-selected-variant-id]')
      .first()
      .getAttribute('data-selected-variant-id');

    if (!variantId || seenVariants.has(variantId)) continue;

    seenVariants.add(variantId);
    matches.push({
      href,
      variantId,
      title: await page.getByRole('heading', {level: 1}).innerText(),
    });

    if (matches.length >= options.count) break;
  }

  return matches;
}

/**
 * Opens the first product that matches the requested try-on capability and
 * returns its selected variant id.
 */
export async function openProduct(
  page: Page,
  options: {tryOn: boolean},
): Promise<CatalogProductLink | null> {
  const [product] = await findProducts(page, {...options, count: 1});

  if (!product) return null;

  await page.goto(product.href);
  return product;
}
