import {describe, expect, it} from 'vitest';
import {rankProductIds} from '../../app/lib/recommendation/rank';
import type {ProductTraits} from '../../app/lib/recommendation/types';

function traits(
  id: string,
  overrides: Partial<ProductTraits> = {},
): ProductTraits {
  return {
    id,
    collections: [],
    category: [],
    material: [],
    metal: [],
    gemstones: [],
    gemColors: [],
    skinTones: [],
    undertones: [],
    allergens: [],
    ...overrides,
  };
}

describe('rankProductIds', () => {
  it('moves preference matches first and keeps the rest in order', () => {
    const products = [
      traits('plain'),
      traits('silver', {metal: ['silver']}),
      traits('gold', {metal: ['gold']}),
    ];

    expect(
      rankProductIds(products, {preferences: {preferredColors: ['gold']}}),
    ).toEqual(['gold', 'plain', 'silver']);
  });

  it('keeps every product, including the ones that match an allergy', () => {
    const products = [
      traits('nickel', {allergens: ['nickel']}),
      traits('gold', {metal: ['gold']}),
      traits('plain'),
    ];

    expect(
      rankProductIds(products, {
        preferences: {preferredColors: ['gold'], allergies: ['nickel']},
      }),
    ).toEqual(['gold', 'nickel', 'plain']);
  });

  it('preserves the original order without preferences or favorites', () => {
    const products = [traits('a'), traits('b'), traits('c')];

    expect(rankProductIds(products)).toEqual(['a', 'b', 'c']);
  });

  it('boosts products that share a favorite trait', () => {
    const products = [
      traits('linen'),
      traits('gold-plated', {material: ['gold-plated']}),
    ];

    expect(
      rankProductIds(products, {
        favorites: [traits('favorite', {material: ['gold-plated']})],
      }),
    ).toEqual(['gold-plated', 'linen']);
  });

  it('returns an empty list for an empty catalog', () => {
    expect(rankProductIds([])).toEqual([]);
  });
});
