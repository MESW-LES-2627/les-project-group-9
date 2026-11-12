import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {ProductPrice} from '~/components/product/ProductPrice';
import {LocaleContext, toAppLocale} from '~/lib/i18n';

const price = {amount: '40.00', currencyCode: 'EUR'} as MoneyV2;
const compareAtPrice = {amount: '55.00', currencyCode: 'EUR'} as MoneyV2;

const LANGUAGE = {en: 'EN', pt: 'PT_PT', fr: 'FR'} as const;

/** No-break space (U+00A0), used by pt-PT and fr-FR before the euro sign. */
const NBSP = String.fromCodePoint(0xa0);

function renderPrice(
  code: keyof typeof LANGUAGE,
  props: Parameters<typeof ProductPrice>[0],
) {
  const locale = toAppLocale({language: LANGUAGE[code], country: 'US'});
  return render(
    <LocaleContext.Provider value={locale}>
      <ProductPrice {...props} />
    </LocaleContext.Provider>,
  );
}

/*
 * Expected strings are written out, not computed with the app formatter.
 * Same amount and currency (EUR) in every language; only the format differs.
 * pt-PT and fr-FR put a no-break space (U+00A0) before the euro sign.
 */
const EXPECTED = {
  en: {price: '€40.00', compareAt: '€55.00', label: 'Price'},
  pt: {price: `40,00${NBSP}€`, compareAt: `55,00${NBSP}€`, label: 'Preço'},
  fr: {price: `40,00${NBSP}€`, compareAt: `55,00${NBSP}€`, label: 'Prix'},
} as const;

describe('ProductPrice', () => {
  it.each(Object.keys(EXPECTED) as Array<keyof typeof EXPECTED>)(
    'shows the regular price in the %s format',
    (code) => {
      renderPrice(code, {price});

      const group = screen.getByRole('group', {name: EXPECTED[code].label});
      expect(group.textContent).toBe(EXPECTED[code].price);
    },
  );

  it.each(Object.keys(EXPECTED) as Array<keyof typeof EXPECTED>)(
    'shows the sale price and the struck-through compare-at price (%s)',
    (code) => {
      renderPrice(code, {price, compareAtPrice});

      const group = screen.getByRole('group', {name: EXPECTED[code].label});
      const struck = group.querySelector('s');
      expect(struck?.textContent).toBe(EXPECTED[code].compareAt);
      expect(group.textContent).toBe(
        `${EXPECTED[code].price}${EXPECTED[code].compareAt}`,
      );
    },
  );

  it('renders no amount when there is no price', () => {
    renderPrice('en', {});

    expect(screen.getByRole('group', {name: 'Price'})).not.toHaveTextContent(
      /\d/,
    );
  });
});
