import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import type {
  CatalogImage,
  CatalogMoney,
  CatalogProduct,
} from './jeweliette-catalog';
import {isVariantGid} from './profile/list-schema';
import type {TryOnReference} from './try-on/catalog';

type Context = Pick<HydrogenRouterContextProvider, 'storefront'>;

export type CatalogVariantProduct = CatalogProduct & {
  category?: {name?: string | null} | null;
};

/** A product variant with everything the wardrobe and try-on need. */
export type CatalogVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  image?: CatalogImage | null;
  selectedOptions: Array<{name: string; value: string}>;
  price: CatalogMoney;
  compareAtPrice?: CatalogMoney | null;
  product: CatalogVariantProduct;
  tryOnOverlay?: {reference?: TryOnReference | null} | null;
  tryOnSize?: {value?: string | null} | null;
};

const VARIANTS_BY_IDS_QUERY = `#graphql
  query JewelietteVariantsByIds(
    $ids: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      __typename
      ... on ProductVariant {
        id
        title
        availableForSale
        image { id url altText width height }
        selectedOptions { name value }
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        product {
          id
          title
          handle
          productType
          category { id name }
          featuredImage { id url altText width height }
          priceRange {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
        }
        tryOnOverlay: metafield(namespace: "custom", key: "try_on_overlay") {
          reference {
            ... on MediaImage { image { url } }
            ... on GenericFile { url }
          }
        }
        tryOnSize: metafield(namespace: "custom", key: "try_on_size_cm") { value }
      }
    }
  }
` as const;

/** Reads a comma-separated `ids` query parameter of variant GIDs. */
export function parseVariantIds(
  raw: string | null | undefined,
  max = 50,
): string[] {
  return (raw ?? '').split(',').filter(isVariantGid).slice(0, max);
}

/** Loads variants (with their product and overlay) preserving query order. */
export async function loadVariantsByIds(
  context: Context,
  ids: string[],
): Promise<CatalogVariant[]> {
  if (!ids.length) return [];

  const {nodes} = await context.storefront.query(VARIANTS_BY_IDS_QUERY, {
    variables: {ids},
  });

  return nodes.flatMap((node: {__typename?: string} | null) =>
    node && node.__typename === 'ProductVariant'
      ? [node as unknown as CatalogVariant]
      : [],
  );
}
