import {describe, expect, it} from 'vitest';
import {
  createTranslator,
  DEFAULT_COUNTRY,
  getLocaleFromRequest,
  LOCALE_CODES,
  LOCALE_COOKIE,
  negotiateLocale,
  parseAcceptLanguage,
  readLocaleCookie,
  resolveLocale,
  serializeLocaleCookie,
  toAppLocale,
} from '../../app/lib/i18n';

describe('readLocaleCookie', () => {
  it('returns null without a cookie header', () => {
    expect(readLocaleCookie(null)).toBeNull();
    expect(readLocaleCookie('')).toBeNull();
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
  ])('returns null for unsupported value %j', (value) => {
    expect(readLocaleCookie(`${LOCALE_COOKIE}=${value}`)).toBeNull();
  });

  it('ignores cookies with a similar name', () => {
    expect(readLocaleCookie(`x${LOCALE_COOKIE}=pt`)).toBeNull();
  });
});

describe('parseAcceptLanguage', () => {
  it('orders by quality and keeps header order for ties', () => {
    expect(parseAcceptLanguage('en;q=0.5, pt-PT, fr;q=0.9, de')).toEqual([
      {tag: 'pt-pt', q: 1},
      {tag: 'de', q: 1},
      {tag: 'fr', q: 0.9},
      {tag: 'en', q: 0.5},
    ]);
  });

  it('drops q=0 entries', () => {
    expect(parseAcceptLanguage('pt;q=0, en;q=0.000, fr')).toEqual([
      {tag: 'fr', q: 1},
    ]);
  });

  it.each([
    ['missing', null],
    ['empty', ''],
    ['only commas', ',,,'],
    ['invalid range', 'en_US, pt!, 123456789-x'],
    ['invalid quality', 'pt;q=2, en;q=abc, fr;q=0.1234, de;q=-1'],
  ])('returns nothing usable for %s headers', (_label, header) => {
    expect(parseAcceptLanguage(header)).toEqual([]);
  });

  it('keeps valid entries next to malformed ones', () => {
    expect(parseAcceptLanguage('pt;q=oops, ;;, en-GB;q=0.7')).toEqual([
      {tag: 'en-gb', q: 0.7},
    ]);
  });

  it('ignores parameters other than q', () => {
    expect(parseAcceptLanguage('pt;level=1;q=0.4')).toEqual([
      {tag: 'pt', q: 0.4},
    ]);
  });

  it('bounds the work done on oversized headers', () => {
    const header = Array.from({length: 500}, () => 'fr').join(',') + ',pt';
    expect(parseAcceptLanguage(header).length).toBeLessThanOrEqual(32);
  });
});

describe('negotiateLocale', () => {
  it.each([
    ['pt-PT,pt;q=0.9,en;q=0.8', 'pt'],
    ['pt', 'pt'],
    ['PT-pt', 'pt'],
    ['pt-BR', 'pt'],
    ['en-US,en;q=0.9', 'en'],
    ['en-GB', 'en'],
    ['EN', 'en'],
    ['fr-FR,fr;q=0.9,en;q=0.8', 'en'],
    ['de;q=1,pt;q=0.8,en;q=0.5', 'pt'],
    ['en;q=0.4, pt-PT;q=0.6', 'pt'],
    ['pt;q=0, en', 'en'],
    ['fr, *;q=0.5, pt;q=0.1', 'pt'],
  ])('%j → %s', (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });

  it.each([
    ['missing', null],
    ['wildcard only', '*'],
    ['unsupported only', 'fr-FR, de;q=0.9, ja'],
    ['excluded by q=0', 'pt;q=0, en;q=0'],
    ['malformed', ';;q=, ,=='],
  ])('returns null for %s headers', (_label, header) => {
    expect(negotiateLocale(header)).toBeNull();
  });
});

function request(headers: Record<string, string> = {}) {
  return new Request('https://jeweliette.example/', {headers});
}

describe('resolveLocale', () => {
  const portugueseBrowser = 'pt-PT,pt;q=0.9,en;q=0.8';

  it('uses the browser language when there is no cookie', () => {
    expect(
      resolveLocale(request({'Accept-Language': portugueseBrowser})),
    ).toEqual({code: 'pt', source: 'browser'});
  });

  it('lets an explicit English choice win over a Portuguese browser', () => {
    expect(
      resolveLocale(
        request({
          'Accept-Language': portugueseBrowser,
          Cookie: `${LOCALE_COOKIE}=en`,
        }),
      ),
    ).toEqual({code: 'en', source: 'cookie'});
  });

  it('lets an explicit Portuguese choice win over an English browser', () => {
    expect(
      resolveLocale(
        request({'Accept-Language': 'en-US', Cookie: `${LOCALE_COOKIE}=pt`}),
      ),
    ).toEqual({code: 'pt', source: 'cookie'});
  });

  it('negotiates when the cookie value is invalid', () => {
    expect(
      resolveLocale(
        request({
          'Accept-Language': portugueseBrowser,
          Cookie: `${LOCALE_COOKIE}=fr`,
        }),
      ),
    ).toEqual({code: 'pt', source: 'browser'});
  });

  it('falls back to English without a supported preference', () => {
    expect(resolveLocale(request())).toEqual({code: 'en', source: 'default'});
    expect(
      resolveLocale(request({'Accept-Language': 'fr-FR,fr;q=0.9'})),
    ).toEqual({code: 'en', source: 'default'});
  });
});

describe('getLocaleFromRequest', () => {
  it('uses English when there is no cookie or browser preference', () => {
    expect(getLocaleFromRequest(request())).toEqual({
      language: 'EN',
      country: 'US',
    });
  });

  it('maps pt to the PT_PT language code', () => {
    expect(
      getLocaleFromRequest(request({Cookie: `${LOCALE_COOKIE}=pt`})),
    ).toEqual({language: 'PT_PT', country: 'US'});
    expect(getLocaleFromRequest(request({'Accept-Language': 'pt-BR'}))).toEqual(
      {language: 'PT_PT', country: 'US'},
    );
  });

  it('never derives the country from the language or the browser', () => {
    for (const code of LOCALE_CODES) {
      expect(
        getLocaleFromRequest(request({Cookie: `${LOCALE_COOKIE}=${code}`}))
          .country,
      ).toBe(DEFAULT_COUNTRY);
    }
    expect(
      getLocaleFromRequest(request({'Accept-Language': 'pt-PT'})).country,
    ).toBe(DEFAULT_COUNTRY);
  });

  it('does not derive the locale from the subdomain', () => {
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
