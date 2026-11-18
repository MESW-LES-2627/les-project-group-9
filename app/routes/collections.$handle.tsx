import {data, redirect, useLoaderData} from 'react-router';
import {Analytics, getPaginationVariables, Pagination} from '@shopify/hydrogen';
import type {ProductCollectionSortKeys} from '@shopify/hydrogen/storefront-api-types';
import type {Route} from './+types/collections.$handle';
import {type MessageKey, translatorFromMatches, useTranslation} from '~/lib/i18n';
import {ProductItem} from '~/components/product/ProductItem';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {JEWELIETTE_RECOMMENDATION_PRODUCT_FRAGMENT} from '~/lib/jeweliette-catalog';
import {readCustomerProfile} from '~/lib/profile/customer.server';
import {rankProductIds} from '~/lib/recommendation/rank';
import {toProductTraits} from '~/lib/recommendation/traits';
import {CatalogFilters} from '~/components/collections/CatalogFilters';
import {readCatalogFilters} from '~/lib/search';

const SORT_OPTIONS: Record<
  string,
  {
    labelKey: MessageKey;
    sortKey: ProductCollectionSortKeys;
    reverse: boolean;
  }
> = {
  featured: {
    labelKey: 'catalog.sort.featured',
    sortKey: 'COLLECTION_DEFAULT',
    reverse: false,
  },

  bestselling: {
    labelKey: 'catalog.sort.bestselling',
    sortKey: 'BEST_SELLING',
    reverse: false,
  },

  newest: {
    labelKey: 'catalog.sort.newest',
    sortKey: 'CREATED',
    reverse: true,
  },

  'price-asc': {
    labelKey: 'catalog.sort.priceAsc',
    sortKey: 'PRICE',
    reverse: false,
  },

  'price-desc': {
    labelKey: 'catalog.sort.priceDesc',
    sortKey: 'PRICE',
    reverse: true,
  },

  'for-you': {
    labelKey: 'catalog.sort.forYou',
    sortKey: 'COLLECTION_DEFAULT',
    reverse: false,
  },
};

export const meta: Route.MetaFunction = ({data, matches}) => {
  const t = translatorFromMatches(matches);
  return [
    {
      title: `${data?.collection.title || t('meta.collectionFallback')} | Jeweliette`,
    },
    {
      name: 'description',
      content: data?.collection.description || t('meta.collectionDescription'),
    },
  ];
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  if (!params.handle) {throw redirect('/collections');}
  const url = new URL(request.url);
  const requestedSort = url.searchParams.get('sort') || 'featured';
  const validSort = Object.prototype.hasOwnProperty.call(SORT_OPTIONS, requestedSort,) ? requestedSort : 'featured';
  const {selectedFilters, filters, priceMin, priceMax} = readCatalogFilters(url.searchParams);
  const loggedIn = await context.customerAccount.isLoggedIn().catch(() => false);
  const sort = validSort === 'for-you' && !loggedIn ? 'featured' : validSort;

  const paginationVariables = getPaginationVariables(
    request,
    {
      pageBy: 12,
    },
  );

  const {collection} = await context.storefront.query(
    COLLECTION_QUERY,
    {
      variables: {
        handle: params.handle,
        filters,
        sortKey: SORT_OPTIONS[sort].sortKey,
        reverse: SORT_OPTIONS[sort].reverse,
        ...paginationVariables,
      },
    },
  );

  if (!collection) {
    throw new Response('Collection not found.', {
      status: 404,
    });
  }

  redirectIfHandleIsLocalized(request, {
    handle: params.handle,
    data: collection,
  });

  let products = collection.products;

  if (sort === 'for-you' && loggedIn) {
    try {
      const profile = await readCustomerProfile(context);
      const nodes = collection.products.nodes;
      const traits = nodes.map(toProductTraits);
      const favoriteIds = new Set(profile.favorites);
      const favorites = traits.filter((product) =>
        favoriteIds.has(product.id),
      );
      const byId = new Map(nodes.map((product) => [product.id, product]));

      products = {
        ...collection.products,
        nodes: rankProductIds(traits, {
          favorites,
          preferences: profile.preferences,
        })
          .map((id) => byId.get(id))
          .filter(
            (product): product is (typeof nodes)[number] => Boolean(product),
          ),
      };
    } catch (error) {
      console.error('Collection personalization failed', error);
    }
  }

  return data(
    {
      collection,
      products,
      sort,
      selectedFilters,
      priceMin,
      priceMax,
      canPersonalize: loggedIn,
      paginationKey: JSON.stringify([
        collection.id,
        sort,
        selectedFilters,
        priceMin,
        priceMax,
      ]),
    },
    {
      headers:
        sort === 'for-you'
          ? {'Cache-Control': 'private, no-store', Vary: 'Cookie'}
          : undefined,
    },
  );
}

