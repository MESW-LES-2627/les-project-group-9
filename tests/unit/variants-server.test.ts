import {describe, expect, it, vi} from 'vitest';
import {
  loadVariantsByIds,
  parseVariantIds,
} from '../../app/lib/variants.server';

describe('parseVariantIds', () => {
  it('keeps only variant GIDs', () => {
    expect(
      parseVariantIds(
        'gid://shopify/ProductVariant/1,gid://shopify/Product/2,junk,gid://shopify/ProductVariant/3',
      ),
    ).toEqual([
      'gid://shopify/ProductVariant/1',
      'gid://shopify/ProductVariant/3',
    ]);
  });

  it('handles missing input and caps the list', () => {
    expect(parseVariantIds(null, 2)).toEqual([]);
    expect(
      parseVariantIds(
        Array.from(
          {length: 5},
          (_, index) => `gid://shopify/ProductVariant/${index + 1}`,
        ).join(','),
        3,
      ),
    ).toHaveLength(3);
  });
});

describe('loadVariantsByIds', () => {
  const context = (nodes: unknown[]) =>
    ({storefront: {query: vi.fn().mockResolvedValue({nodes})}}) as never;

  it('returns only variant nodes, preserving query order', async () => {
    const variants = await loadVariantsByIds(
      context([
        {__typename: 'ProductVariant', id: 'gid://shopify/ProductVariant/1'},
        {__typename: 'Product', id: 'gid://shopify/Product/1'},
        null,
        {__typename: 'ProductVariant', id: 'gid://shopify/ProductVariant/2'},
      ]),
      ['gid://shopify/ProductVariant/1', 'gid://shopify/ProductVariant/2'],
    );

    expect(variants.map((variant) => variant.id)).toEqual([
      'gid://shopify/ProductVariant/1',
      'gid://shopify/ProductVariant/2',
    ]);
  });

  it('does not query for an empty list', async () => {
    const storefront = {query: vi.fn()};
    const variants = await loadVariantsByIds({storefront} as never, []);

    expect(variants).toEqual([]);
    expect(storefront.query).not.toHaveBeenCalled();
  });
});
