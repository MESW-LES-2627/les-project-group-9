import {describe, expect, it} from 'vitest';
import {updateCustomerFavorites} from './customer.server';
import {parseFavorites, serializeFavorites} from './schema';

const CUSTOMER_ID = 'gid://shopify/Customer/1';
const A = 'gid://shopify/Product/1';
const B = 'gid://shopify/Product/2';

type Context = Parameters<typeof updateCustomerFavorites>[0];

function contextWith(favorites: string[]) {
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
      query: async () => ({
        data: {
          customer: {
            id: CUSTOMER_ID,
            favorites: {value: serializeFavorites(favorites)},
          },
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
  } as unknown as Context;

  return {context, calls};
}

describe('updateCustomerFavorites', () => {
  it('writes the next favorites', async () => {
    const {context, calls} = contextWith([A]);

    const result = await updateCustomerFavorites(context, {add: [B]});

    expect(result).toEqual([B, A]);
    expect(calls).toHaveLength(1);
    expect(calls[0].metafields[0]).toMatchObject({
      ownerId: CUSTOMER_ID,
      namespace: 'custom',
      key: 'favorites',
      type: 'json',
    });
    expect(parseFavorites(calls[0].metafields[0].value)).toEqual([B, A]);
  });
});
