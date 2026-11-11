import {describe, expect, it} from 'vitest';
import {action} from '../../app/routes/locale';
import {LOCALE_COOKIE} from '../../app/lib/i18n';
import {AppSession} from '../../app/lib/session';
import {appendVary, finalizeResponse} from '../../app/lib/response.server';

type ActionArgs = Parameters<typeof action>[0];

async function localeResponse(): Promise<Response> {
  const result = await action({
    request: new Request('https://jeweliette.example/locale', {
      method: 'POST',
      body: new URLSearchParams({locale: 'pt', redirectTo: '/cart?step=1#x'}),
    }),
  } as unknown as ActionArgs);
  expect(result).toBeInstanceOf(Response);
  return result as Response;
}

async function pendingSession() {
  const session = await AppSession.init(
    new Request('https://jeweliette.example/'),
    ['test-secret'],
  );
  session.set('customerAccount', {accessToken: 'refreshed'});
  return session;
}

function cookieNames(response: Response): string[] {
  return response.headers.getSetCookie().map((cookie) => cookie.split('=')[0]);
}

describe('finalizeResponse', () => {
  it('keeps the language cookie and adds the session cookie on the same response', async () => {
    const session = await pendingSession();
    expect(session.isPending).toBe(true);

    const response = await finalizeResponse(await localeResponse(), session);

    expect(cookieNames(response)).toEqual([LOCALE_COOKIE, 'session']);
    expect(response.headers.getSetCookie()[0]).toContain(`${LOCALE_COOKIE}=pt`);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/cart?step=1#x');
    expect(session.isPending).toBe(false);
  });

  it('does not add a session cookie when the session did not change', async () => {
    const session = await AppSession.init(
      new Request('https://jeweliette.example/'),
      ['test-secret'],
    );

    const response = await finalizeResponse(await localeResponse(), session);

    expect(cookieNames(response)).toEqual([LOCALE_COOKIE]);
  });

  it('varies every response on the headers that decide the language', async () => {
    const response = await finalizeResponse(new Response('<html></html>'), {
      isPending: false,
      commit: async () => '',
    });

    expect(response.headers.get('Vary')).toBe('Cookie, Accept-Language');
  });
});

describe('appendVary', () => {
  it('adds only missing names, case-insensitively', () => {
    const headers = new Headers({Vary: 'cookie, Accept-Encoding'});
    appendVary(headers, ['Cookie', 'Accept-Language']);
    expect(headers.get('Vary')).toBe(
      'cookie, Accept-Encoding, Accept-Language',
    );
  });

  it('leaves Vary: * unchanged', () => {
    const headers = new Headers({Vary: '*'});
    appendVary(headers, ['Cookie']);
    expect(headers.get('Vary')).toBe('*');
  });

  it('sets Vary when absent', () => {
    const headers = new Headers();
    appendVary(headers, ['Cookie', 'Accept-Language']);
    expect(headers.get('Vary')).toBe('Cookie, Accept-Language');
  });
});
