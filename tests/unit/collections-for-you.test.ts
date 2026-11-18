import {describe, expect, it, vi} from 'vitest';
import {loader} from '../../app/routes/collections.$handle';

type LoaderArgs = Parameters<typeof loader>[0];

const CUSTOMER_ID = 'gid://shopify/Customer/1';

function product(id: string, metal?: string) {
  return {
    id,
    title: id,
    handle: id,
    priceRange: {
      minVariantPrice: {amount: '10.00', currencyCode: 'EUR'},
    },
    metal: metal ? {value: metal} : null,
    jewelryMaterial: null,
    watchMaterial: null,
    category: null,
    gemstone: null,
    gemColor: null,
    collections: {nodes: []},
    allergens: null,
    featuredImage: null,
    images: null,
    options: null,
    variants: null,
  };
}

function collection(nodes: Array<ReturnType<typeof product>>) {
  return {
    id: 'gid://shopify/Collection/1',
    handle: 'rings',
    title: 'Rings',
    description: null,
    products: {
      nodes,
      filters: [],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  };
}

function contextWith({
  loggedIn = true,
  nodes = [],
  preferences = null,
  favorites = [],
  profileFails = false,
}: {
  loggedIn?: boolean;
  nodes?: Array<ReturnType<typeof product>>;
  preferences?: unknown;
  favorites?: string[];
  profileFails?: boolean;
} = {}) {
  const context = {
    customerAccount: {
      isLoggedIn: async () => loggedIn,
      query: async () => {
        if (profileFails) throw new Error('Profile unavailable');

        return {
          data: {
            customer: {
              id: CUSTOMER_ID,
              favorites: {value: JSON.stringify(favorites)},
              fittingRoom: {value: '[]'},
              preferences: preferences
                ? {value: JSON.stringify(preferences)}
                : null,
            },
          },
        };
      },
    },
    storefront: {
      query: async () => ({collection: collection(nodes)}),
    },
  } as unknown as LoaderArgs['context'];

  return context;
}

function callLoader(
  context: LoaderArgs['context'],
  search = '?sort=for-you',
) {
  return loader({
    request: new Request(`http://localhost/collections/rings${search}`),
    params: {handle: 'rings'},
    context,
  } as LoaderArgs) as Promise<{
    data?: {
      products?: {nodes: Array<{id: string}>};
      canPersonalize?: boolean;
    };
    init?: {headers?: Record<string, string>};
  }>;
}

describe('collection "For you" sort', () => {
  it('ranks matching products first and keeps the rest in order', async () => {
    const result = await callLoader(
      contextWith({
        nodes: [
          product('gid://shopify/Product/silver', 'silver'),
          product('gid://shopify/Product/gold', 'gold'),
          product('gid://shopify/Product/plain'),
        ],
        preferences: {preferredColors: ['gold']},
      }),
    );

    expect(result.data?.products?.nodes.map((item) => item.id)).toEqual([
      'gid://shopify/Product/gold',
      'gid://shopify/Product/silver',
      'gid://shopify/Product/plain',
    ]);
  });

  it('keeps the default order for guests', async () => {
    const result = await callLoader(
      contextWith({
        loggedIn: false,
        nodes: [product('gid://shopify/Product/a'), product('gid://shopify/Product/b')],
      }),
    );

    expect(result.data?.canPersonalize).toBe(false);
    expect(result.data?.products?.nodes.map((item) => item.id)).toEqual([
      'gid://shopify/Product/a',
      'gid://shopify/Product/b',
    ]);
  });

  it('falls back to the default order when the profile cannot be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await callLoader(
      contextWith({
        profileFails: true,
        nodes: [product('gid://shopify/Product/a'), product('gid://shopify/Product/b')],
      }),
    );

    expect(result.data?.products?.nodes.map((item) => item.id)).toEqual([
      'gid://shopify/Product/a',
      'gid://shopify/Product/b',
    ]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('does not expose a personalised order to caches', async () => {
    const result = await callLoader(contextWith());

    expect(result.init?.headers).toEqual({
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    });
  });
});
