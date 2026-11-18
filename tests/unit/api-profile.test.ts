import {describe, expect, it, vi} from 'vitest';
import {loader} from '../../app/routes/api.profile';

type LoaderArgs = Parameters<typeof loader>[0];

const CUSTOMER_ID = 'gid://shopify/Customer/1';
const CLEAR = 'gid://shopify/ProductVariant/1';
const STEEL = 'gid://shopify/ProductVariant/2';
const LEGACY_PRODUCT = 'gid://shopify/Product/1';

function variantNode(id: string) {
  const capable = id === CLEAR;

  return {
    __typename: 'ProductVariant',
    id,
    title: capable ? 'Clear' : 'Steel',
    availableForSale: true,
    selectedOptions: [{name: 'Color', value: capable ? 'Clear' : 'Steel'}],
    price: {amount: '1.0', currencyCode: 'EUR'},
    compareAtPrice: null,
    product: {
      id: 'gid://shopify/Product/9',
      title: 'Piece',
      handle: 'piece',
      productType: '',
      category: {name: capable ? 'Necklaces' : 'Bracelets'},
      featuredImage: null,
      priceRange: {
        minVariantPrice: {amount: '1.0', currencyCode: 'EUR'},
        maxVariantPrice: {amount: '1.0', currencyCode: 'EUR'},
      },
    },
    tryOnOverlay: capable
      ? {reference: {image: {url: 'https://cdn.example/piece.png'}}}
      : null,
    tryOnSize: null,
  };
}

function contextWith({
  loggedIn = true,
  fail = false,
  fittingRoom = '[]',
  storefrontFails = false,
}: {
  loggedIn?: boolean;
  fail?: boolean;
  fittingRoom?: string;
  storefrontFails?: boolean;
} = {}) {
  const writes: string[] = [];

  const query = vi.fn(async () => {
    if (fail) throw new Error('Profile query failed');

    return {
      data: {
        customer: {
          id: CUSTOMER_ID,
          favorites: {value: '[]'},
          fittingRoom: {value: fittingRoom},
          preferences: {value: '{"skin":{"tone":"medium"}}'},
        },
      },
    };
  });

  const context = {
    customerAccount: {
      isLoggedIn: async () => loggedIn,
      query,
      mutate: async (
        _mutation: string,
        options: {variables: {metafields: Array<{value: string}>}},
      ) => {
        const {value} = options.variables.metafields[0];
        writes.push(value);

        return {
          data: {
            metafieldsSet: {metafields: [{value}], userErrors: []},
          },
        };
      },
    },
    storefront: {
      query: async (
        _query: string,
        options: {variables: {ids: string[]}},
      ) => {
        if (storefrontFails) throw new Error('Storefront unavailable');

        return {nodes: options.variables.ids.map(variantNode)};
      },
    },
  } as unknown as LoaderArgs['context'];

  return {context, query, writes};
}

function callLoader(context: LoaderArgs['context']) {
  return loader({
    request: new Request('http://localhost/api/profile'),
    context,
    params: {},
  } as LoaderArgs);
}

describe('GET /api/profile', () => {
  it('returns the customer profile', async () => {
    const {context} = contextWith();
    const result = await callLoader(context);

    expect(result.data).toEqual({
      loggedIn: true,
      favorites: [],
      fittingRoom: [],
      preferences: {allergies: [], skin: {tone: 'medium'}},
    });
  });

  it('returns an empty guest profile without querying the customer', async () => {
    const {context, query} = contextWith({loggedIn: false});
    const result = await callLoader(context);

    expect(result.data).toEqual({
      loggedIn: false,
      favorites: [],
      fittingRoom: [],
      preferences: null,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('fails instead of returning an empty profile when the read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const {context} = contextWith({fail: true});
    const result = await callLoader(context);

    expect(result.init?.status).toBe(500);
    expect(result.data).toEqual({error: 'Could not load profile'});
  });

  it('prunes variants that can no longer be tried on', async () => {
    const {context, writes} = contextWith({
      fittingRoom: JSON.stringify([CLEAR, STEEL]),
    });

    const result = await callLoader(context);

    expect(result.data).toMatchObject({fittingRoom: [CLEAR]});
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0])).toEqual([CLEAR]);
  });

  it('drops legacy product GIDs from the stored list', async () => {
    const {context} = contextWith({
      fittingRoom: JSON.stringify([LEGACY_PRODUCT, CLEAR]),
    });

    const result = await callLoader(context);

    expect(result.data).toMatchObject({fittingRoom: [CLEAR]});
  });

  it('keeps the list when the catalog lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const {context, writes} = contextWith({
      fittingRoom: JSON.stringify([STEEL]),
      storefrontFails: true,
    });

    const result = await callLoader(context);

    expect(result.data).toMatchObject({fittingRoom: [STEEL]});
    expect(writes).toHaveLength(0);
  });
});
