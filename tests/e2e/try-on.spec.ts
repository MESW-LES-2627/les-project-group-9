import {expect, test, type Page} from '@playwright/test';
import {openProduct, productLinks} from './support/catalog';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/** Opens the first product of the collection (the gate test) and returns its href. */
async function openFirstProduct(page: Page) {
  const href = (await productLinks(page))[0];

  await page.goto(href!);

  return href!;
}

test('products without a transparent try-on overlay do not offer try-on', async ({
  page,
}) => {
  // Only meaningful against the CI catalog (mock.shop), which has no jewellery
  // overlays. Set PUBLIC_STORE_DOMAIN=mock.shop to run it locally.
  test.skip(
    process.env.PUBLIC_STORE_DOMAIN !== 'mock.shop',
    'Runs against the mock catalog used by CI',
  );

  const href = await openFirstProduct(page);

  await expect(page.getByRole('button', {name: 'Try on'})).toHaveCount(0);
  expect(href).toMatch(/^\/products\//);
});

test('a computer shows a QR code for the try-on', async ({page}) => {
  const product = await openProduct(page, {tryOn: true});

  test.skip(
    product === null,
    'The active store has no earring/necklace with a transparent overlay metafield',
  );

  await page.getByRole('button', {name: 'Try on'}).click();

  const dialog = page.getByRole('dialog', {name: 'Try it on your phone'});

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img')).toBeVisible();
  await expect(
    dialog.getByRole('link', {name: 'Open the try-on link'}),
  ).toHaveAttribute('href', /[?&]tryOn=1/);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('a ?tryOn=1 link opens the try-on and clears the parameter', async ({
  page,
}) => {
  const product = await openProduct(page, {tryOn: true});

  test.skip(
    product === null,
    'The active store has no earring/necklace with a transparent overlay metafield',
  );

  await page.goto(`${product!.href}?tryOn=1`);

  await expect(
    page.getByRole('dialog', {name: 'Try it on your phone'}),
  ).toBeVisible();
  await expect(page).toHaveURL((url) => !url.searchParams.has('tryOn'));
});

test.describe('phone', () => {
  test.use({
    userAgent: IPHONE,
    viewport: {width: 390, height: 844},
    hasTouch: true,
  });

  test('the try-on opens the camera dialog and falls back when denied', async ({
    page,
  }) => {
    // Answer the permission request locally so the test never prompts and can
    // assert the documented fallback path.
    await page.addInitScript(() => {
      const mediaDevices = navigator.mediaDevices;
      if (mediaDevices) {
        mediaDevices.getUserMedia = () =>
          Promise.reject(
            Object.assign(new Error('denied'), {name: 'NotAllowedError'}),
          );
      }
    });

    const product = await openProduct(page, {tryOn: true});

    test.skip(
      product === null,
      'The active store has no earring/necklace with a transparent overlay metafield',
    );

    await page.getByRole('button', {name: 'Try on'}).click();

    await expect(page.getByRole('dialog', {name: /^Try on /})).toBeVisible();
    await expect(
      page.getByText('Camera access is off. Upload a photo instead.'),
    ).toBeVisible({timeout: 60_000});
    await expect(page.getByLabel('Upload a photo')).toBeVisible();
  });
});
