import {describe, expect, it, vi} from 'vitest';
import type {Route} from '../../app/routes/+types/fitting-room';

vi.mock('~/lib/variants.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/variants.server')>();
  return {...actual, loadVariantsByIds: vi.fn()};
});

import {loader} from '../../app/routes/fitting-room';
import {loadVariantsByIds} from '~/lib/variants.server';
import type {CatalogVariant} from '~/lib/variants.server';

type LoaderArgs = Parameters<typeof loader>[0];

const EARRING_ID = 'gid://shopify/ProductVariant/1';
const RING_ID = 'gid://shopify/ProductVariant/2';
const OVERLAY = 'https://cdn.shopify.com/files/earring.png?v=1';

function variant(
  id: string,
  category: string,
  withOverlay: boolean,
): CatalogVariant {
  return {
    id,
    title: 'Clear',
    availableForSale: true,
    image: {url: '/piece.jpg', altText: 'Piece'},
    selectedOptions: [{name: 'Color', value: 'Clear'}],
    price: {amount: '38.0', currencyCode: 'EUR'},
    product: {
      id: `gid://shopify/Product/${id.split('/').at(-1)}`,
      title: category === 'Earrings' ? 'Aura Earrings' : 'Solstice Ring',
      handle: category.toLowerCase(),
      priceRange: {minVariantPrice: {amount: '38.0', currencyCode: 'EUR'}},
      category: {name: category},
    },
    tryOnOverlay: withOverlay ? {reference: {image: {url: OVERLAY}}} : null,
    tryOnSize: {value: '2'},
  };
}

function contextWith() {
  return {
    storefront: {i18n: {language: 'EN', country: 'US'}},
  } as unknown as LoaderArgs['context'];
}

function callLoader(
  context: LoaderArgs['context'],
  ids = `${EARRING_ID},${RING_ID}`,
  userAgent?: string,
) {
  return loader({
    request: new Request(
      `http://localhost/fitting-room?ids=${encodeURIComponent(ids)}`,
      {headers: userAgent ? {'user-agent': userAgent} : undefined},
    ),
    context,
    params: {},
  } as LoaderArgs);
}

describe('GET /fitting-room', () => {
  it('lists pieces without a model instead of hiding them', async () => {
    vi.mocked(loadVariantsByIds).mockResolvedValue([
      variant(EARRING_ID, 'Earrings', true),
      variant(RING_ID, 'Rings', false),
    ]);

    const result = (await callLoader(contextWith())) as {
      pieces: Array<{variantId: string; tryOn: unknown}>;
      isMobile: boolean;
    };

    expect(result.pieces).toHaveLength(2);
    expect(result.pieces[0].tryOn).toMatchObject({
      id: EARRING_ID,
      kind: 'earring',
    });
    expect(result.pieces[1].tryOn).toBe(null);
    expect(result.isMobile).toBe(false);
  });

  it('detects a phone request', async () => {
    vi.mocked(loadVariantsByIds).mockResolvedValue([]);

    const result = (await callLoader(
      contextWith(),
      `${EARRING_ID},${RING_ID}`,
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    )) as {isMobile: boolean};

    expect(result.isMobile).toBe(true);
  });
});
