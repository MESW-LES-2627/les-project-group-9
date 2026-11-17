import type {PreferenceProfile} from '~/lib/profile/types';
import {RecommendationEngine} from './engine';
import {
  FavoritesSignalSource,
  PreferencesSignalSource,
} from './signal-source';
import type {ProductTraits} from './types';

type RankOptions = {
  favorites?: ProductTraits[];
  preferences?: PreferenceProfile | null;
};

/**
 * Orders products by how well they match the customer's preferences and
 * favorites, keeping every product. Products with no positive match keep their
 * original relative order after the matches; products that match an allergy
 * signal move to the end.
 */
export function rankProductIds(
  products: ProductTraits[],
  {favorites = [], preferences = null}: RankOptions = {},
): string[] {
  const engine = new RecommendationEngine([
    new FavoritesSignalSource(favorites),
    new PreferencesSignalSource(preferences),
  ]);

  const ranked = engine
    .recommend(products, products.length)
    .map((result) => result.id);
  const seen = new Set(ranked);

  return [
    ...ranked,
    ...products
      .filter((product) => !seen.has(product.id))
      .map((product) => product.id),
  ];
}
