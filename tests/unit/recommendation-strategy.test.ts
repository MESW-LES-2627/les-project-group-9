import {describe, expect, it} from 'vitest';
import {RecommendationEngine} from '../../app/lib/recommendation/engine';
import {
  FavoritesSignalSource,
  PreferencesSignalSource,
  type SignalSource,
} from '../../app/lib/recommendation/signal-source';
import type {
  PreferenceSignal,
  ProductTraits,
} from '../../app/lib/recommendation/types';

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

/** A source with fixed signals, standing in for any future kind of signal. */
class FixedSignalSource implements SignalSource {
  readonly #signals: PreferenceSignal[];

  constructor(signals: PreferenceSignal[]) {
    this.#signals = signals;
  }

  collect(): PreferenceSignal[] {
    return this.#signals;
  }
}

const likesMoonstone: PreferenceSignal = {
  trait: 'gemstones',
  values: ['moonstone'],
  polarity: 'positive',
  weight: 5,
  reason: {code: 'preferredGemstones'},
};

describe('FavoritesSignalSource', () => {
  it('turns favorite traits into positive signals', () => {
    const signals = new FavoritesSignalSource([
      traits('favorite', {material: ['gold-plated']}),
    ]).collect();

    expect(signals).toContainEqual(
      expect.objectContaining({
        trait: 'material',
        values: ['gold-plated'],
        polarity: 'positive',
      }),
    );
  });

  it('has no signals without favorites', () => {
    expect(new FavoritesSignalSource([]).collect()).toEqual([]);
  });
});

describe('PreferencesSignalSource', () => {
  it('turns an allergy into a negative signal', () => {
    const signals = new PreferencesSignalSource({
      allergies: ['nickel'],
    }).collect();

    expect(signals).toContainEqual(
      expect.objectContaining({
        trait: 'allergens',
        values: ['nickel'],
        polarity: 'negative',
      }),
    );
  });

  it('has no signals without preferences', () => {
    expect(new PreferencesSignalSource(null).collect()).toEqual([]);
    expect(new PreferencesSignalSource(undefined).collect()).toEqual([]);
  });
});

describe('RecommendationEngine', () => {
  it('scores products with a new signal source, without changing the engine', () => {
    const engine = new RecommendationEngine([
      new FixedSignalSource([likesMoonstone]),
    ]);

    const results = engine.recommend([
      traits('pearl', {gemstones: ['pearl']}),
      traits('moonstone', {gemstones: ['moonstone']}),
    ]);

    expect(results).toEqual([
      {id: 'moonstone', score: 5, reasons: [{code: 'preferredGemstones'}]},
    ]);
  });

  it('adds up the weights of signals from several sources', () => {
    const engine = new RecommendationEngine([
      new FixedSignalSource([likesMoonstone]),
      new PreferencesSignalSource({preferredMaterials: ['silver']}),
    ]);

    const [result] = engine.recommend([
      traits('both', {gemstones: ['moonstone'], material: ['silver']}),
    ]);

    expect(result.score).toBe(5 + 4);
    expect(result.reasons).toEqual([
      {code: 'preferredGemstones'},
      {code: 'preferredMaterials'},
    ]);
  });

  it('never recommends excluded products', () => {
    const engine = new RecommendationEngine(
      [new FixedSignalSource([likesMoonstone])],
      {excludedIds: ['moonstone']},
    );

    expect(
      engine.recommend([traits('moonstone', {gemstones: ['moonstone']})]),
    ).toEqual([]);
  });

  it('excludes products matching a negative signal from any source', () => {
    const engine = new RecommendationEngine([
      new FixedSignalSource([likesMoonstone]),
      new PreferencesSignalSource({allergies: ['nickel']}),
    ]);

    const results = engine.recommend([
      traits('risky', {gemstones: ['moonstone'], allergens: ['nickel']}),
      traits('safe', {gemstones: ['moonstone']}),
    ]);

    expect(results.map((result) => result.id)).toEqual(['safe']);
  });

  it('returns popular products only when the fallback is enabled', () => {
    const products = [traits('first'), traits('second')];
    const sources = [new FixedSignalSource([likesMoonstone])];

    expect(new RecommendationEngine(sources).recommend(products)).toEqual([]);
    expect(
      new RecommendationEngine(sources, {fallbackToPopular: true}).recommend(
        products,
        1,
      ),
    ).toEqual([{id: 'first', score: 0, reasons: [{code: 'popular'}]}]);
  });

  it('returns nothing for a limit below one', () => {
    const engine = new RecommendationEngine(
      [new FixedSignalSource([likesMoonstone])],
      {fallbackToPopular: true},
    );

    expect(
      engine.recommend([traits('moonstone', {gemstones: ['moonstone']})], 0),
    ).toEqual([]);
  });
});