export default function CollectionPage() {
  const {
    collection,
    products,
    sort,
    selectedFilters,
    priceMin,
    priceMax,
    canPersonalize,
    paginationKey,
  } = useLoaderData<typeof loader>();
  const t = useTranslation();

  return (
    <section className="mx-auto max-w-[1400px] px-[4vw] pb-20 pt-10 tablet:pt-14">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
          {t('catalog.collectionsEyebrow')}
        </p>

        <h1 className="mt-3 font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-none tracking-tight">
          {collection.title}
        </h1>

        {collection.description ? (
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-primary">
            {collection.description}
          </p>
        ) : null}
      </header>

      <Pagination
        key={paginationKey}
        connection={products}
      >
        {({
            nodes,
            PreviousLink,
            NextLink,
            isLoading,
          }) => (
          <>
            <CatalogFilters
              filters={products.filters}
              selectedFilters={selectedFilters}
              priceMin={priceMin}
              priceMax={priceMax}
              clearHref={`/collections/${collection.handle}`}
              currencyCode={
                nodes[0]?.priceRange.minVariantPrice.currencyCode
              }
              sort={sort}
              sortOptions={Object.entries(SORT_OPTIONS)
                .filter(([value]) => value !== 'for-you' || canPersonalize)
                .map(([value, option]) => ({
                  value,
                  label: t(option.labelKey),
                }))}
            />

            <p className="mt-4 text-xs uppercase tracking-widest text-primary">
              {t('catalog.piecesLoaded', {count: nodes.length})}
            </p>

            <div className="mt-6 flex justify-center">
              <PreviousLink className="inline-flex min-h-10 items-center border-b border-primary text-[11px] uppercase tracking-widest text-primary">
                {isLoading ? t('common.loading') : t('common.loadPrevious')}
              </PreviousLink>
            </div>

            {nodes.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                {nodes.map((product, index) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    loading={index < 8 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-8 border-y border-line py-16 text-center">
                <h2 className="font-display text-2xl">
                  {t('catalog.noPieces')}
                </h2>

                <p className="mt-3 text-sm text-primary">
                  {t('catalog.noPiecesHint')}
                </p>
              </div>
            )}

            <div className="mt-12 flex justify-center">
              <NextLink className="inline-flex min-h-11 items-center border border-primary px-6 text-[11px] uppercase tracking-widest text-primary transition-colors hover:bg-bark hover:text-white">
                {isLoading ? t('common.loading') : t('common.loadMore')}
              </NextLink>
            </div>
          </>
        )}
      </Pagination>

      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </section>
  );
}

/*
 * These existing fragment names are retained for compatibility
 * with generated types used by other template routes.
 */
const LEGACY_PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }

  fragment ProductItem on Product {
    id
    handle
    title

    featuredImage {
      id
      altText
      url
      width
      height
    }

    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }

      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
` as const;

const COLLECTION_QUERY = `#graphql
  ${JEWELIETTE_RECOMMENDATION_PRODUCT_FRAGMENT}

  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description

      products(
        first: $first
        last: $last
        before: $startCursor
        after: $endCursor
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
      ) {
        nodes {
          ...JewelietteRecommendationProduct
        }

        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }

        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
` as const;