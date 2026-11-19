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
  const deleteCalls: Array<{
    metafields: Array<{ownerId: string; namespace: string; key: string}>;
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
        mutation: string,
        options: {variables: (typeof calls)[number]},
      ) => {
        if (mutation.includes('metafieldsDelete')) {
          deleteCalls.push(options.variables);

          return {
            data: {
              metafieldsDelete: {
                deletedMetafields: options.variables.metafields,
                userErrors: [],
              },
            },
          };
        }

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

  return {context, calls, deleteCalls};
}

function callAction(
  context: ActionArgs['context'],
  body: string | undefined,
  method = 'POST',
) {
  return action({
    request: new Request('http://localhost/api/profile/preferences', {
      method,
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

describe('DELETE /api/profile/preferences', () => {
  it('rejects guests', async () => {
    const {context} = contextWith({loggedIn: false});
    const result = await callAction(context, undefined, 'DELETE');

    expect(result.init?.status).toBe(401);
    expect(result.data).toEqual({error: 'Unauthorized'});
  });

  it('rejects other methods', async () => {
    const {context} = contextWith();
    const result = await callAction(context, undefined, 'PUT');

    expect(result.init?.status).toBe(405);
  });

  it('deletes the stored preferences', async () => {
    const {context, deleteCalls} = contextWith({
      stored: {allergies: ['nickel'], skin: {tone: 'medium'}},
    });
    const result = await callAction(context, undefined, 'DELETE');

    expect(result.data).toEqual({
      preferences: {allergies: [], skin: {}},
    });
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0].metafields).toEqual([
      {
        ownerId: CUSTOMER_ID,
        namespace: 'custom',
        key: 'preferences',
      },
    ]);
  });
});
