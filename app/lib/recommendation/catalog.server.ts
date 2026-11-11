import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import type {JewelietteRecommendationProductFragment} from 'storefrontapi.generated';
import {
  JEWELIETTE_RECOMMENDATION_PRODUCT_FRAGMENT,
  type CatalogProductWithTraits,
} from '~/lib/jeweliette-catalog';

type Context = Pick<HydrogenRouterContextProvider, 'storefront'>;

const RECOMMENDATION_CANDIDATES_QUERY = `#graphql
  ${JEWELIETTE_RECOMMENDATION_PRODUCT_FRAGMENT}
  query JewelietteRecommendationCandidates(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: 250, sortKey: BEST_SELLING) {
      nodes {
        ...JewelietteRecommendationProduct
      }
    }
  }
` as const;

export async function getRecommendationCandidates(
  context: Context,
): Promise<CatalogProductWithTraits[]> {
  const {products} = await context.storefront.query(
    RECOMMENDATION_CANDIDATES_QUERY,
    {
      cache: context.storefront.CacheShort(),
    },
  );

  return products.nodes.filter(
    (
      product: JewelietteRecommendationProductFragment | null,
    ): product is JewelietteRecommendationProductFragment => product !== null,
  );
}
