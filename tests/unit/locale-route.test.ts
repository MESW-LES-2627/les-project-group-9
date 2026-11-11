import {describe, expect, it} from 'vitest';
import {action, loader} from '../../app/routes/locale';
import {LOCALE_COOKIE} from '../../app/lib/i18n';

type ActionArgs = Parameters<typeof action>[0];

function post(
  fields: Record<string, string>,
  {origin = 'https://jeweliette.example', method = 'POST'} = {},
) {
  const init: RequestInit = {method};
  if (method === 'POST') init.body = new URLSearchParams(fields);

  return action({
    request: new Request(`${origin}/locale`, init),
  } as unknown as ActionArgs);
}

/** `redirect()` returns a Response; `data()` returns a DataWithResponseInit. */
function asResponse(result: unknown): Response {
  expect(result).toBeInstanceOf(Response);
  return result as Response;
}

function statusOf(result: unknown): number | undefined {
  return (result as {init?: {status?: number}}).init?.status;
}

describe('POST /locale', () => {
  it('sets the cookie and redirects to the given path', async () => {
    const response = asResponse(
      await post({locale: 'pt', redirectTo: '/products/ring?Color=Gold'}),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/products/ring?Color=Gold');

    const cookie = response.headers.get('Set-Cookie') ?? '';
    expect(cookie).toContain(`${LOCALE_COOKIE}=pt`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=31536000');
    expect(cookie).toContain('Secure');
  });

  it('keeps the query and hash of the current location', async () => {
    const response = asResponse(
      await post({
        locale: 'en',
        redirectTo: '/collections/all?sort=newest&filter=%7B%7D#grid',
      }),
    );

    expect(response.headers.get('Location')).toBe(
      '/collections/all?sort=newest&filter=%7B%7D#grid',
    );
  });

  it('omits Secure over plain HTTP (local development)', async () => {
    const response = asResponse(
      await post(
        {locale: 'en', redirectTo: '/'},
        {origin: 'http://localhost:3000'},
      ),
    );

    expect(response.headers.get('Set-Cookie')).toContain(`${LOCALE_COOKIE}=en`);
    expect(response.headers.get('Set-Cookie')).not.toContain('Secure');
  });

  it.each(['https://evil.example/', '//evil.example', '/\\evil.example'])(
    'redirects home instead of to %s',
    async (redirectTo) => {
      const response = asResponse(await post({locale: 'pt', redirectTo}));
      expect(response.headers.get('Location')).toBe('/');
    },
  );

  it('redirects home when redirectTo is missing', async () => {
    const response = asResponse(await post({locale: 'en'}));
    expect(response.headers.get('Location')).toBe('/');
  });

  it.each(['fr', 'PT_PT', '', 'pt; Path=/evil'])(
    'rejects unsupported language %j without setting a cookie',
    async (locale) => {
      const result = await post({locale, redirectTo: '/'});
      expect(result).not.toBeInstanceOf(Response);
      expect(statusOf(result)).toBe(400);
    },
  );

  it('rejects a missing language', async () => {
    expect(statusOf(await post({redirectTo: '/'}))).toBe(400);
  });

  it('rejects non-POST methods', async () => {
    expect(statusOf(await post({}, {method: 'PUT'}))).toBe(405);
  });
});

describe('GET /locale', () => {
  it('is not allowed', () => {
    const result = loader();
    expect(statusOf(result)).toBe(405);
    expect(
      (result as {init?: {headers?: Record<string, string>}}).init?.headers,
    ).toEqual({Allow: 'POST'});
  });
});
