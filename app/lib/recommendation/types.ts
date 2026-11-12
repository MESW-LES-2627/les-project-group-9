import type {PreferenceProfile} from '~/lib/profile/types';

export type TraitKey =
  | 'collections'
  | 'material'
  | 'metal'
  | 'category'
  | 'gemstones'
  | 'gemColors'
  | 'skinTones'
  | 'undertones'
  | 'allergens';

export type ProductTraits = {
  id: string;
  collections: string[];
  category: string[];
  material: string[];
  metal: string[];
  gemstones: string[];
  gemColors: string[];
  skinTones: string[];
  undertones: string[];
  allergens: string[];
};

/**
 * Why a product was recommended. `code` is translated in the UI
 * (`recommendation.reason.<code>` in app/lib/messages); `value` is a catalog
 * value (a normalized metafield such as "gold plated") shown as it is.
 */
export type ReasonCode =
  | 'allergy'
  | 'preferredMaterials'
  | 'preferredColors'
  | 'preferredGemstones'
  | 'skinTone'
  | 'undertone'
  | 'sameMaterial'
  | 'sameMetal'
  | 'similarCategory'
  | 'sameCollection'
  | 'sameGemstone'
  | 'sameGemColor'
  | 'similarFavorite'
  | 'popular';

export type RecommendationReason = {code: ReasonCode; value?: string};

export type PreferenceSignal = {
  trait: TraitKey;
  values: string[];
  polarity: 'positive' | 'negative';
  weight: number;
  reason: RecommendationReason;
};

export type RecommendationResult = {
  id: string;
  score: number;
  reasons: RecommendationReason[];
};

export type RecommendationInput = {
  products: ProductTraits[];
  favorites: ProductTraits[];
  preferences?: PreferenceProfile | null;
  limit?: number;
};
