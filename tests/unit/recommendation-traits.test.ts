import {describe, expect, it} from 'vitest';
import type {CatalogProductWithTraits} from '~/lib/jeweliette-catalog';
import {toProductTraits} from '../../app/lib/recommendation/traits';

function product(
  overrides: Partial<CatalogProductWithTraits> = {},
): CatalogProductWithTraits {
  return {
    id: 'gid://shopify/Product/1',
    title: 'Gold Butterfly Earrings',
    handle: 'gold-butterfly-earrings',
    priceRange: {
      minVariantPrice: {amount: '1.00', currencyCode: 'EUR'},
    },
    ...overrides,
  };
}

describe('toProductTraits', () => {
  it('reads the standard category and custom metafields', () => {
    const traits = toProductTraits(
      product({
        category: {
          id: 'gid://shopify/TaxonomyCategory/aa-6-6',
          name: 'Brincos',
        },
        material: {value: 'gold plated'},
        metal: {value: 'gold'},
        gemstone: {value: '["zirconia"]'},
        gemColor: {value: '["white"]'},
        collections: {nodes: [{handle: 'frontpage'}]},
      }),
    );

    expect(traits.category).toEqual([
      'gid-shopify-taxonomycategory-aa-6-6',
    ]);
    expect(traits.material).toEqual(['gold-plated']);
    expect(traits.metal).toEqual(['gold']);
    expect(traits.gemstones).toEqual(['zirconia']);
    expect(traits.gemColors).toEqual(['white']);
    expect(traits.collections).toEqual(['frontpage']);
  });

  it('parses a list metafield with multiple values', () => {
    const traits = toProductTraits(
      product({
        gemstone: {value: '["mother-of-pearl", "zirconia"]'},
      }),
    );

    expect(traits.gemstones).toEqual(['mother-of-pearl', 'zirconia']);
  });

  it('returns empty arrays when a product has no traits', () => {
    const traits = toProductTraits(product({title: 'Mystery Piece'}));

    expect(traits.category).toEqual([]);
    expect(traits.material).toEqual([]);
    expect(traits.metal).toEqual([]);
    expect(traits.gemstones).toEqual([]);
  });
});
