export type CatalogMaterial = {
  handle: string;
  label: string;
};

type MaterialNode = {
  handle?: string | null;
  fields?: Array<{key: string; value?: string | null}> | null;
} | null;

/** Raw shape of `shopify.jewelry-material` on a Storefront API product. */
export type CatalogMaterialsMetafield = {
  references?: {
    nodes: Array<MaterialNode>;
  } | null;
} | null;

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

export function materialLabels(
  materials?: CatalogMaterialsMetafield,
): string[] {
  return parseMaterials(materials).map((material) => material.label);
}
