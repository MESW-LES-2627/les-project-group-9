import {normalizeValue} from '~/lib/metafields';
import type {PreferenceProfile} from '~/lib/profile/types';
import type {
  PreferenceSignal,
  ProductTraits,
  RecommendationReason,
  TraitKey,
} from './types';
import {TRAIT_WEIGHTS} from './weights';

type PreferenceSource =
  | 'allergies'
  | 'preferredMaterials'
  | 'preferredColors'
  | 'preferredGemstones'
  | 'skinTone'
  | 'undertone';

export const PREFERENCE_TRAITS: Array<{
  source: PreferenceSource;
  trait: TraitKey;
  polarity: 'positive' | 'negative';
  weight: number;
  reason: RecommendationReason;
}> = [
  {
    source: 'allergies',
    trait: 'allergens',
    polarity: 'negative',
    weight: 1000,
    reason: {code: 'allergy'},
  },
  {
    source: 'preferredMaterials',
    trait: 'material',
    polarity: 'positive',
    weight: 4,
    reason: {code: 'preferredMaterials'},
  },
  {
    source: 'preferredColors',
    trait: 'metal',
    polarity: 'positive',
    weight: 3,
    reason: {code: 'preferredColors'},
  },
  {
    source: 'preferredGemstones',
    trait: 'gemstones',
    polarity: 'positive',
    weight: 2,
    reason: {code: 'preferredGemstones'},
  },
  {
    source: 'skinTone',
    trait: 'skinTones',
    polarity: 'positive',
    weight: 1,
    reason: {code: 'skinTone'},
  },
  {
    source: 'undertone',
    trait: 'undertones',
    polarity: 'positive',
    weight: 2,
    reason: {code: 'undertone'},
  },
];

const FAVORITE_TRAITS: TraitKey[] = [
  'collections',
  'material',
  'metal',
  'category',
  'gemstones',
  'gemColors',
];

/** Reason for a favorite-derived signal; the catalog value is kept for display. */
function reasonForTrait(trait: TraitKey, value: string): RecommendationReason {
  const label = value.replace(/-/g, ' ');

  switch (trait) {
    case 'material':
      return {code: 'sameMaterial', value: label};
    case 'metal':
      return {code: 'sameMetal', value: label};
    case 'category':
      return {code: 'similarCategory'};
    case 'collections':
      return {code: 'sameCollection'};
    case 'gemstones':
      return {code: 'sameGemstone', value: label};
    case 'gemColors':
      return {code: 'sameGemColor', value: label};
    default:
      return {code: 'similarFavorite'};
  }
}

export function signalsFromFavorites(
  favorites: ProductTraits[],
): PreferenceSignal[] {
  if (!favorites.length) return [];

  const signals: PreferenceSignal[] = [];

  for (const trait of FAVORITE_TRAITS) {
    const values = new Set(
      favorites.flatMap((favorite) => favorite[trait]),
    );
    const weight = TRAIT_WEIGHTS[trait];

    if (weight <= 0) continue;

    for (const value of values) {
      signals.push({
        trait,
        values: [value],
        polarity: 'positive',
        weight,
        reason: reasonForTrait(trait, value),
      });
    }
  }

  return signals;
}

function preferenceValues(
  profile: PreferenceProfile,
  source: PreferenceSource,
): string[] {
  switch (source) {
    case 'allergies':
      return profile.allergies ?? [];
    case 'preferredMaterials':
      return profile.preferredMaterials ?? [];
    case 'preferredColors':
      return profile.preferredColors ?? [];
    case 'preferredGemstones':
      return profile.preferredGemstones ?? [];
    case 'skinTone':
      return profile.skin?.tone ? [profile.skin.tone] : [];
    case 'undertone':
      return profile.skin?.undertone ? [profile.skin.undertone] : [];
  }
}

export function signalsFromPreferences(
  profile: PreferenceProfile | null | undefined,
): PreferenceSignal[] {
  if (!profile) return [];

  return PREFERENCE_TRAITS.flatMap((definition) => {
    const values = preferenceValues(profile, definition.source)
      .map(normalizeValue)
      .filter(Boolean);

    if (!values.length) return [];

    return [
      {
        trait: definition.trait,
        values,
        polarity: definition.polarity,
        weight: definition.weight,
        reason: definition.reason,
      },
    ];
  });
}
