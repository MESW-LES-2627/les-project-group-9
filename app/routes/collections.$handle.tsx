import {
  Form,
  Link,
  redirect,
  useLoaderData,
} from 'react-router';

import {
  Analytics,
  getPaginationVariables,
  Pagination,
} from '@shopify/hydrogen';

import type {
  ProductCollectionSortKeys,
  ProductFilter,
} from '@shopify/hydrogen/storefront-api-types';

import type {Route} from './+types/collections.$handle';

import {ProductItem} from '~/components/ProductItem';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

import {
  JEWELIETTE_PRODUCT_CARD_FRAGMENT,
} from '~/lib/jeweliette-catalog';

const SORT_OPTIONS: Record<
  string,
  {
    label: string;
    sortKey: ProductCollectionSortKeys;
    reverse: boolean;
  }
> = {
  featured: {
    label: 'Featured',
    sortKey: 'COLLECTION_DEFAULT',
    reverse: false,
  },

  bestselling: {
    label: 'Best selling',
    sortKey: 'BEST_SELLING',
    reverse: false,
  },

  newest: {
    label: 'Newest',
    sortKey: 'CREATED',
    reverse: true,
  },

  'price-asc': {
    label: 'Price: low to high',
    sortKey: 'PRICE',
    reverse: false,
  },

  'price-desc': {
    label: 'Price: high to low',
    sortKey: 'PRICE',
    reverse: true,
  },
};

export const meta: Route.MetaFunction = ({data}) => [
  {
    title: `${data?.collection.title || 'Collection'} | Jeweliette`,
  },
  {
    name: 'description',
    content:
      data?.collection.description ||
      'Explore the Jeweliette collection.',
  },
];

function parsePrice(value: string | null) {
  if (value === null || value.trim() === '') {
    return undefined;
  }

  const price = Number(value);

  if (!Number.isFinite(price) || price < 0) {
    throw new Response('Invalid price filter.', {
      status: 400,
    });
  }

  return price;
}

function filterInput(input: unknown): string {
  return typeof input === 'string' ? input : JSON.stringify(input);
}

function parseFilters(values: string[]): ProductFilter[] {
  if (values.length > 20) {
    throw new Response('Too many filters.', {
      status: 400,
    });
  }

  return values.map((value) => {
    try {
      const parsed: unknown = JSON.parse(value);

      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        throw new Error('Invalid filter');
      }

      return parsed as ProductFilter;
    } catch {
      throw new Response('Invalid product filter.', {
        status: 400,
      });
    }
  });
}

