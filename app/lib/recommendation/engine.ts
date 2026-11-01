import {signalsFromFavorites, signalsFromPreferences} from './signals';
import type {
  PreferenceSignal,
  ProductTraits,
  RecommendationInput,
  RecommendationResult,
} from './types';

function matches(product: ProductTraits, signal: PreferenceSignal): boolean {
  const productValues = product[signal.trait];
  return signal.values.some((value) => productValues.includes(value));
}

export function recommendProducts({
  products,
  favorites,
  preferences,
  limit = 4,
}: RecommendationInput): RecommendationResult[] {
  const resultLimit = Math.max(0, Math.floor(limit));

  if (!resultLimit || !favorites.length) return [];

  const favoriteIds = new Set(favorites.map((favorite) => favorite.id));
  const signals = [
    ...signalsFromFavorites(favorites),
    ...signalsFromPreferences(preferences),
  ];
  const negativeSignals = signals.filter(
    (signal) => signal.polarity === 'negative',
  );
  const positiveSignals = signals.filter(
    (signal) => signal.polarity === 'positive' && signal.weight > 0,
  );
  const productOrder = new Map(
    products.map((product, index) => [product.id, index]),
  );

  const candidates = products.filter(
    (product) =>
      !favoriteIds.has(product.id) &&
      !negativeSignals.some((signal) => matches(product, signal)),
  );

  const scored = candidates
    .map((product) => {
      let score = 0;
      const reasons: string[] = [];

      for (const signal of positiveSignals) {
        if (!matches(product, signal)) continue;
        score += signal.weight;
        reasons.push(signal.reason);
      }

      return {
        id: product.id,
        score,
        reasons: Array.from(new Set(reasons)),
      };
    })
    .filter((result) => result.score > 0);

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (productOrder.get(a.id) ?? 0) - (productOrder.get(b.id) ?? 0),
  );

  const selected = scored.slice(0, resultLimit);
  if (selected.length) return selected;

  return candidates.slice(0, resultLimit).map((product) => ({
    id: product.id,
    score: 0,
    reasons: ['Popular piece'],
  }));
}
