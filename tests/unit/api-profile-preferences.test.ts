import {describe, expect, it} from 'vitest';
import {action} from '../../app/routes/api.profile.preferences';
import {parsePreferences} from '../../app/lib/profile/preferences';

type ActionArgs = Parameters<typeof action>[0];

const CUSTOMER_ID = 'gid://shopify/Customer/1';

function contextWith({
  loggedIn = true,
  stored = null,
}: {
  loggedIn?: boolean;
  stored?: Record<string, unknown> | null;
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
      isLoggedIn: async () => loggedIn,
      query: async () => ({
        data: {
          customer: {
            id: CUSTOMER_ID,
            favorites: {value: '[]'},
            preferences: stored ? {value: JSON.stringify(stored)} : null,
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
  } as unknown as ActionArgs['context'];

  return {context, calls};
}

function callAction(context: ActionArgs['context'], body: string) {
  return action({
    request: new Request('http://localhost/api/profile/preferences', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body,
    }),
    context,
    params: {},
  } as ActionArgs);
}

describe('POST /api/profile/preferences', () => {
  it('rejects guests', async () => {
    const {context} = contextWith({loggedIn: false});
    const result = await callAction(context, '{}');

    expect(result.init?.status).toBe(401);
    expect(result.data).toEqual({error: 'Unauthorized'});
  });

  it('rejects invalid JSON', async () => {
    const {context} = contextWith();
    const result = await callAction(context, '{');

    expect(result.init?.status).toBe(400);
    expect(result.data).toEqual({error: 'Invalid JSON'});
  });

  it('normalizes and saves preferences', async () => {
    const {context, calls} = contextWith();
    const result = await callAction(
      context,
      JSON.stringify({
        allergies: ['nickel', 'unknown'],
        skin: {tone: 'medium', undertone: 'hot'},
      }),
    );

    expect(result.data).toEqual({
      preferences: {allergies: ['nickel'], skin: {tone: 'medium'}},
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].metafields[0]).toMatchObject({
      ownerId: CUSTOMER_ID,
      namespace: 'custom',
      key: 'preferences',
      type: 'json',
    });
    expect(parsePreferences(calls[0].metafields[0].value)).toEqual({
      allergies: ['nickel'],
      skin: {tone: 'medium'},
    });
  });

  it('clears the preferences the shopper deletes', async () => {
    const {context, calls} = contextWith({
      stored: {
        allergies: ['nickel', 'zinc'],
        skin: {tone: 'medium', undertone: 'warm'},
        preferredColors: ['gold'],
        preferredMaterials: ['gold-plated'],
      },
    });
    const result = await callAction(
      context,
      JSON.stringify({allergies: [], skin: {}, preferredMaterials: []}),
    );

    expect(result.data).toEqual({
      preferences: {
        allergies: [],
        skin: {},
        preferredColors: ['gold'],
        preferredMaterials: [],
      },
    });
    expect(parsePreferences(calls[0].metafields[0].value)).toEqual({
      allergies: [],
      skin: {},
      preferredColors: ['gold'],
      preferredMaterials: [],
    });
  });

  it('saves only the ring sizes it receives and drops invalid ones', async () => {
    const {context, calls} = contextWith();
    const result = await callAction(
      context,
      JSON.stringify({
        ringSizes: {'left-ring': '6.5', 'right-ring': 'US 7', 'bad-key': '5'},
      }),
    );

    expect(result.data).toEqual({
      preferences: {allergies: [], skin: {}, ringSizes: {'left-ring': '6.5'}},
    });
    expect(calls).toHaveLength(1);
  });
});
