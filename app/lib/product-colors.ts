import {normalizeValue, parseTextMetafield} from './metafields';

const COLOR_OPTION_TOKENS = new Set(['color', 'colour', 'cor', 'couleur']);

type ProductWithColors = {
  metal?: {value?: string | null} | null;
  options?: Array<{
    name: string;
    optionValues: Array<{name: string}>;
  }> | null;
};

function isColorOption(name: string): boolean {
  return normalizeValue(name)
    .split('-')
    .some((token) => COLOR_OPTION_TOKENS.has(token));
}

/**
 * The colour tokens for a product. `custom.metal` wins when the admin sets it;
 * otherwise the product's colour option values (e.g. "Gold", "Silver") are
 * used, so colour preferences work with the catalog as it is merchandised.
 */
export function productColorValues(product: ProductWithColors): string[] {
  const explicit = parseTextMetafield(product.metal?.value);
  if (explicit.length) return explicit;

  const colors = new Set<string>();

  for (const option of product.options ?? []) {
    if (!isColorOption(option.name)) continue;

    for (const value of option.optionValues) {
      const color = normalizeValue(value.name);
      if (color) colors.add(color);
    }
  }

  return Array.from(colors);
}
