const RING_CATEGORY_NAME = 'rings';

/** True when the product's category is "Rings" (case-insensitive). */
export function isRingProduct(product: {
  category?: {name: string} | null;
}): boolean {
  return product.category?.name?.trim().toLowerCase() === RING_CATEGORY_NAME;
}
