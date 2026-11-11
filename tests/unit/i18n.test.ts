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
    expect(readLocaleCookie(`${LOCALE_COOKIE}=fr`)).toBe('fr');
  });

  it('finds the cookie among other cookies', () => {
    expect(
      readLocaleCookie(`session=abc; ${LOCALE_COOKIE}=pt; cart=gid%3A%2F%2F1`),
    ).toBe('pt');
  });

  it.each([
    'de',
    'FR',
    'fr-FR',
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
    ['fr-FR,fr;q=0.9,en;q=0.8', 'fr'],
    ['fr', 'fr'],
    ['FR-fr', 'fr'],
    ['fr-CA', 'fr'],
    ['fr-BE,fr;q=0.9', 'fr'],
    ['fr-CH, de;q=0.9', 'fr'],
    ['de-DE,de;q=0.9,en;q=0.8', 'en'],
    ['de;q=1,pt;q=0.8,en;q=0.5', 'pt'],
    ['de;q=1,fr;q=0.8,pt;q=0.7,en;q=0.5', 'fr'],
    ['en;q=0.4, pt-PT;q=0.6, fr;q=0.5', 'pt'],
    ['pt;q=0.3, fr;q=0.3, en;q=0.2', 'pt'],
    ['fr;q=0.3, pt;q=0.3, en;q=0.2', 'fr'],
    ['en;q=0.9, fr;q=0.95', 'fr'],
    ['pt;q=0, en', 'en'],
    ['fr;q=0, pt;q=0.5', 'pt'],
    ['de, *;q=0.5, pt;q=0.1', 'pt'],
  ])('%j → %s', (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });

  it.each([
    ['missing', null],
    ['wildcard only', '*'],
    ['unsupported only', 'de-DE, es;q=0.9, ja'],
    ['excluded by q=0', 'pt;q=0, en;q=0, fr;q=0'],
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
  const frenchBrowser = 'fr-FR,fr;q=0.9,en;q=0.8';

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
          Cookie: `${LOCALE_COOKIE}=de`,
        }),
      ),
    ).toEqual({code: 'pt', source: 'browser'});
    expect(
      resolveLocale(
        request({
          'Accept-Language': frenchBrowser,
          Cookie: `${LOCALE_COOKIE}=FR`,
        }),
      ),
    ).toEqual({code: 'fr', source: 'browser'});
  });

  it('uses French for a first-time French browser', () => {
    expect(resolveLocale(request({'Accept-Language': frenchBrowser}))).toEqual({
      code: 'fr',
      source: 'browser',
    });
  });

  it('lets an explicit English choice win over a French browser', () => {
    expect(
      resolveLocale(
        request({
          'Accept-Language': frenchBrowser,
          Cookie: `${LOCALE_COOKIE}=en`,
        }),
      ),
    ).toEqual({code: 'en', source: 'cookie'});
  });

  it.each([
    ['Portuguese', portugueseBrowser],
    ['English', 'en-US,en;q=0.9'],
  ])(
    'lets an explicit French choice win over a %s browser',
    (_label, header) => {
      expect(
        resolveLocale(
          request({'Accept-Language': header, Cookie: `${LOCALE_COOKIE}=fr`}),
        ),
      ).toEqual({code: 'fr', source: 'cookie'});
    },
  );

  it('falls back to English without a supported preference', () => {
    expect(resolveLocale(request())).toEqual({code: 'en', source: 'default'});
    expect(
      resolveLocale(request({'Accept-Language': 'de-DE,de;q=0.9'})),
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

  it('maps fr to the FR language code without changing the country', () => {
    expect(
      getLocaleFromRequest(request({Cookie: `${LOCALE_COOKIE}=fr`})),
    ).toEqual({language: 'FR', country: 'US'});
    expect(getLocaleFromRequest(request({'Accept-Language': 'fr-CA'}))).toEqual(
      {language: 'FR', country: 'US'},
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

  it('maps French to fr-FR for <html lang> and Intl formatting', () => {
    const locale = toAppLocale({language: 'FR', country: 'US'});
    expect(locale).toEqual({
      code: 'fr',
      language: 'FR',
      country: 'US',
      tag: 'fr-FR',
    });
    expect(new Intl.NumberFormat(locale.tag).format(1234.5)).toBe(
      new Intl.NumberFormat('fr-FR').format(1234.5),
    );
    expect(new Intl.NumberFormat(locale.tag).format(1234.5)).toMatch(
      /^1\s?234,5$/u,
    );
  });

  it('treats unsupported languages as English and keeps the country', () => {
    expect(toAppLocale({language: 'DE', country: 'PT'})).toEqual({
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
    expect(createTranslator('fr')('language.label')).toBe('Langue');
  });

  it('interpolates values', () => {
    expect(createTranslator('en')('nav.homeOf', {shop: 'Jeweliette'})).toBe(
      'Jeweliette — home',
    );
    expect(createTranslator('pt')('nav.homeOf', {shop: 'Jeweliette'})).toBe(
      'Jeweliette — página inicial',
    );
  });

  it.each([
    ['en', 0, 'Open cart with 0 items'],
    ['en', 1, 'Open cart with 1 item'],
    ['en', 2, 'Open cart with 2 items'],
    ['pt', 0, 'Abrir saco de compras com 0 artigos'],
    ['pt', 1, 'Abrir saco de compras com 1 artigo'],
    ['pt', 2, 'Abrir saco de compras com 2 artigos'],
    ['pt', 21, 'Abrir saco de compras com 21 artigos'],
    ['fr', 0, 'Ouvrir le panier (0 article)'],
    ['fr', 1, 'Ouvrir le panier (1 article)'],
    ['fr', 2, 'Ouvrir le panier (2 articles)'],
    ['fr', 1000000, 'Ouvrir le panier (1000000 d’articles)'],
  ] as const)('picks the plural form (%s, %i)', (code, count, expected) => {
    expect(createTranslator(code)('nav.openCart', {count})).toBe(expected);
  });

  it('uses the "other" form when no numeric count is given', () => {
    expect(createTranslator('en')('nav.openCart')).toBe(
      'Open cart with {count} items',
    );
    expect(createTranslator('pt')('nav.openCart', {count: '3'})).toBe(
      'Abrir saco de compras com 3 artigos',
    );
  });

  it('uses the agreed pt-PT terms', () => {
    const t = createTranslator('pt');
    expect(t('nav.shoppingBag')).toBe('Saco de compras');
    expect(t('nav.fittingRoom')).toBe('Provador');
    expect(t('nav.mobile')).toBe('Menu de navegação');
    expect(t('nav.accountActions')).toBe('Ações da conta');
  });

  it('uses French typography and terms', () => {
    const t = createTranslator('fr');
    expect(t('language.current', {language: 'Français'})).toBe(
      'Langue actuelle : Français',
    );
    expect(t('nav.shoppingBag')).toBe('Panier');
    expect(t('nav.fittingRoom')).toBe('Cabine d’essayage');
    expect(t('nav.homeOf', {shop: 'Jeweliette'})).toBe('Jeweliette — accueil');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(createTranslator('en')('nav.homeOf', {other: 'x'})).toBe(
      '{shop} — home',
    );
  });
});
