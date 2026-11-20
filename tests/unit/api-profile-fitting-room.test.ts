import {describe, expect, it} from 'vitest';
import {action} from '../../app/routes/api.profile.fitting-room';
import {parseFittingRoom} from '../../app/lib/profile/fitting-room';

type ActionArgs = Parameters<typeof action>[0];

const CUSTOMER_ID = 'gid://shopify/Customer/1';
const CLEAR = 'gid://shopify/ProductVariant/1';
const PINK = 'gid://shopify/ProductVariant/2';
const BRACELET = 'gid://shopify/ProductVariant/3';
const PRODUCT = 'gid://shopify/Product/1';

/** Variants 1–2 are necklaces with an overlay; variant 3 is a bracelet. */
function variantNode(id: string) {
  const capable = id !== BRACELET;

  return {
    __typename: 'ProductVariant',
    id,
    title: capable ? 'Clear' : 'Steel',
    availableForSale: true,
    selectedOptions: [{name: 'Color', value: 'Clear'}],
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

function contextWith({loggedIn = true, customerFound = true} = {}) {
  const calls: Array<{
    metafields: Array<{
      ownerId: string;
      namespace: string;
      key: string;
      type: string;
      value: string;
    }>;
  }> = [];

  const context = {
    customerAccount: {
      isLoggedIn: async () => loggedIn,
      query: async () => ({
        data: {
          customer: customerFound
            ? {
                id: CUSTOMER_ID,
                favorites: {value: '[]'},
                fittingRoom: {value: JSON.stringify([CLEAR])},
                preferences: null,
              }
            : null,
        },
      }),
      mutate: async (
        _mutation: string,
        options: {variables: (typeof calls)[number]},
      ) => {
        calls.push(options.variables);

        return {
          data: {
            metafieldsSet: {
              metafields: [{value: options.variables.metafields[0].value}],
              userErrors: [],
            },
          },
        };
      },
    },
    storefront: {
      query: async (
        _query: string,
        options: {variables: {ids: string[]}},
      ) => ({
        nodes: options.variables.ids.map(variantNode),
      }),
    },
  } as unknown as ActionArgs['context'];

  return {context, calls};
}

function callAction(
  context: ActionArgs['context'],
  body: string,
  method = 'POST',
) {
  return action({
    request: new Request('http://localhost/api/profile/fitting-room', {
      method,
      headers: {'Content-Type': 'application/json'},
      body: method === 'GET' ? undefined : body,
    }),
    context,
    params: {},
  } as ActionArgs);
}

describe('POST /api/profile/fitting-room', () => {
  it('rejects methods other than POST', async () => {
    const {context} = contextWith();
    const result = await callAction(context, '', 'GET');

    expect(result.init?.status).toBe(405);
    expect(result.data).toEqual({error: 'Method not allowed'});
  });

  it('rejects guests', async () => {
    const {context, calls} = contextWith({loggedIn: false});
    const result = await callAction(context, JSON.stringify({add: [PINK]}));

    expect(result.init?.status).toBe(401);
    expect(result.data).toEqual({error: 'Unauthorized'});
    expect(calls).toHaveLength(0);
  });

  it('rejects invalid JSON', async () => {
    const {context} = contextWith();
    const result = await callAction(context, '{');

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({error: 'Invalid JSON'});
  });

  it('rejects a request without add or remove', async () => {
    const {context, calls} = contextWith();
    const result = await callAction(context, JSON.stringify({}));

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({error: 'No fitting room changes'});
    expect(calls).toHaveLength(0);
  });

  it('adds valid variant IDs and ignores invalid or product IDs', async () => {
    const {context, calls} = contextWith();
    const result = await callAction(
      context,
      JSON.stringify({add: [PINK, PRODUCT, 'not-a-variant', 42]}),
    );

    expect(result.data).toEqual({fittingRoom: [PINK, CLEAR]});
    expect(calls).toHaveLength(1);
    expect(calls[0].metafields[0]).toMatchObject({
      ownerId: CUSTOMER_ID,
      namespace: 'custom',
      key: 'fitting_room',
      type: 'json',
    });
    expect(parseFittingRoom(calls[0].metafields[0].value)).toEqual([
      PINK,
      CLEAR,
    ]);
  });

  it('does not duplicate an existing variant', async () => {
    const {context} = contextWith();
    const result = await callAction(
      context,
      JSON.stringify({add: [CLEAR]}),
    );

    expect(result.data).toEqual({fittingRoom: [CLEAR]});
  });

  it('rejects variants that cannot be tried on', async () => {
    const {context, calls} = contextWith();
    const result = await callAction(
      context,
      JSON.stringify({add: [BRACELET]}),
    );

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({
      error:
        'Only variants available for try-on can be added to the fitting room',
    });
    expect(calls).toHaveLength(0);
  });

  it('removes variant IDs', async () => {
    const {context} = contextWith();
    const result = await callAction(
      context,
      JSON.stringify({remove: [CLEAR]}),
    );

    expect(result.data).toEqual({fittingRoom: []});
  });

  it('responds with no-store headers', async () => {
    const {context} = contextWith();
    const result = await callAction(
      context,
      JSON.stringify({add: [PINK]}),
    );

    expect(result.init?.headers).toMatchObject({'Cache-Control': 'no-store'});
  });

  it('fails when the customer cannot be found', async () => {
    const {context, calls} = contextWith({customerFound: false});
    const result = await callAction(
      context,
      JSON.stringify({add: [PINK]}),
    );

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({error: 'Customer not found'});
    expect(calls).toHaveLength(0);
  });
});
