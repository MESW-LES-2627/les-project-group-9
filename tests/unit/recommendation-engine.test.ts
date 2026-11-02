import {describe, expect, it} from 'vitest';
import {recommendProducts} from '../../app/lib/recommendation/engine';
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

describe('recommendProducts', () => {
  it('returns no suggestions when there are no favorites', () => {
    expect(
      recommendProducts({
        products: [traits('a', {material: ['gold']})],
        favorites: [],
      }),
    ).toEqual([]);
  });

  it('never recommends a favorited product', () => {
    const favorite = traits('favorite', {material: ['gold']});
    const results = recommendProducts({
      products: [favorite],
      favorites: [favorite],
    });

    expect(results).toEqual([]);
  });

  it('ranks a matching material above an unrelated product', () => {
    const favorite = traits('favorite', {material: ['gold-plated']});
    const materialMatch = traits('material-match', {
      material: ['gold-plated'],
    });
    const unrelated = traits('unrelated', {category: ['category-ring']});

    const results = recommendProducts({
      products: [unrelated, materialMatch],
      favorites: [favorite],
    });

    expect(results.map((result) => result.id)).toEqual([
      'material-match',
    ]);
    expect(results[0].reasons).toContain('Same material: gold plated');
  });

  it('matches the standard category', () => {
    const favorite = traits('favorite', {category: ['category-ring']});
    const candidate = traits('candidate', {category: ['category-ring']});

    const results = recommendProducts({
      products: [candidate],
      favorites: [favorite],
    });

    expect(results[0].id).toBe('candidate');
    expect(results[0].reasons).toContain('Similar jewellery category');
  });

  it('falls back to popular products when nothing matches', () => {
    const favorite = traits('favorite', {material: ['gold-plated']});
    const first = traits('first');
    const second = traits('second');

    const results = recommendProducts({
      products: [first, second],
      favorites: [favorite],
      limit: 2,
    });

    expect(results.map((result) => result.id)).toEqual([
      'first',
      'second',
    ]);
    expect(results[0].reasons).toEqual(['Popular piece']);
  });

  it('excludes products that match an allergy', () => {
    const favorite = traits('favorite', {material: ['gold-plated']});
    const risky = traits('risky', {allergens: ['nickel']});
    const safe = traits('safe', {allergens: ['latex']});

    const results = recommendProducts({
      products: [risky, safe],
      favorites: [favorite],
      preferences: {allergies: ['nickel']},
    });

    expect(results.map((result) => result.id)).toEqual(['safe']);
  });

  it('uses explicit preferences as positive signals', () => {
    const favorite = traits('favorite');
    const candidate = traits('candidate', {material: ['gold-plated']});

    const results = recommendProducts({
      products: [candidate],
      favorites: [favorite],
      preferences: {preferredMaterials: ['gold-plated']},
    });

    expect(results[0].id).toBe('candidate');
    expect(results[0].reasons).toContain('Matches your preferred materials');
  });

  it('uses undertone preferences', () => {
    const favorite = traits('favorite');
    const warm = traits('warm', {undertones: ['warm']});
    const cool = traits('cool', {undertones: ['cool']});

    const results = recommendProducts({
      products: [cool, warm],
      favorites: [favorite],
      preferences: {skin: {undertone: 'warm'}},
    });

    expect(results[0].id).toBe('warm');
    expect(results[0].reasons).toContain('Matches your undertone');
  });

  it('supports a new preference through the registry', () => {
    const favorite = traits('favorite');
    const candidate = traits('candidate', {gemstones: ['moonstone']});

    const results = recommendProducts({
      products: [candidate],
      favorites: [favorite],
      preferences: {preferredGemstones: ['moonstone']},
    });

    expect(results[0].id).toBe('candidate');
    expect(results[0].reasons).toContain('Matches your preferred gemstones');
  });

  it('respects the limit', () => {
    const favorite = traits('favorite', {material: ['gold-plated']});
    const candidates = ['a', 'b', 'c'].map((id) =>
      traits(id, {material: ['gold-plated']}),
    );

    const results = recommendProducts({
      products: candidates,
      favorites: [favorite],
      limit: 2,
    });

    expect(results).toHaveLength(2);
  });
});
