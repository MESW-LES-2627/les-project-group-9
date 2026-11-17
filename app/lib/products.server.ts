import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import {
  JEWELIETTE_PRODUCT_CARD_FRAGMENT,
  JEWELIETTE_TRY_ON_FRAGMENT,
  type CatalogProduct,
} from '~/lib/jeweliette-catalog';
import {isProductGid} from '~/lib/profile/list-schema';

type Context = Pick<HydrogenRouterContextProvider, 'storefront'>;

const PRODUCTS_BY_IDS_QUERY = `#graphql
  ${JEWELIETTE_PRODUCT_CARD_FRAGMENT}
  ${JEWELIETTE_TRY_ON_FRAGMENT}
  query JewelietteProductsByIds(
    $ids: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      __typename
      ... on Product { ...JewelietteProductCard ...JewelietteTryOn }
    }
  }
` as const;

/** Reads a comma-separated `ids` query parameter. */
export function parseProductIds(
  raw: string | null | undefined,
  max = 50,
): string[] {
  return (raw ?? '').split(',').filter(isProductGid).slice(0, max);
}

/** Loads product cards for a list of product GIDs, preserving query order. */
export async function loadProductsByIds(
  context: Context,
  ids: string[],
): Promise<CatalogProduct[]> {
  if (!ids.length) return [];

  const {nodes} = await context.storefront.query(PRODUCTS_BY_IDS_QUERY, {
    variables: {ids},
  });

  return nodes.flatMap((node: {__typename?: string} | null) =>
    node && node.__typename === 'Product' ? [node] : [],
  ) as CatalogProduct[];
}
