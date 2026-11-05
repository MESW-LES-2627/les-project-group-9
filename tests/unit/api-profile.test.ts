import {describe, expect, it, vi} from 'vitest';
import {loader} from '../../app/routes/api.profile';

type LoaderArgs = Parameters<typeof loader>[0];

const CUSTOMER_ID = 'gid://shopify/Customer/1';

function contextWith({
  loggedIn = true,
  fail = false,
}: {
  loggedIn?: boolean;
  fail?: boolean;
} = {}) {
  const query = vi.fn(async () => {
    if (fail) throw new Error('Profile query failed');

    return {
      data: {
        customer: {
          id: CUSTOMER_ID,
          favorites: {value: '[]'},
          fittingRoom: {value: '[]'},
          preferences: {value: '{"skin":{"tone":"medium"}}'},
        },
      },
    };
  });

  const context = {
    customerAccount: {
      isLoggedIn: async () => loggedIn,
      query,
    },
  } as unknown as LoaderArgs['context'];

  return {context, query};
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
});
