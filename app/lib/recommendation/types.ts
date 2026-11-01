export type PreferenceProfile = {
  allergies?: string[];
  skin?: {
    tone?: string;
    undertone?: string;
  };
  ringSizes?: Record<string, string>;
  preferredMaterials?: string[];
  preferredColors?: string[];
  preferredGemstones?: string[];
};

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

export type PreferenceSignal = {
  trait: TraitKey;
  values: string[];
  polarity: 'positive' | 'negative';
  weight: number;
  reason: string;
};

export type RecommendationResult = {
  id: string;
  score: number;
  reasons: string[];
};

export type RecommendationInput = {
  products: ProductTraits[];
  favorites: ProductTraits[];
  preferences?: PreferenceProfile | null;
  limit?: number;
};
