import {
  FavoritesSignalSource,
  PreferencesSignalSource,
  type SignalSource,
} from './signal-source';
import type {
  PreferenceSignal,
  ProductTraits,
  RecommendationReason,
  RecommendationInput,
  RecommendationResult,
} from './types';

function matches(product: ProductTraits, signal: PreferenceSignal): boolean {
  const productValues = product[signal.trait];
  return signal.values.some((value) => productValues.includes(value));
}

export type RecommendationEngineOptions = {
  excludedIds?: Iterable<string>;
  fallbackToPopular?: boolean;
};


export class RecommendationEngine {
  readonly #sources: SignalSource[];
  readonly #excludedIds: Set<string>;
  readonly #fallbackToPopular: boolean;

  constructor(
    sources: SignalSource[],
    {excludedIds = [], fallbackToPopular = false}: RecommendationEngineOptions = {},
  ) {
    this.#sources = sources;
    this.#excludedIds = new Set(excludedIds);
    this.#fallbackToPopular = fallbackToPopular;
  }


  recommend(products: ProductTraits[], limit = 4): RecommendationResult[] {
    const resultLimit = Math.max(0, Math.floor(limit));
    if (!resultLimit) return [];

    const signals = this.#sources.flatMap((source) => source.collect());
    if (!signals.length && !this.#fallbackToPopular) return [];

    const candidates = this.#candidates(
      products,
      signals.filter((signal) => signal.polarity === 'negative'),
    );
    const selected = this.#rank(
      candidates,
      signals.filter(
        (signal) => signal.polarity === 'positive' && signal.weight > 0,
      ),
      products,
    ).slice(0, resultLimit);

    if (selected.length || !this.#fallbackToPopular) return selected;
    return this.#popular(candidates, resultLimit);
  }

  #candidates(
    products: ProductTraits[],
    negativeSignals: PreferenceSignal[],
  ): ProductTraits[] {
    return products.filter(
      (product) =>
        !this.#excludedIds.has(product.id) &&
        !negativeSignals.some((signal) => matches(product, signal)),
    );
  }

  #rank(
    candidates: ProductTraits[],
    positiveSignals: PreferenceSignal[],
    products: ProductTraits[],
  ): RecommendationResult[] {
    const productOrder = new Map(
      products.map((product, index) => [product.id, index]),
    );

    return candidates
      .map((product) => this.#score(product, positiveSignals))
      .filter((result) => result.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          (productOrder.get(a.id) ?? 0) - (productOrder.get(b.id) ?? 0),
      );
  }

  #score(
    product: ProductTraits,
    positiveSignals: PreferenceSignal[],
  ): RecommendationResult {
    let score = 0;
    const reasons = new Map<string, RecommendationReason>();

    for (const signal of positiveSignals) {
      if (!matches(product, signal)) continue;
      score += signal.weight;
      reasons.set(
        `${signal.reason.code}:${signal.reason.value ?? ''}`,
        signal.reason,
      );
    }

    return {id: product.id, score, reasons: Array.from(reasons.values())};
  }

  #popular(
    candidates: ProductTraits[],
    limit: number,
  ): RecommendationResult[] {
    return candidates.slice(0, limit).map((product) => ({
      id: product.id,
      score: 0,
      reasons: [{code: 'popular'}],
    }));
  }
}


export function recommendProducts({
  products,
  favorites,
  preferences,
  limit = 4,
}: RecommendationInput): RecommendationResult[] {
  const engine = new RecommendationEngine(
    [
      new FavoritesSignalSource(favorites),
      new PreferencesSignalSource(preferences),
    ],
    {
      excludedIds: favorites.map((favorite) => favorite.id),
      fallbackToPopular: favorites.length > 0,
    },
  );

  return engine.recommend(products, limit);
}
