import {describe, expect, it} from 'vitest';
import {
  formatDate,
  formatList,
  formatMoney,
  translatorFor,
  translatorFromMatches,
} from '../../app/lib/i18n';

/*
 * Expected values are written out by hand (Node 22 / ICU). pt-PT and fr-FR
 * use a no-break space before the euro sign; French groups thousands with a
 * narrow no-break space.
 */
const NBSP = String.fromCodePoint(0xa0);
const NNBSP = String.fromCodePoint(0x202f);
const euros = (amount: string) => ({amount, currencyCode: 'EUR'});

describe('formatMoney', () => {
  it.each([
    ['en-US', '€1,234.50'],
    ['pt-PT', `1234,50${NBSP}€`],
    ['fr-FR', `1${NNBSP}234,50${NBSP}€`],
  ])(
    'formats EUR for %s without changing amount or currency',
    (tag, expected) => {
      expect(formatMoney(euros('1234.50'), tag)).toBe(expected);
    },
  );

  it('drops trailing zeros only on whole amounts when asked', () => {
    expect(
      formatMoney(euros('100.00'), 'en-US', {withoutTrailingZeros: true}),
    ).toBe('€100');
    expect(
      formatMoney(euros('100.50'), 'en-US', {withoutTrailingZeros: true}),
    ).toBe('€100.50');
    expect(
      formatMoney(euros('100.00'), 'pt-PT', {withoutTrailingZeros: true}),
    ).toBe(`100${NBSP}€`);
    expect(formatMoney(euros('100.00'), 'en-US')).toBe('€100.00');
  });

  it('keeps the currency returned by Shopify', () => {
    expect(formatMoney({amount: '10', currencyCode: 'USD'}, 'pt-PT')).toBe(
      `10,00${NBSP}US$`,
    );
  });
});

describe('formatDate', () => {
  const date = '2026-11-12T12:00:00Z';

  it.each([
    ['en-US', 'November 12, 2026'],
    ['pt-PT', '12 de novembro de 2026'],
    ['fr-FR', '12 novembre 2026'],
  ])('formats %s', (tag, expected) => {
    expect(formatDate(date, tag)).toBe(expected);
  });
});

describe('formatList', () => {
  it.each([
    ['en-US', 'Nickel, Zinc, and Cobalt'],
    ['pt-PT', 'Nickel, Zinc e Cobalt'],
    ['fr-FR', 'Nickel, Zinc et Cobalt'],
  ])('joins items for %s', (tag, expected) => {
    expect(formatList(['Nickel', 'Zinc', 'Cobalt'], tag)).toBe(expected);
  });
});

describe('server and meta translators', () => {
  it('translates from Hydrogen i18n (language only is enough)', () => {
    expect(translatorFor({language: 'FR'})('language.label')).toBe('Langue');
    expect(translatorFor({language: 'PT_PT'})('language.label')).toBe('Idioma');
    expect(translatorFor({language: 'DE'})('language.label')).toBe('Language');
  });

  it('reads the locale from the root match for meta functions', () => {
    const matches = [
      {
        id: 'root',
        loaderData: {
          locale: {code: 'pt', language: 'PT_PT', country: 'US', tag: 'pt-PT'},
        },
      },
      {id: 'routes/cart', loaderData: {}},
    ];
    expect(translatorFromMatches(matches)('nav.shoppingBag')).toBe(
      'Saco de compras',
    );
  });

  it('falls back to English when the root match has no locale', () => {
    expect(translatorFromMatches([undefined])('nav.shoppingBag')).toBe(
      'Shopping bag',
    );
    expect(
      translatorFromMatches([{id: 'root', loaderData: undefined}])(
        'nav.shoppingBag',
      ),
    ).toBe('Shopping bag');
  });
});
