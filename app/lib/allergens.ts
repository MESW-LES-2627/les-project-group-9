import {normalizeValue, parseListMetafield} from '~/lib/metafields';
import {ALLERGY_OPTIONS} from '~/lib/profile/preferences';
import {en, type Messages} from '~/lib/messages/en';
import {fr} from '~/lib/messages/fr';
import {pt} from '~/lib/messages/pt';

export type Allergen = (typeof ALLERGY_OPTIONS)[number];

/**
 * Shopify returns the translated metafield value (`Zinc` → `Zinco`), so the
 * canonical code cannot be read from the value alone. The alias table is built
 * from the app's own labels for every supported language: one source of truth
 * with the UI, and a new language in `LOCALES` extends it automatically.
 */
const MESSAGE_DICTIONARIES: readonly Messages[] = [en, pt, fr];

function allergenAliases(): Map<string, Allergen> {
  const aliases = new Map<string, Allergen>();

  for (const allergen of ALLERGY_OPTIONS) aliases.set(allergen, allergen);

  for (const messages of MESSAGE_DICTIONARIES) {
    for (const allergen of ALLERGY_OPTIONS) {
      const slug = normalizeValue(messages[`allergen.${allergen}`]);
      if (slug) aliases.set(slug, allergen);
    }
  }

  return aliases;
}

const ALLERGEN_BY_LABEL = allergenAliases();

/** Canonical allergen code for a catalog value in any supported language. */
export function allergenCode(value: string): Allergen | null {
  return ALLERGEN_BY_LABEL.get(normalizeValue(value)) ?? null;
}

/** Product allergens, filtered to the values the profile understands. */
export function parseProductAllergens(value?: string | null): Allergen[] {
  const codes = parseListMetafield(value).flatMap((item) => {
    const code = allergenCode(item);
    return code ? [code] : [];
  });

  return Array.from(new Set(codes));
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
