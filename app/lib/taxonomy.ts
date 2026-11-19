/**
 * Language-independent Shopify taxonomy gates.
 *
 * Shopify localises `ProductCategory.name` (`Earrings` → `Brincos` →
 * `Boucles d’oreilles`), so matching display text breaks as soon as the
 * shopper changes language. These gates match the taxonomy GID instead, which
 * is the same in every language; the English name is only a fallback for
 * callers that do not have an id (mocks, older fragments).
 */

export type ProductCategory = {
  id?: string | null;
  name?: string | null;
};

/** Shopify taxonomy GIDs for the categories the storefront behaves on. */
export const TAXONOMY_CATEGORY = {
  earrings: 'gid://shopify/TaxonomyCategory/aa-6-6',
  necklaces: 'gid://shopify/TaxonomyCategory/aa-6-8',
  rings: 'gid://shopify/TaxonomyCategory/aa-6-9',
} as const;

export type TaxonomyCategory = keyof typeof TAXONOMY_CATEGORY;

/** English names, kept so the gates still work without an id. */
const ENGLISH_NAMES: Record<TaxonomyCategory, readonly string[]> = {
  earrings: ['earring', 'earrings'],
  necklaces: ['necklace', 'necklaces'],
  rings: ['rings'],
};

/** True when the product belongs to the given taxonomy category. */
export function matchesCategory(
  category: ProductCategory | null | undefined,
  key: TaxonomyCategory,
): boolean {
  if (!category) return false;

  const id = category.id?.trim();
  if (id) return id === TAXONOMY_CATEGORY[key];

  const name = category.name?.trim().toLowerCase();
  return name ? ENGLISH_NAMES[key].includes(name) : false;
}
