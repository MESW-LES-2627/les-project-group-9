import {useLoaderData} from 'react-router';
import type {Route} from './+types/search';
import {translatorFromMatches, useTranslation} from '~/lib/i18n';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {SearchForm} from '~/components/search/SearchForm';
import {SearchResults} from '~/components/search/SearchResults';
import {type RegularSearchReturn, type PredictiveSearchReturn, getEmptyPredictiveSearchResult, readCatalogFilters} from '~/lib/search';
import type {RegularSearchQuery, PredictiveSearchQuery,} from 'storefrontapi.generated';
import {JEWELIETTE_PRODUCT_CARD_FRAGMENT,} from '~/lib/jeweliette-catalog';
import {CatalogFilters} from '~/components/collections/CatalogFilters';

export const meta: Route.MetaFunction = ({matches}) => {
  return [{title: `${translatorFromMatches(matches)('nav.search')} | Jeweliette`}];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (url.searchParams.has('predictive')) {
    return predictiveSearch({request, context});
  }

  const filterState = readCatalogFilters(url.searchParams);
  const result = await regularSearch({request, context});

  return {
    ...result,
    filterState,
  };
}

/**
 * Renders the /search route
 */
export default function SearchPage() {
  const data = useLoaderData<typeof loader>();
  const t = useTranslation();

  // Predictive requests are consumed by the search fetcher.
  if (data.type === 'predictive') return null;

  const {
    term,
    result,
    error,
    filterState,
  } = data;

  const productResults = result.items.products;

  const paginationKey = JSON.stringify([
    term,
    filterState.selectedFilters,
    filterState.priceMin,
    filterState.priceMax,
  ]);

  const currencyCode =
    productResults.nodes[0]
      ?.priceRange.minVariantPrice.currencyCode;

  return (
    <section className="mx-auto max-w-[1280px] px-[4vw] pb-24 pt-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xs uppercase tracking-[0.2em] text-primary">
          {t('search.title')}
        </h1>

        <SearchForm
          key={term}
          action="/search"
          className="mt-5 flex items-center gap-4 border-b border-primary"
        >
          {({inputRef}) => (
            <>
              <input
                aria-label={t('search.inputLabel')}
                defaultValue={term}
                name="q"
                placeholder={t('search.placeholder')}
                ref={inputRef}
                type="search"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent py-4 font-display text-[clamp(1.5rem,3vw,2.5rem)] outline-none placeholder:text-primary/45"
              />

              <button
                type="submit"
                className="min-h-11 px-3 text-xs uppercase tracking-widest text-primary hover:text-ink"
              >
                {t('nav.search')}
              </button>
            </>
          )}
        </SearchForm>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-8 text-sm text-red-800"
        >
          {t('search.unavailable')}
        </p>
      ) : null}

      {term ? (
        <CatalogFilters
          filters={productResults.productFilters}
          selectedFilters={filterState.selectedFilters}
          priceMin={filterState.priceMin}
          priceMax={filterState.priceMax}
          query={term}
          clearHref={`/search?q=${encodeURIComponent(term)}`}
          currencyCode={currencyCode}
        />
      ) : null}

      <div className="mt-12">
        {!term ? (
          <p className="text-center text-sm text-primary">
            {t('search.prompt')}
          </p>
        ) : !result.total ? (
          <SearchResults.Empty />
        ) : (
          <SearchResults result={result} term={term}>
            {({
                articles,
                pages,
                products,
                term: searchTerm,
              }) => (
              <div className="space-y-12">
                {products.nodes.length === 0 ? (
                  <div className="border-y border-line py-8 text-center">
                    <p className="text-sm text-primary">
                      {t('search.noFilteredProducts')}
                    </p>
                  </div>
                ) : null}

                <SearchResults.Products
                  key={paginationKey}
                  products={products}
                  term={searchTerm}
                />

                <SearchResults.Pages
                  pages={pages}
                  term={searchTerm}
                />

                <SearchResults.Articles
                  articles={articles}
                  term={searchTerm}
                />
              </div>
            )}
          </SearchResults>
        )}
      </div>

      <Analytics.SearchView
        data={{
          searchTerm: term,
          searchResults: result,
        }}
      />
    </section>
  );
}

/**
 * Regular search query and fragments
 * (adjust as needed)
 */
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    ...JewelietteProductCard
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
    selectedOrFirstAvailableVariant {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
      selectedOptions {
        name
        value
      }
      product {
        handle
        title
      }
    }
  }
` as const;

const SEARCH_PAGE_FRAGMENT = `#graphql
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
` as const;

const SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
  }
` as const;

const PAGE_INFO_FRAGMENT = `#graphql
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/search
export const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
    $filters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    articles: search(
      query: $term
      types: [ARTICLE]
      first: $first
    ) {
      nodes {
        ... on Article {
          ...SearchArticle
        }
      }
    }

    pages: search(
      query: $term
      types: [PAGE]
      first: $first
    ) {
      nodes {
        ... on Page {
          ...SearchPage
        }
      }
    }

    products: search(
      after: $endCursor
      before: $startCursor
      first: $first
      last: $last
      query: $term
      sortKey: RELEVANCE
      types: [PRODUCT]
      unavailableProducts: HIDE
      productFilters: $filters
    ) {
      nodes {
        ... on Product {
          ...SearchProduct
        }
      }

      productFilters {
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
        ...PageInfoFragment
      }
    }
  }

  ${SEARCH_PRODUCT_FRAGMENT}
  ${SEARCH_PAGE_FRAGMENT}
  ${SEARCH_ARTICLE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
  ${JEWELIETTE_PRODUCT_CARD_FRAGMENT}
` as const;

/**
 * Regular search fetcher
 */
async function regularSearch({request, context}: Pick<
  Route.LoaderArgs,
  'request' | 'context'
>): Promise<RegularSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);

  const paginationVariables = getPaginationVariables(
    request,
    {pageBy: 8},
  );

  const term = String(
    url.searchParams.get('q') || '',
  ).trim();

  const filterState = readCatalogFilters(
    url.searchParams,
  );

  const {
    errors,
    ...items
  }: RegularSearchQuery & {
    errors?: Array<{message: string}>;
  } = await storefront.query(SEARCH_QUERY, {
    variables: {
      ...paginationVariables,
      term,
      filters: filterState.filters,
      language: storefront.i18n.language,
      country: storefront.i18n.country,
    },
  });

  const total =
    items.products.nodes.length +
    items.pages.nodes.length +
    items.articles.nodes.length;

  const error = errors
    ?.map(({message}) => message)
    .join(', ');

  return {
    type: 'regular',
    term,
    error,
    result: {
      total,
      items,
    },
  };
}

/**
 * Predictive search query and fragments
 * (adjust as needed)
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
` as const;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
` as const;

/**
 * Predictive search fetcher
 */
async function predictiveSearch({
  request,
  context,
}: Pick<
  Route.ActionArgs,
  'request' | 'context'
>): Promise<PredictiveSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  // Predictively search articles, collections, pages, products, and queries (suggestions)
  const {
    predictiveSearch: items,
    errors,
  }: PredictiveSearchQuery & {errors?: Array<{message: string}>} =
    await storefront.query(PREDICTIVE_SEARCH_QUERY, {
      variables: {
        // customize search options as needed
        limit,
        limitScope: 'EACH',
        term,
      },
    });

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}: {message: string}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc: number, item: Array<unknown>) => acc + item.length,
    0,
  );

  return {type, term, result: {items, total}};
}
