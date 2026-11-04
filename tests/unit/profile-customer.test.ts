import {describe, expect, it} from 'vitest';
import {
  readCustomerProfile,
  updateCustomerFavorites,
  writeCustomerPreferences,
} from '../../app/lib/profile/customer.server';
import {
  parsePreferences,
  serializePreferences,
} from '../../app/lib/profile/preferences';
import {parseFavorites, serializeFavorites} from '../../app/lib/profile/schema';
import type {PreferenceProfile} from '../../app/lib/profile/types';

const CUSTOMER_ID = 'gid://shopify/Customer/1';
const A = 'gid://shopify/Product/1';
const B = 'gid://shopify/Product/2';

type Context = Parameters<typeof updateCustomerFavorites>[0];

function contextWith({
  favorites = [],
  preferences = null,
}: {
  favorites?: string[];
  preferences?: PreferenceProfile | null;
} = {}) {
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
            preferences: preferences
              ? {value: serializePreferences(preferences)}
              : null,
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

describe('customer favorites', () => {
  it('writes the next favorites', async () => {
    const {context, calls} = contextWith({favorites: [A]});

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

describe('customer preferences', () => {
  it('reads preferences', async () => {
    const {context} = contextWith({
      preferences: {
        allergies: ['nickel'],
        skin: {tone: 'medium', undertone: 'warm'},
      },
    });

    expect((await readCustomerProfile(context)).preferences).toEqual({
      allergies: ['nickel'],
      skin: {tone: 'medium', undertone: 'warm'},
    });
  });

  it('writes preferences', async () => {
    const {context, calls} = contextWith();

    const result = await writeCustomerPreferences(context, {
      allergies: ['cobalt'],
      skin: {undertone: 'cool'},
    });

    expect(result).toEqual({
      allergies: ['cobalt'],
      skin: {undertone: 'cool'},
    });
    expect(calls[0].metafields[0]).toMatchObject({
      ownerId: CUSTOMER_ID,
      namespace: 'custom',
      key: 'preferences',
      type: 'json',
    });
    expect(parsePreferences(calls[0].metafields[0].value)).toEqual({
      allergies: ['cobalt'],
      skin: {undertone: 'cool'},
    });
  });

  it('preserves fields not included in the update', async () => {
    const existing = {
      allergies: ['nickel'],
      skin: {tone: 'medium', undertone: 'warm'},
      preferredMaterials: ['gold-plated'],
      ringSizes: {'ring-1': '52'},
    };
    const {context, calls} = contextWith({preferences: existing});

    const result = await writeCustomerPreferences(context, {
      allergies: ['cobalt'],
      skin: {undertone: 'cool'},
    });

    expect(result).toEqual({
      allergies: ['cobalt'],
      skin: {undertone: 'cool'},
      preferredMaterials: ['gold-plated'],
      ringSizes: {'ring-1': '52'},
    });
    expect(parsePreferences(calls[0].metafields[0].value)).toEqual({
      allergies: ['cobalt'],
      skin: {undertone: 'cool'},
      preferredMaterials: ['gold-plated'],
      ringSizes: {'ring-1': '52'},
    });
  });
});
