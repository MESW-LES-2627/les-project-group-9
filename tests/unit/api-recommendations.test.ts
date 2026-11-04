import {describe, expect, it, vi} from 'vitest';
import {loader} from '../../app/routes/api.recommendations';

type LoaderArgs = Parameters<typeof loader>[0];

const CUSTOMER_ID = 'gid://shopify/Customer/1';

function product(id: string, metal: string, title: string) {
  return {
    id,
    title,
    handle: title.toLowerCase().replace(/\s+/g, '-'),
    productType: 'Ring',
    material: null,
    metal: {value: metal},
    gemstone: null,
    gemColor: null,
    category: null,
    collections: {nodes: []},
    priceRange: {
      minVariantPrice: {amount: '100.0', currencyCode: 'USD'},
      maxVariantPrice: {amount: '100.0', currencyCode: 'USD'},
    },
    featuredImage: null,
    images: null,
    options: null,
    variants: null,
  };
}

function contextWith({
  favorites = [],
  preferences = null,
  products = [],
}: {
  favorites?: string[];
  preferences?: unknown;
  products?: Array<ReturnType<typeof product>>;
} = {}) {
  const storefrontQuery = vi.fn(async () => ({products: {nodes: products}}));
  const context = {
    customerAccount: {
      isLoggedIn: async () => true,
      query: async () => ({
        data: {
          customer: {
            id: CUSTOMER_ID,
            favorites: {value: JSON.stringify(favorites)},
            preferences: preferences
              ? {value: JSON.stringify(preferences)}
              : null,
          },
        },
      }),
    },
    storefront: {
      CacheShort: () => ({}),
      query: storefrontQuery,
    },
  } as unknown as LoaderArgs['context'];

  return {context, storefrontQuery};
}

function callLoader(context: LoaderArgs['context']) {
  return loader({
    request: new Request('http://localhost/api/recommendations?limit=4'),
    context,
    params: {},
  } as LoaderArgs);
}

describe('GET /api/recommendations', () => {
  it('returns empty recommendations without favorites or preferences', async () => {
    const {context, storefrontQuery} = contextWith({
      products: [product('gid://shopify/Product/1', 'gold', 'Warm ring')],
    });

    const result = await callLoader(context);

    expect(result.data).toEqual({products: [], reasons: {}});
    expect(storefrontQuery).not.toHaveBeenCalled();
  });

  it('uses preferences without favorites', async () => {
    const warm = product('gid://shopify/Product/1', 'gold', 'Warm ring');
    const cool = product('gid://shopify/Product/2', 'silver', 'Cool ring');
    const {context} = contextWith({
      preferences: {skin: {undertone: 'warm'}},
      products: [cool, warm],
    });

    const result = await callLoader(context);
    const data = result.data as {
      products: Array<{id: string}>;
      reasons: Record<string, string[]>;
    };

    expect(data.products.map((item) => item.id)).toEqual([warm.id]);
    expect(data.reasons[warm.id]).toContain('Matches your undertone');
  });
});
