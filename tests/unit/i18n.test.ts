import {describe, expect, it} from 'vitest';
import {
  createTranslator,
  DEFAULT_COUNTRY,
  getLocaleFromRequest,
  LOCALE_CODES,
  LOCALE_COOKIE,
  readLocaleCookie,
  serializeLocaleCookie,
  toAppLocale,
} from '../../app/lib/i18n';

function requestWithCookie(cookie?: string) {
  return new Request('https://jeweliette.example/', {
    headers: cookie ? {Cookie: cookie} : {},
  });
}

describe('readLocaleCookie', () => {
  it('defaults to English without a cookie header', () => {
    expect(readLocaleCookie(null)).toBe('en');
    expect(readLocaleCookie('')).toBe('en');
  });

  it('reads the supported values', () => {
    expect(readLocaleCookie(`${LOCALE_COOKIE}=en`)).toBe('en');
    expect(readLocaleCookie(`${LOCALE_COOKIE}=pt`)).toBe('pt');
  });

  it('finds the cookie among other cookies', () => {
    expect(
      readLocaleCookie(`session=abc; ${LOCALE_COOKIE}=pt; cart=gid%3A%2F%2F1`),
    ).toBe('pt');
  });

  it.each([
    'fr',
    'PT',
    'pt-PT',
    'PT_PT',
    '',
    'toString',
    '__proto__',
    '<script>',
  ])('falls back to English for unsupported value %j', (value) => {
    expect(readLocaleCookie(`${LOCALE_COOKIE}=${value}`)).toBe('en');
  });

  it('ignores cookies with a similar name', () => {
    expect(readLocaleCookie(`x${LOCALE_COOKIE}=pt`)).toBe('en');
  });
});

describe('getLocaleFromRequest', () => {
  it('uses English (US) when the cookie is absent', () => {
    expect(getLocaleFromRequest(requestWithCookie())).toEqual({
      language: 'EN',
      country: 'US',
    });
  });

  it('maps pt to the PT_PT language code', () => {
    expect(
      getLocaleFromRequest(requestWithCookie(`${LOCALE_COOKIE}=pt`)),
    ).toEqual({language: 'PT_PT', country: 'US'});
  });

  it('keeps the country the same for every language', () => {
    for (const code of LOCALE_CODES) {
      expect(
        getLocaleFromRequest(requestWithCookie(`${LOCALE_COOKIE}=${code}`))
          .country,
      ).toBe(DEFAULT_COUNTRY);
    }
  });

  it('no longer derives the locale from the subdomain', () => {
    expect(
      getLocaleFromRequest(new Request('https://fr.jeweliette.example/')),
    ).toEqual({language: 'EN', country: 'US'});
  });
});

describe('serializeLocaleCookie', () => {
  it('sets a one-year, HTTP-only, SameSite=Lax cookie on the whole site', () => {
    const cookie = serializeLocaleCookie('pt', {secure: false});
    const parts = cookie.split('; ');

    expect(parts[0]).toBe(`${LOCALE_COOKIE}=pt`);
    expect(parts).toEqual(
      expect.arrayContaining([
        'Path=/',
        'Max-Age=31536000',
        'HttpOnly',
        'SameSite=Lax',
      ]),
    );
    expect(parts).not.toContain('Secure');
  });

  it('adds Secure on HTTPS', () => {
    expect(serializeLocaleCookie('en', {secure: true}).split('; ')).toContain(
      'Secure',
    );
  });

  it('round-trips through readLocaleCookie', () => {
    for (const code of LOCALE_CODES) {
      const pair = serializeLocaleCookie(code, {secure: true}).split('; ')[0];
      expect(readLocaleCookie(pair)).toBe(code);
    }
  });
});

describe('toAppLocale', () => {
  it('exposes the language tag for each language', () => {
    expect(toAppLocale({language: 'EN', country: 'US'})).toEqual({
      code: 'en',
      language: 'EN',
      country: 'US',
      tag: 'en-US',
    });
    expect(toAppLocale({language: 'PT_PT', country: 'US'})).toEqual({
      code: 'pt',
      language: 'PT_PT',
      country: 'US',
      tag: 'pt-PT',
    });
  });

  it('treats unsupported languages as English and keeps the country', () => {
    expect(toAppLocale({language: 'FR', country: 'PT'})).toEqual({
      code: 'en',
      language: 'EN',
      country: 'PT',
      tag: 'en-US',
    });
  });
});

describe('createTranslator', () => {
  it('translates per language', () => {
    expect(createTranslator('en')('language.label')).toBe('Language');
    expect(createTranslator('pt')('language.label')).toBe('Idioma');
  });

  it('interpolates values', () => {
    expect(createTranslator('en')('nav.openCart', {count: 2})).toBe(
      'Open cart with 2 items',
    );
    expect(createTranslator('pt')('nav.openCart', {count: 2})).toBe(
      'Abrir saco com 2 artigos',
    );
  });

  it('leaves unknown placeholders untouched', () => {
    expect(createTranslator('en')('nav.homeOf', {other: 'x'})).toBe(
      '{shop} — home',
    );
  });
});
