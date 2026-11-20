import type {
  HydrogenRouterContextProvider,
  OptimisticCartLineInput,
} from '@shopify/hydrogen';
import {
  PRODUCT_CUSTOMIZATION_FRAGMENT,
  hasCustomizationAttributes,
  parseProductCustomization,
  validateCustomizationAttributes,
  type CustomizationError,
  type ProductCustomization,
} from '~/lib/customization';

type Context = Pick<HydrogenRouterContextProvider, 'storefront'>;

export type CartLinesCustomizationCheck =
  | {ok: true; lines: OptimisticCartLineInput[]}
  | {ok: false; error: CustomizationError};

const VARIANT_CUSTOMIZATION_QUERY = `#graphql
  ${PRODUCT_CUSTOMIZATION_FRAGMENT}
  query JewelietteVariantCustomization(
    $ids: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        product { ...ProductCustomizationFields }
      }
    }
  }
` as const;

/**
 * Validates the customization attributes of lines being added to the cart against the
 * products' current metafields, because the form can be changed in the browser.
 * Lines without customization attributes pass through unchanged.
 */
export async function validateCartLinesCustomization(
  {storefront}: Context,
  lines: OptimisticCartLineInput[],
): Promise<CartLinesCustomizationCheck> {
  const customized = lines.filter((line) =>
    hasCustomizationAttributes(line.attributes),
  );
  if (customized.length === 0) return {ok: true, lines};

  const ids = [...new Set(customized.map((line) => line.merchandiseId))];
  const {nodes} = await storefront.query(VARIANT_CUSTOMIZATION_QUERY, {
    variables: {ids},
    cache: storefront.CacheNone(),
  });

  const byVariant = new Map<string, ProductCustomization | null>();
  for (const node of nodes) {
    if (node && 'product' in node) {
      byVariant.set(node.id, parseProductCustomization(node.product));
    }
  }

  const checked: OptimisticCartLineInput[] = [];
  for (const line of lines) {
    if (!hasCustomizationAttributes(line.attributes)) {
      checked.push(line);
      continue;
    }

    const result = validateCustomizationAttributes(
      byVariant.get(line.merchandiseId) ?? null,
      line.attributes ?? [],
    );
    if (!result.ok) return result;
    checked.push({...line, attributes: result.attributes});
  }

  return {ok: true, lines: checked};
}