export async function loader({
                               context,
                               params,
                               request,
                             }: Route.LoaderArgs) {
  if (!params.handle) {
    throw redirect('/collections');
  }

  const url = new URL(request.url);

  const requestedSort = url.searchParams.get('sort') || 'featured';

  const sort = Object.prototype.hasOwnProperty.call(
    SORT_OPTIONS,
    requestedSort,
  )
    ? requestedSort
    : 'featured';

  const selectedFilters = url.searchParams.getAll('filter');

  const filters = parseFilters(selectedFilters);

  const minimumPrice = parsePrice(
    url.searchParams.get('priceMin'),
  );

  const maximumPrice = parsePrice(
    url.searchParams.get('priceMax'),
  );

  if (
    minimumPrice !== undefined &&
    maximumPrice !== undefined &&
    minimumPrice > maximumPrice
  ) {
    throw new Response(
      'The minimum price must not exceed the maximum price.',
      {
        status: 400,
      },
    );
  }

  if (
    minimumPrice !== undefined ||
    maximumPrice !== undefined
  ) {
    filters.push({
      price: {
        ...(minimumPrice !== undefined
          ? {min: minimumPrice}
          : {}),
        ...(maximumPrice !== undefined
          ? {max: maximumPrice}
          : {}),
      },
    });
  }

  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  const {collection} = await context.storefront.query(
    COLLECTION_QUERY,
    {
      variables: {
        handle: params.handle,
        language: 'EN',
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
    priceMin: url.searchParams.get('priceMin') || '',
    priceMax: url.searchParams.get('priceMax') || '',
    paginationKey: JSON.stringify([
      collection.id,
      sort,
      selectedFilters,
      minimumPrice,
      maximumPrice,
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

  const hasActiveFilters =
    selectedFilters.length > 0 ||
    priceMin !== '' ||
    priceMax !== '';

  return (
    <section className="px-[5vw] pb-24 pt-16 tablet:pt-20">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">
          Jeweliette collections
        </p>

        <h1 className="mt-5 font-display text-[clamp(3rem,6vw,5.5rem)] leading-none tracking-tight">
          {collection.title}
        </h1>

        {collection.description ? (
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-primary">
            {collection.description}
          </p>
        ) : null}
      </header>

      <Form
        key={paginationKey}
        method="get"
        preventScrollReset
        className="mb-10 mt-14 flex flex-wrap items-end gap-4 border-y border-line py-5"
      >
        {collection.products.filters.map((filter) => {
          if (filter.type === 'PRICE_RANGE') {
            return (
              <fieldset
                key={filter.id}
                className="flex items-end gap-3"
              >
                <legend className="mb-2 text-xs uppercase tracking-wider text-primary">
                  Price
                </legend>

                <label className="block">
                  <span className="mb-2 block text-xs">
                    Minimum
                  </span>

                  <input
                    type="number"
                    name="priceMin"
                    min="0"
                    step="0.01"
                    defaultValue={priceMin}
                    className="min-h-11 w-28 border border-line bg-paper px-3 text-base"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs">
                    Maximum
                  </span>

                  <input
                    type="number"
                    name="priceMax"
                    min="0"
                    step="0.01"
                    defaultValue={priceMax}
                    className="min-h-11 w-28 border border-line bg-paper px-3 text-base"
                  />
                </label>
              </fieldset>
            );
          }

          return (
            <details
              key={filter.id}
              className="w-full border border-line bg-paper sm:w-auto"
            >
              <summary className="cursor-pointer px-4 py-3 text-sm">
                {filter.label}
              </summary>

              <div className="max-h-72 min-w-56 overflow-y-auto border-t border-line px-4 py-3">
                {filter.values.map((value) => {
                  const input = filterInput(value.input);
                  const selected = selectedFilters.includes(input);

                  return (
                    <label
                      key={value.id}
                      className="flex min-h-11 items-center gap-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="filter"
                        value={input}
                        defaultChecked={selected}
                        disabled={value.count === 0 && !selected}
                        className="h-4 w-4 accent-primary"
                      />

                      <span>
                        {value.label}
                        <span className="ml-2 text-primary">
                          ({value.count})
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}

        <label className="block sm:ml-auto">
          <span className="mb-2 block text-xs uppercase tracking-wider text-primary">
            Sort by
          </span>

          <select
            name="sort"
            defaultValue={sort}
            className="min-h-11 border border-line bg-paper px-3 text-base"
          >
            {Object.entries(SORT_OPTIONS).map(
              ([value, option]) => (
                <option key={value} value={value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </label>

        <button
          type="submit"
          className="min-h-11 bg-primary px-5 text-xs uppercase tracking-widest text-white transition-colors hover:bg-ink"
        >
          Apply
        </button>

        {hasActiveFilters ? (
          <Link
            to={`/collections/${collection.handle}`}
            preventScrollReset
            className="inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-4"
          >
            Clear filters
          </Link>
        ) : null}
      </Form>

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
            <div className="mb-6 flex justify-center">
              <PreviousLink className="inline-flex min-h-11 items-center border-b border-primary px-3 text-xs uppercase tracking-widest text-primary">
                {isLoading ? 'Loading…' : 'Load previous'}
              </PreviousLink>
            </div>

            {nodes.length ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-3">
                {nodes.map((product, index) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    loading={index < 6 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
            ) : (
              <div className="border-y border-line py-16 text-center">
                <h2 className="font-display text-3xl">
                  No pieces found.
                </h2>

                <p className="mt-4 text-base text-primary">
                  Try a different selection or clear your
                  filters.
                </p>

                <Link
                  to={`/collections/${collection.handle}`}
                  className="mt-6 inline-flex min-h-11 items-center border-b border-primary text-sm text-primary"
                >
                  View the collection
                </Link>
              </div>
            )}

            <div className="mt-12 flex justify-center">
              <NextLink className="inline-flex min-h-11 items-center border border-primary px-6 text-xs uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white">
                {isLoading ? 'Loading…' : 'Load more'}
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