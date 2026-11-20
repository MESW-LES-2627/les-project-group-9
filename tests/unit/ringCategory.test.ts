import {describe, expect, it} from 'vitest';
import {isRingProduct} from '../../app/lib/profile/ringCategory';

describe('isRingProduct', () => {
  it('matches the Rings category', () => {
    expect(isRingProduct({category: {name: 'Rings'}})).toBe(true);
  });

  it('ignores case and surrounding spaces', () => {
    expect(isRingProduct({category: {name: ' rings '}})).toBe(true);
  });

  it('matches the taxonomy id when Shopify localises the name', () => {
    expect(
      isRingProduct({
        category: {
          id: 'gid://shopify/TaxonomyCategory/aa-6-9',
          name: 'Anéis',
        },
      }),
    ).toBe(true);
    expect(
      isRingProduct({
        category: {
          id: 'gid://shopify/TaxonomyCategory/aa-6-9',
          name: 'Bagues',
        },
      }),
    ).toBe(true);
  });

  it('trusts the id over a stale name', () => {
    expect(
      isRingProduct({
        category: {
          id: 'gid://shopify/TaxonomyCategory/aa-6-6',
          name: 'Rings',
        },
      }),
    ).toBe(false);
  });

  it('rejects other categories', () => {
    expect(isRingProduct({category: {name: 'Necklaces'}})).toBe(false);
    expect(isRingProduct({category: {name: 'Ring'}})).toBe(false);
  });

  it('rejects products without a category', () => {
    expect(isRingProduct({category: null})).toBe(false);
    expect(isRingProduct({})).toBe(false);
  });
});
