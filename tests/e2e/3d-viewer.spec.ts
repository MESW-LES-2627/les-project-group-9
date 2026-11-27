import {expect, test, type Page} from '@playwright/test';
import {productLinks} from './support/catalog';

/** How many collection products to inspect before declaring a feature absent. */
const MAX_PRODUCTS = 20;

/** The first product of the collection that renders a 3D viewer, or null. */
async function findProductWithModel(page: Page): Promise<string | null> {
  const hrefs = await productLinks(page);

  for (const href of hrefs.slice(0, MAX_PRODUCTS)) {
    await page.goto(href);
    // The 3D entry is server-rendered, so it is present before hydration;
    // the <model-viewer> element itself only appears after the chunk loads.
    const has3dEntry =
      (await page.getByRole('button', {name: 'Show the 3D view'}).count()) > 0;
    if (has3dEntry) return href;
  }

  return null;
}

test('a product with a 3D model opens on the photos and the 3D entry shows the viewer', async ({
  page,
}) => {
  const href = await findProductWithModel(page);

  test.skip(!href, 'The active catalog has no product with a 3D model');

  // The page opens on the photos (owner decision, 2026-11-26, overriding
  // US-011's AC1); the viewer is opt-in through the 3D entry.
  await expect(page.locator('model-viewer')).toHaveCount(0);

  const entry = page.getByRole('button', {name: 'Show the 3D view'});
  await expect(entry).toBeVisible();
  await entry.click();

  const viewer = page.locator('model-viewer');
  await expect(viewer).toBeAttached({timeout: 20_000});
  await expect(viewer).toHaveAttribute('src', /\.glb($|\?)/);

  // The model really loads (AC1): model-viewer exposes `loaded`.
  await page.waitForFunction(
    () => {
      const viewer = document.querySelector('model-viewer');
      return Boolean(viewer && viewer.loaded);
    },
    null,
    {timeout: 60_000},
  );

  const box = await viewer.boundingBox();
  expect(box).not.toBeNull();

  // AC2: dragging rotates the model around. The orbit is compared before and
  // after the drag; model-viewer reports it through getCameraOrbit().
  const orbitBefore = await page.evaluate<string | null>(() => {
    const viewer = document.querySelector('model-viewer') as {
      getCameraOrbit?: () => unknown;
    } | null;
    return viewer?.getCameraOrbit ? String(viewer.getCameraOrbit()) : null;
  });
  expect(orbitBefore).not.toBeNull();

  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 160, cy + 60, {steps: 12});
  await page.mouse.up();
  await page.waitForTimeout(400);

  const orbitAfter = await page.evaluate<string | null>(() => {
    const viewer = document.querySelector('model-viewer') as {
      getCameraOrbit?: () => unknown;
    } | null;
    return viewer?.getCameraOrbit ? String(viewer.getCameraOrbit()) : null;
  });
  expect(orbitAfter).not.toBeNull();
  expect(orbitAfter).not.toBe(orbitBefore);

  // AC2: the wheel zooms in on the model (a smaller field of view).
  const fovBefore = await page.evaluate<number | null>(() => {
    const viewer = document.querySelector('model-viewer') as {
      getFieldOfView?: () => unknown;
    } | null;
    return viewer?.getFieldOfView ? Number(viewer.getFieldOfView()) : null;
  });
  expect(fovBefore).not.toBeNull();

  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(400);

  const fovAfter = await page.evaluate<number | null>(() => {
    const viewer = document.querySelector('model-viewer') as {
      getFieldOfView?: () => unknown;
    } | null;
    return viewer?.getFieldOfView ? Number(viewer.getFieldOfView()) : null;
  });
  expect(fovAfter).not.toBeNull();
  expect(fovAfter!).toBeLessThan(fovBefore!);
});

test('a product without a model keeps the image gallery', async ({page}) => {
  const hrefs = await productLinks(page);
  const withoutModel: string[] = [];

  for (const href of hrefs.slice(0, MAX_PRODUCTS)) {
    await page.goto(href);
    if (
      (await page.getByRole('button', {name: 'Show the 3D view'}).count()) === 0
    ) {
      withoutModel.push(href);
      break;
    }
  }

  test.skip(
    withoutModel.length === 0,
    'Every inspected product has a 3D model; nothing to compare',
  );

  await page.goto(withoutModel[0]);

  await expect(page.locator('model-viewer')).toHaveCount(0);
  await expect(
    page.getByRole('button', {name: 'Show the 3D view'}),
  ).toHaveCount(0);
  await expect(page.getByRole('img').first()).toBeVisible();
});
