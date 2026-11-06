import type {
  PredictiveSearchQuery,
  RegularSearchQuery,
} from 'storefrontapi.generated';

import type {ProductFilter} from '@shopify/hydrogen/storefront-api-types';

type ResultWithItems<Type extends 'predictive' | 'regular', Items> = {
  type: Type;
  term: string;
  error?: string;
  result: {total: number; items: Items};
};

export type RegularSearchReturn = ResultWithItems<
  'regular',
  RegularSearchQuery
>;
export type PredictiveSearchReturn = ResultWithItems<
  'predictive',
  NonNullable<PredictiveSearchQuery['predictiveSearch']>
>;

export type CatalogFilterState = {
  selectedFilters: string[];
  filters: ProductFilter[];
  priceMin: string;
  priceMax: string;
};

export function serializeFilterInput(input: unknown): string {
  return typeof input === 'string'
    ? input
    : JSON.stringify(input);
}

export function parseFilterObject(
  input: unknown,
): Record<string, unknown> {
  try {
    const parsed: unknown =
      typeof input === 'string' ? JSON.parse(input) : input;

    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Invalid filter input is handled by the request parser.
  }

  return {};
}

export function readCatalogFilters(
  searchParams: URLSearchParams,
): CatalogFilterState {
  const rawFilters = searchParams.getAll('filter');

  if (rawFilters.length > 20) {
    throw new Response('Too many filters.', {status: 400});
  }

  const selectedFilters: string[] = [];
  const filters: ProductFilter[] = [];

  const allowedKeys = new Set([
    'available',
    'productType',
    'productVendor',
    'productMetafield',
    'variantMetafield',
    'variantOption',
    'tag',
  ]);

  for (const raw of rawFilters) {
    const parsed = parseFilterObject(raw);
    const keys = Object.keys(parsed);

    if (
      keys.length !== 1 ||
      !allowedKeys.has(keys[0])
    ) {
      throw new Response('Invalid product filter.', {
        status: 400,
      });
    }

    if (parsed.available === false) continue;

    selectedFilters.push(raw);
    filters.push(parsed as ProductFilter);
  }

  const priceMin = searchParams.get('priceMin')?.trim() ?? '';
  const priceMax = searchParams.get('priceMax')?.trim() ?? '';

  const parsePrice = (value: string) => {
    if (value === '') return undefined;

    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
      throw new Response('Invalid price filter.', {
        status: 400,
      });
    }

    return number;
  };

  const min = parsePrice(priceMin);
  const max = parsePrice(priceMax);

  if (
    min !== undefined &&
    max !== undefined &&
    min > max
  ) {
    throw new Response(
      'Minimum price must not exceed maximum price.',
      {status: 400},
    );
  }

  if (min !== undefined || max !== undefined) {
    filters.push({
      price: {
        ...(min !== undefined ? {min} : {}),
        ...(max !== undefined ? {max} : {}),
      },
    });
  }

  return {selectedFilters, filters, priceMin, priceMax};
}

/**
 * Returns the empty state of a predictive search result to reset the search state.
 */
export function getEmptyPredictiveSearchResult(): PredictiveSearchReturn['result'] {
  return {
    total: 0,
    items: {
      articles: [],
      collections: [],
      products: [],
      pages: [],
      queries: [],
    },
  };
}

interface UrlWithTrackingParams {
  /** The base URL to which the tracking parameters will be appended. */
  baseUrl: string;
  /** The trackingParams returned by the Storefront API. */
  trackingParams?: string | null;
  /** Any additional query parameters to be appended to the URL. */
  params?: Record<string, string>;
  /** The search term to be appended to the URL. */
  term: string;
}

/**
 * A utility function that appends tracking parameters to a URL. Tracking parameters are
 * used internally by Shopify to enhance search results and admin dashboards.
 * @example
 * ```ts
 * const baseUrl = 'www.example.com';
 * const trackingParams = 'utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront';
 * const params = { foo: 'bar' };
 * const term = 'search term';
 * const url = urlWithTrackingParams({ baseUrl, trackingParams, params, term });
 * console.log(url);
 * // Output: 'https://www.example.com?foo=bar&q=search+term&utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront'
 * ```
 */
export function urlWithTrackingParams({
  baseUrl,
  trackingParams,
  params: extraParams,
  term,
}: UrlWithTrackingParams) {
  let search = new URLSearchParams({
    ...extraParams,
    q: term,
  }).toString();

  if (trackingParams) {
    search = `${search}&${trackingParams}`;
  }

  return `${baseUrl}?${search}`;
}
