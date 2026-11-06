import {describe, expect, it} from 'vitest';
import {action} from '../../app/routes/api.profile.fitting-room';
import {parseFittingRoom} from '../../app/lib/profile/fitting-room';

type ActionArgs = Parameters<typeof action>[0];

const CUSTOMER_ID = 'gid://shopify/Customer/1';
const RING = 'gid://shopify/Product/1';
const NECKLACE = 'gid://shopify/Product/2';

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
                fittingRoom: {value: JSON.stringify([RING])},
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
    const result = await callAction(context, JSON.stringify({add: [NECKLACE]}));

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

  it('adds valid product IDs and ignores invalid ones', async () => {
    const {context, calls} = contextWith();
    const result = await callAction(
      context,
      JSON.stringify({add: [NECKLACE, 'not-a-product-id', 42]}),
    );

    expect(result.data).toEqual({fittingRoom: [NECKLACE, RING]});
    expect(calls).toHaveLength(1);
    expect(calls[0].metafields[0]).toMatchObject({
      ownerId: CUSTOMER_ID,
      namespace: 'custom',
      key: 'fitting_room',
      type: 'json',
    });
    expect(parseFittingRoom(calls[0].metafields[0].value)).toEqual([
      NECKLACE,
      RING,
    ]);
  });

  it('does not duplicate an existing piece', async () => {
    const {context} = contextWith();
    const result = await callAction(context, JSON.stringify({add: [RING]}));

    expect(result.data).toEqual({fittingRoom: [RING]});
  });

  it('removes product IDs', async () => {
    const {context} = contextWith();
    const result = await callAction(context, JSON.stringify({remove: [RING]}));

    expect(result.data).toEqual({fittingRoom: []});
  });

  it('responds with no-store headers', async () => {
    const {context} = contextWith();
    const result = await callAction(context, JSON.stringify({add: [NECKLACE]}));

    expect(result.init?.headers).toMatchObject({'Cache-Control': 'no-store'});
  });

  it('fails when the customer cannot be found', async () => {
    const {context, calls} = contextWith({customerFound: false});
    const result = await callAction(context, JSON.stringify({add: [NECKLACE]}));

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({error: 'Customer not found'});
    expect(calls).toHaveLength(0);
  });
});
