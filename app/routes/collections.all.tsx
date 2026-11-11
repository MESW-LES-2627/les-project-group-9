import type {Route} from './+types/collections.all';
import {useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import {useTranslation} from '~/lib/i18n';
import {PaginatedResourceSection} from '~/components/shared/PaginatedResourceSection';
import {ProductItem} from '~/components/product/ProductItem';
import {JEWELIETTE_PRODUCT_CARD_FRAGMENT} from '~/lib/jeweliette-catalog';
import type {JewelietteProductCardFragment} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = () => [
  {title: 'All pieces | Jeweliette'},
];

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  const [{products}] = await Promise.all([
    storefront.query(CATALOG_QUERY, {
      variables: {...paginationVariables},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);
  return {products};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Collection() {
  const {products} = useLoaderData<typeof loader>();
  const t = useTranslation();

  return (
    <section className="mx-auto max-w-[1400px] px-[4vw] pb-20 pt-12">
      <header className="mb-12 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">
          {t('catalog.allEyebrow')}
        </p>

        <h1 className="mt-4 font-display text-[clamp(2.5rem,5vw,4rem)] leading-none">
          {t('common.allPieces')}
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-primary">
          {t('catalog.allIntro')}
        </p>
      </header>

      <PaginatedResourceSection<JewelietteProductCardFragment>
        connection={products}
        resourcesClassName="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4"
      >
        {({node: product, index}) => (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : 'lazy'}
          />
        )}
      </PaginatedResourceSection>
    </section>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/product
const CATALOG_QUERY = `#graphql
  ${JEWELIETTE_PRODUCT_CARD_FRAGMENT}

  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
    ) {
      nodes {
        ...JewelietteProductCard
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
` as const;
