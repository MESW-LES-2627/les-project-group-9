import {matchesCategory, type ProductCategory} from '~/lib/taxonomy';

/**
 * True when the product's category is Rings. Matched by taxonomy id so it also
 * works when Shopify returns the localized category name (`Anéis`, `Bagues`).
 */
export function isRingProduct(product: {
  category?: ProductCategory | null;
}): boolean {
  return matchesCategory(product.category, 'rings');
}
