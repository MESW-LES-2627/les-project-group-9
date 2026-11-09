import {normalizeValue} from './metafields';

export type CatalogMaterial = {
  handle: string;
  label: string;
};

type MaterialNode = {
  handle?: string | null;
  fields?: Array<{key: string; value?: string | null}> | null;
} | null;

/** Raw shape of a Storefront API `*-material` metafield. */
export type CatalogMaterialsMetafield = {
  references?: {
    nodes: Array<MaterialNode>;
  } | null;
} | null;

/** Fields selected for every supported standard material metafield. */
export type CatalogMaterialsFields = {
  jewelryMaterial?: CatalogMaterialsMetafield;
  watchMaterial?: CatalogMaterialsMetafield;
};

/**
 * Reads the standard Shopify materials metafield. Each entry is a metaobject
 * with a slug `handle` (e.g. gold-plated) and a display `label`.
 */
export function parseMaterials(
  materials?: CatalogMaterialsMetafield,
): CatalogMaterial[] {
  const result: CatalogMaterial[] = [];
  const seen = new Set<string>();

  for (const node of materials?.references?.nodes ?? []) {
    if (!node) continue;

    const handle = node.handle?.trim();
    if (!handle || seen.has(handle)) continue;

    seen.add(handle);
    const label =
      node.fields?.find((field) => field.key === 'label')?.value?.trim() ||
      handle;

    result.push({handle, label});
  }

  return result;
}

export function parseProductMaterials(
  product: CatalogMaterialsFields,
): CatalogMaterial[] {
  const result: CatalogMaterial[] = [];
  const seen = new Set<string>();

  for (const metafield of [product.jewelryMaterial, product.watchMaterial]) {
    for (const material of parseMaterials(metafield)) {
      if (seen.has(material.handle)) continue;
      seen.add(material.handle);
      result.push(material);
    }
  }

  return result;
}

const KNOWN_COLOR_PREFIXES = [
  'gold',
  'silver',
  'rose',
  'bronze',
  'platinum',
  'copper',
  'black',
  'white',
  'yellow',
  'pink',
  'blue',
  'green',
  'red',
  'gunmetal',
];

/**
 * Narrows a product's material list to the selected colour.
 *
 * Shopify's `shopify.jewelry-material` is product-level, so a two-colour piece
 * lists every material together (e.g. gold-plated + silver-plated + stainless
 * steel). Materials whose handle starts with a colour are treated as
 * colour-specific; the rest are composition materials and stay visible for
 * every colour.
 */
export function materialsForColor(
  materials: CatalogMaterial[],
  colorValues: string[],
  selectedColor?: string | null,
): CatalogMaterial[] {
  const colors = colorValues.map(normalizeValue).filter(Boolean);

  if (!selectedColor || colors.length === 0) return materials;

  const selected = normalizeValue(selectedColor);
  if (!colors.includes(selected)) return materials;

  const prefixes = Array.from(new Set([...colors, ...KNOWN_COLOR_PREFIXES]));

  return materials.filter((material) => {
    const handle = normalizeValue(material.handle);
    const owner = prefixes.find(
      (color) => handle === color || handle.startsWith(`${color}-`),
    );

    return owner === undefined || owner === selected;
  });
}
