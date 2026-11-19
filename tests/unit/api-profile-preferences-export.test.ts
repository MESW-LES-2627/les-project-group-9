import {describe, expect, it, vi} from 'vitest';
import {loader} from '../../app/routes/api.profile.preferences.export';

type LoaderArgs = Parameters<typeof loader>[0];

const CUSTOMER_ID = 'gid://shopify/Customer/1';

function contextWith({
  loggedIn = true,
  preferences = null,
  errors = null,
}: {
  loggedIn?: boolean;
  preferences?: Record<string, unknown> | null;
  errors?: Array<{message: string}> | null;
} = {}) {
  return {
    customerAccount: {
      isLoggedIn: async () => loggedIn,
      query: async () =>
        errors
          ? {errors}
          : {
              data: {
                customer: {
                  id: CUSTOMER_ID,
                  favorites: {value: '[]'},
                  preferences: preferences
                    ? {value: JSON.stringify(preferences)}
                    : null,
                },
              },
            },
    },
  } as unknown as LoaderArgs['context'];
}

function callLoader(context: LoaderArgs['context']) {
  return loader({
    request: new Request('http://localhost/api/profile/preferences/export'),
    context,
    params: {},
  } as LoaderArgs);
}

describe('GET /api/profile/preferences/export', () => {
  it('rejects guests', async () => {
    const result = await callLoader(contextWith({loggedIn: false}));

    expect(result).not.toBeInstanceOf(Response);
    expect(
      (result as {init?: {status?: number}}).init?.status,
    ).toBe(401);
  });

  it('downloads the stored preferences as JSON', async () => {
    const result = await callLoader(
      contextWith({
        preferences: {
          allergies: ['nickel'],
          skin: {tone: 'medium'},
          ringSizes: {'left-ring': '6'},
        },
      }),
    );

    expect(result).toBeInstanceOf(Response);

    const response = result as Response;

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="jeweliette-preferences.json"',
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      allergies: ['nickel'],
      skin: {tone: 'medium'},
      ringSizes: {'left-ring': '6'},
    });
  });

  it('returns an error when the profile cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await callLoader(
      contextWith({errors: [{message: 'nope'}]}),
    );

    expect(result).not.toBeInstanceOf(Response);
    expect(
      (result as {init?: {status?: number}}).init?.status,
    ).toBe(500);
  });
});
