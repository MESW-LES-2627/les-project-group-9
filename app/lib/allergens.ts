import {normalizeValue, parseListMetafield} from '~/lib/metafields';
import {ALLERGY_OPTIONS} from '~/lib/profile/preferences';

export type Allergen = (typeof ALLERGY_OPTIONS)[number];

const ALLOWED_ALLERGENS = new Set<string>(ALLERGY_OPTIONS);

/** Product allergens, filtered to the values the profile understands. */
export function parseProductAllergens(value?: string | null): Allergen[] {
  return parseListMetafield(value).filter((value): value is Allergen =>
    ALLOWED_ALLERGENS.has(value),
  );
}

/** Allergens shared by the product and the shopper's profile. */
export function matchingAllergens(
  productAllergens: readonly Allergen[],
  myAllergies?: readonly string[] | null,
): Allergen[] {
  if (!myAllergies?.length) return [];

  const mine = new Set(myAllergies.map(normalizeValue));
  return productAllergens.filter((allergen) => mine.has(allergen));
}
