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

import {PriceIntervals} from '~/components/PriceIntervals';

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

function parseFilterInput(input: unknown): Record<string, unknown> {
  try {
    const parsed: unknown =
      typeof input === 'string' ? JSON.parse(input) : input;

    return parsed !== null &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
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

function getFilterLabel(filter: {id: string; label: string}) {
  const labels: Record<string, string> = {
    'filter.v.availability': 'Availability',
    'filter.v.price': 'Price',
    'filter.p.product_type': 'Product type',
    'filter.p.vendor': 'Brand',
    'filter.p.m.custom.material': 'Material',
    'filter.p.m.custom.metal': 'Metal',
    'filter.p.m.custom.gem_color': 'Gem color',
  };

  return labels[filter.id] ?? filter.label;
}

function getFilterValueLabel(value: {
  input: unknown;
  label: string;
}) {
  return parseFilterInput(value.input).available === true
    ? 'In stock'
    : value.label;
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

  const selectedFilters = url.searchParams.getAll('filter').filter((value) => parseFilterInput(value).available !== false,);

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
    <section className="mx-auto max-w-[1400px] px-[4vw] pb-20 pt-10 tablet:pt-14">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
          Jeweliette collections
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

      <Pagination key={paginationKey} connection={collection.products}>
        {({nodes, PreviousLink, NextLink, isLoading}) => (
          <>
            <Form
              key={paginationKey}
              method="get"
              preventScrollReset
              onChange={(event) => event.currentTarget.requestSubmit()}
              onClickCapture={(event) => {
                const target = event.target;

                if (!(target instanceof Element)) return;

                const summary = target.closest('summary');
                const selectedPanel = summary?.parentElement;

                if (
                  !summary ||
                  !(selectedPanel instanceof HTMLDetailsElement)
                ) {
                  return;
                }

                event.currentTarget
                  .querySelectorAll<HTMLDetailsElement>('details[open]')
                  .forEach((panel) => {
                    if (panel !== selectedPanel) {
                      panel.open = false;
                    }
                  });
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;

                event.currentTarget
                  .querySelectorAll<HTMLDetailsElement>('details[open]')
                  .forEach((panel) => {
                    panel.open = false;
                  });
              }}
              onBlur={(event) => {
                const nextFocusedElement = event.relatedTarget;

                if (
                  nextFocusedElement instanceof Node &&
                  event.currentTarget.contains(nextFocusedElement)
                ) {
                  return;
                }

                event.currentTarget
                  .querySelectorAll<HTMLDetailsElement>('details[open]')
                  .forEach((panel) => {
                    panel.open = false;
                  });
              }}
              className="relative z-10 mt-10 flex flex-wrap items-stretch border-y border-line bg-cream"
            >
              <p className="flex flex-1 items-center py-4 text-[11px] uppercase tracking-widest text-primary">
                {nodes.length} {nodes.length === 1 ? 'piece' : 'pieces'}
                {hasActiveFilters ? (
                  <Link
                    to={`/collections/${collection.handle}`}
                    preventScrollReset
                    className="ml-4 underline underline-offset-4"
                  >
                    Clear
                  </Link>
                ) : null}
              </p>

              {collection.products.filters.map((filter) => (
                <details key={filter.id} className="group relative border-l border-line">
                  <summary className="flex min-h-full cursor-pointer list-none items-center gap-3 px-5 py-4 text-[11px] uppercase tracking-widest [&::-webkit-details-marker]:hidden">
                    {getFilterLabel(filter)}
                    <span aria-hidden="true" className="text-base leading-none group-open:hidden">+</span>
                    <span aria-hidden="true" className="hidden text-base leading-none group-open:inline">−</span>
                  </summary>

                  <div className="absolute right-0 top-full z-20 max-h-80 min-w-60 overflow-y-auto border border-line bg-paper p-4 shadow-stack">
                    {filter.type === 'PRICE_RANGE' ? (
                      <PriceIntervals
                        values={filter.values}
                        priceMin={priceMin}
                        priceMax={priceMax}
                        currencyCode={
                          nodes[0]?.priceRange.minVariantPrice.currencyCode
                        }
                      />
                    ) : (
                      filter.values
                        .filter(
                          (value) =>
                            parseFilterInput(value.input).available !== false,
                        )
                        .map((value) => {
                        const input = filterInput(value.input);
                        const selected = selectedFilters.includes(input);
                        return (
                          <label
                            key={value.id}
                            className="flex min-h-10 items-center gap-3 text-sm"
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
                            {getFilterValueLabel(value)}
                              <span className="ml-2 text-primary">({value.count})</span>
                          </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </details>
              ))}

              <details className="group relative border-l border-line">
                <summary className="flex min-h-full cursor-pointer list-none items-center gap-3 px-5 py-4 text-[11px] uppercase tracking-widest [&::-webkit-details-marker]:hidden">
                  Sort by
                  <span aria-hidden="true" className="text-base leading-none group-open:hidden">+</span>
                  <span aria-hidden="true" className="hidden text-base leading-none group-open:inline">−</span>
                </summary>
                <div className="absolute right-0 top-full z-20 min-w-52 border border-line bg-paper p-4 shadow-stack">
                  {Object.entries(SORT_OPTIONS).map(([value, option]) => (
                    <label key={value} className="flex min-h-10 items-center gap-3 text-sm">
                      <input
                        type="radio"
                        name="sort"
                        value={value}
                        defaultChecked={sort === value}
                        className="h-4 w-4 accent-primary"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </details>
            </Form>

            <div className="mt-6 flex justify-center">
              <PreviousLink className="inline-flex min-h-10 items-center border-b border-primary text-[11px] uppercase tracking-widest text-primary">
                {isLoading ? 'Loading…' : 'Load previous'}
              </PreviousLink>
            </div>

            {nodes.length ? (
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
                <h2 className="font-display text-2xl">No pieces found.</h2>
                <p className="mt-3 text-sm text-primary">
                  Try a different selection or clear your filters.
                </p>
              </div>
            )}

            <div className="mt-12 flex justify-center">
              <NextLink className="inline-flex min-h-11 items-center border border-primary px-6 text-[11px] uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white">
                {isLoading ? 'Loading…' : 'Load more'}
              </NextLink>
            </div>
          </>
        )}
      </Pagination>

      <Analytics.CollectionView
        data={{collection: {id: collection.id, handle: collection.handle}}}
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