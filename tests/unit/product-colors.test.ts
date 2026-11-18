import {describe, expect, it} from 'vitest';
import {productColorValues} from '../../app/lib/product-colors';

describe('productColorValues', () => {
  it('uses custom.metal when it is set', () => {
    expect(
      productColorValues({
        metal: {value: 'Gold, Silver'},
        options: [
          {name: 'Color', optionValues: [{name: 'Burgundy'}]},
        ],
      }),
    ).toEqual(['gold', 'silver']);
  });

  it('falls back to colour option values', () => {
    expect(
      productColorValues({
        metal: null,
        options: [
          {
            name: 'Color',
            optionValues: [{name: 'Gold'}, {name: 'Silver'}],
          },
          {
            name: 'Size',
            optionValues: [{name: '6'}, {name: '7'}],
          },
        ],
      }),
    ).toEqual(['gold', 'silver']);
  });

  it.each(['Colour', 'Cor', 'Couleur', 'Band color'])(
    'recognises the %s option name',
    (name) => {
      expect(
        productColorValues({
          options: [
            {name, optionValues: [{name: 'Rose Gold'}]},
          ],
        }),
      ).toEqual(['rose-gold']);
    },
  );

  it('deduplicates values across colour options', () => {
    expect(
      productColorValues({
        options: [
          {name: 'Color', optionValues: [{name: 'Gold'}]},
          {name: 'Band color', optionValues: [{name: 'Gold'}]},
        ],
      }),
    ).toEqual(['gold']);
  });

  it('returns no colours when the product has no colour option', () => {
    expect(
      productColorValues({
        options: [
          {name: 'Title', optionValues: [{name: 'Default Title'}]},
          {name: 'Size', optionValues: [{name: '6'}]},
        ],
      }),
    ).toEqual([]);
  });
});
