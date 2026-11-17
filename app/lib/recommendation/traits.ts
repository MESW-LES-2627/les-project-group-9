import {parseProductAllergens} from '~/lib/allergens';
import type {CatalogProductWithTraits} from '~/lib/jeweliette-catalog';
import {parseProductMaterials} from '~/lib/materials';
import {normalizeValue, parseListMetafield} from '~/lib/metafields';
import {productColorValues} from '~/lib/product-colors';
import type {ProductTraits} from './types';

function undertonesFromMetal(metal: string[]): string[] {
  const undertones = new Set<string>();

  for (const value of metal) {
    if (value.includes('gold')) undertones.add('warm');
    if (value.includes('silver')) undertones.add('cool');
  }

  return Array.from(undertones);
}

export function toProductTraits(
  product: CatalogProductWithTraits,
): ProductTraits {
  const metal = productColorValues(product);

  return {
    id: product.id,
    collections:
      product.collections?.nodes.map((collection) =>
        normalizeValue(collection.handle),
      ) ?? [],
    category: product.category?.id ? [normalizeValue(product.category.id)] : [],
    material: parseProductMaterials(product).map(
      (material) => material.handle,
    ),
    metal,
    gemstones: parseListMetafield(product.gemstone?.value),
    gemColors: parseListMetafield(product.gemColor?.value),
    skinTones: [],
    undertones: undertonesFromMetal(metal),
    allergens: parseProductAllergens(product.allergens?.value),
  };
}
