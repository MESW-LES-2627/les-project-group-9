import type {PreferenceProfile} from '~/lib/profile/types';
import {normalizeTraitValue} from './traits';
import type {PreferenceSignal, ProductTraits, TraitKey} from './types';
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
  reason: string;
}> = [
  {
    source: 'allergies',
    trait: 'allergens',
    polarity: 'negative',
    weight: 1000,
    reason: 'Allergy',
  },
  {
    source: 'preferredMaterials',
    trait: 'material',
    polarity: 'positive',
    weight: 4,
    reason: 'Matches your preferred materials',
  },
  {
    source: 'preferredColors',
    trait: 'metal',
    polarity: 'positive',
    weight: 3,
    reason: 'Matches your preferred colours',
  },
  {
    source: 'preferredGemstones',
    trait: 'gemstones',
    polarity: 'positive',
    weight: 2,
    reason: 'Matches your preferred gemstones',
  },
  {
    source: 'skinTone',
    trait: 'skinTones',
    polarity: 'positive',
    weight: 1,
    reason: 'Matches your skin tone',
  },
  {
    source: 'undertone',
    trait: 'undertones',
    polarity: 'positive',
    weight: 2,
    reason: 'Matches your undertone',
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

function labelForTrait(trait: TraitKey, value: string): string {
  const label = value.replace(/-/g, ' ');

  switch (trait) {
    case 'material':
      return `Same material: ${label}`;
    case 'metal':
      return `Same metal: ${label}`;
    case 'category':
      return 'Similar jewellery category';
    case 'collections':
      return 'From the same collection';
    case 'gemstones':
      return `Same gemstone: ${label}`;
    case 'gemColors':
      return `Same gem colour: ${label}`;
    default:
      return 'Similar to your favorites';
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
        reason: labelForTrait(trait, value),
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
      .map(normalizeTraitValue)
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
