import {normalizeValue} from '~/lib/metafields';

export const ENGRAVING_LENGTH_CAP = 40;

export type GemColorChoice = {
  value: string;
  label: string;
};

export type ProductCustomization = {
  gemColors: GemColorChoice[];
  engravingMaxLength: number | null;
};

type CustomizationMetafields = {
  customizable?: {value: string} | null;
  customizationGemColors?: {value: string} | null;
  engravingMaxLength?: {value: string} | null;
};

export function parseGemColorChoices(value?: string | null): GemColorChoice[] {
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const choices = new Map<string, GemColorChoice>();
  for (const item of parsed) {
    if (typeof item !== 'string') continue;
    const label = item.trim();
    const slug = normalizeValue(label);
    if (slug && !choices.has(slug)) choices.set(slug, {value: slug, label});
  }
  return [...choices.values()];
}


export function parseEngravingMaxLength(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return Math.min(parsed, ENGRAVING_LENGTH_CAP);
}


export function parseProductCustomization(
  product: CustomizationMetafields,
): ProductCustomization | null {
  if (product.customizable?.value !== 'true') return null;

  const gemColors = parseGemColorChoices(product.customizationGemColors?.value);
  const engravingMaxLength = parseEngravingMaxLength(
    product.engravingMaxLength?.value,
  );

  if (gemColors.length === 0 && engravingMaxLength === null) return null;
  return {gemColors, engravingMaxLength};
}

export function isAllowedGemColor(
  customization: ProductCustomization,
  value: string,
): boolean {
  return customization.gemColors.some((color) => color.value === value);
}

export function isEngravingWithinLimit(
  customization: ProductCustomization,
  text: string,
): boolean {
  const max = customization.engravingMaxLength;
  return max !== null && text.length <= max;
}

/** Metafields the customization rules read, shared by the product page and the cart. */
export const PRODUCT_CUSTOMIZATION_FRAGMENT = `#graphql
  fragment ProductCustomizationFields on Product {
    customizable: metafield(namespace: "custom", key: "customizable") { value }
    customizationGemColors: metafield(namespace: "custom", key: "customization_gem_colors") { value }
    engravingMaxLength: metafield(namespace: "custom", key: "engraving_max_length") { value }
  }
` as const;

/**
 * Cart line attribute keys. They are identifiers, not UI text: Shopify shows them as-is
 * at checkout and on the order, so they stay in English.
 */
export const CUSTOMIZATION_ATTRIBUTE = {
  gemColor: 'Gem color',
  engraving: 'Engraving',
} as const;

export type CustomizationField = keyof typeof CUSTOMIZATION_ATTRIBUTE;

export type CartAttribute = {key: string; value: string};

/** What the shopper picked on the product page. `gemColor` is a choice's slug. */
export type CustomizationChoice = {gemColor: string; engraving: string};

export type CustomizationError =
  | 'not-customizable'
  | 'gem-color-not-allowed'
  | 'engraving-not-allowed'
  | 'duplicate-attribute';

export type CustomizationValidation =
  | {ok: true; attributes: CartAttribute[]}
  | {ok: false; error: CustomizationError};

const CUSTOMIZATION_KEYS = new Set<string>(Object.values(CUSTOMIZATION_ATTRIBUTE));

// Control characters cannot be engraved and would garble the order.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/** Starting choice: the first allowed gem color and no engraving. */
export function initialCustomizationChoice(
  customization: ProductCustomization | null | undefined,
): CustomizationChoice {
  return {gemColor: customization?.gemColors[0]?.value ?? '', engraving: ''};
}

/**
 * Cart line attributes for the shopper's choice. The gem color is stored by its admin
 * label so the order reads naturally; an empty engraving is left out.
 */
export function customizationAttributes(
  customization: ProductCustomization | null | undefined,
  choice: CustomizationChoice,
): CartAttribute[] {
  if (!customization) return [];

  const attributes: CartAttribute[] = [];
  const color = customization.gemColors.find(
    (gemColor) => gemColor.value === choice.gemColor,
  );
  if (color) {
    attributes.push({key: CUSTOMIZATION_ATTRIBUTE.gemColor, value: color.label});
  }

  const engraving = choice.engraving.trim();
  if (engraving && customization.engravingMaxLength !== null) {
    attributes.push({key: CUSTOMIZATION_ATTRIBUTE.engraving, value: engraving});
  }
  return attributes;
}

/** True when any attribute is one of the customization keys. */
export function hasCustomizationAttributes(
  attributes?: readonly CartAttribute[] | null,
): boolean {
  return (attributes ?? []).some((attribute) =>
    CUSTOMIZATION_KEYS.has(attribute.key),
  );
}

/**
 * Checks a cart line's customization attributes against the product's options.
 * Returns the attributes to store (gem color rewritten to the admin label, engraving
 * trimmed, other attributes untouched) or an error code.
 */
export function validateCustomizationAttributes(
  customization: ProductCustomization | null,
  attributes: readonly CartAttribute[],
): CustomizationValidation {
  const result: CartAttribute[] = [];
  const seen = new Set<string>();

  for (const attribute of attributes) {
    if (!CUSTOMIZATION_KEYS.has(attribute.key)) {
      result.push(attribute);
      continue;
    }
    if (!customization) return {ok: false, error: 'not-customizable'};
    if (seen.has(attribute.key)) return {ok: false, error: 'duplicate-attribute'};
    seen.add(attribute.key);

    if (attribute.key === CUSTOMIZATION_ATTRIBUTE.gemColor) {
      const slug = normalizeValue(attribute.value);
      if (!isAllowedGemColor(customization, slug)) {
        return {ok: false, error: 'gem-color-not-allowed'};
      }
      const color = customization.gemColors.find((gem) => gem.value === slug);
      result.push({key: attribute.key, value: color?.label ?? attribute.value});
      continue;
    }

    const engraving = attribute.value.trim();
    if (!engraving) continue;
    if (
      CONTROL_CHARACTERS.test(engraving) ||
      !isEngravingWithinLimit(customization, engraving)
    ) {
      return {ok: false, error: 'engraving-not-allowed'};
    }
    result.push({key: attribute.key, value: engraving});
  }

  return {ok: true, attributes: result};
}

/** The customization details of a cart line, as field codes the UI labels itself. */
export function customizationLineDetails(
  attributes?: ReadonlyArray<{key: string; value?: string | null}> | null,
): Array<{field: CustomizationField; value: string}> {
  const fields = Object.entries(CUSTOMIZATION_ATTRIBUTE) as Array<
    [CustomizationField, string]
  >;

  return fields.flatMap(([field, key]) => {
    const value = attributes?.find((attribute) => attribute.key === key)?.value;
    return value ? [{field, value}] : [];
  });
}
