import {redirect, useLoaderData} from 'react-router';
import {Analytics, getPaginationVariables, Pagination} from '@shopify/hydrogen';
import type {ProductCollectionSortKeys} from '@shopify/hydrogen/storefront-api-types';
import type {Route} from './+types/collections.$handle';
import {type MessageKey, translatorFromMatches, useTranslation} from '~/lib/i18n';
import {ProductItem} from '~/components/product/ProductItem';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {JEWELIETTE_PRODUCT_CARD_FRAGMENT} from '~/lib/jeweliette-catalog';
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
  const sort = Object.prototype.hasOwnProperty.call(SORT_OPTIONS, requestedSort,) ? requestedSort : 'featured';
  const {selectedFilters, filters, priceMin, priceMax} = readCatalogFilters(url.searchParams);

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

  return {
    collection,
    sort,
    selectedFilters,
    priceMin,
    priceMax,
    paginationKey: JSON.stringify([
      collection.id,
      sort,
      selectedFilters,
      priceMin,
      priceMax,
    ]),
  };
}

export default function CollectionPage() {
  const {
    collection,
    sort,
    selectedFilters,
    priceMin,
    priceMax,
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
        connection={collection.products}
      >
        {({
            nodes,
            PreviousLink,
            NextLink,
            isLoading,
          }) => (
          <>
            <CatalogFilters
              filters={collection.products.filters}
              selectedFilters={selectedFilters}
              priceMin={priceMin}
              priceMax={priceMax}
              clearHref={`/collections/${collection.handle}`}
              currencyCode={
                nodes[0]?.priceRange.minVariantPrice.currencyCode
              }
              sort={sort}
              sortOptions={Object.entries(SORT_OPTIONS).map(
                ([value, option]) => ({
                  value,
                  label: t(option.labelKey),
                }),
              )}
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
              <NextLink className="inline-flex min-h-11 items-center border border-primary px-6 text-[11px] uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white">
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
  ${JEWELIETTE_PRODUCT_CARD_FRAGMENT}

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
          ...JewelietteProductCard
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