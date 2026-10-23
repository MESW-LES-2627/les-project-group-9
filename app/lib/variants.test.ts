import {describe, expect, it} from 'vitest';
import {getVariantUrl} from './variants';

function build(
  pathname: string,
  selectedOptions?: Array<{name: string; value: string}>,
) {
  return getVariantUrl({
    handle: 'ring',
    pathname,
    searchParams: new URLSearchParams(),
    selectedOptions,
  });
}

describe('getVariantUrl', () => {
  it('builds a product path from a plain pathname', () => {
    expect(build('/products/other')).toBe('/products/ring');
  });

  it('keeps the locale prefix', () => {
    expect(build('/en-us/products/other')).toBe('/en-us/products/ring');
  });

  it('appends the selected options as query parameters', () => {
    expect(
      build('/products/ring', [
        {name: 'Metal', value: 'Gold'},
        {name: 'Size', value: '6'},
      ]),
    ).toBe('/products/ring?Metal=Gold&Size=6');
  });

  it('adds no query string when no option is selected', () => {
    expect(build('/products/ring', [])).toBe('/products/ring');
  });
});
