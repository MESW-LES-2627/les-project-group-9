import {describe, expect, it} from 'vitest';
import {
  matchingAllergens,
  parseProductAllergens,
} from '../../app/lib/allergens';

describe('parseProductAllergens', () => {
  it('keeps supported allergens and normalizes values', () => {
    expect(
      parseProductAllergens('["Nickel", "latex", "cobalt", "CoBALT"]'),
    ).toEqual(['nickel', 'cobalt']);
  });

  it('returns an empty list for missing or malformed metafields', () => {
    expect(parseProductAllergens(null)).toEqual([]);
    expect(parseProductAllergens('not json')).toEqual([]);
    expect(parseProductAllergens('{"nickel": true}')).toEqual([]);
  });

  it('maps translated metafield values back to their code', () => {
    expect(parseProductAllergens('["Zinco"]')).toEqual(['zinc']);
    expect(parseProductAllergens('["Níquel", "Cobalto"]')).toEqual([
      'nickel',
      'cobalt',
    ]);
    expect(parseProductAllergens('["Zinc", "zinco"]')).toEqual(['zinc']);
    expect(parseProductAllergens('["latex"]')).toEqual([]);
  });
});

describe('matchingAllergens', () => {
  it('returns the allergens shared with the shopper profile', () => {
    expect(matchingAllergens(['nickel', 'cobalt'], ['cobalt', 'zinc'])).toEqual(
      ['cobalt'],
    );
  });

  it('returns nothing when the shopper has no allergies', () => {
    expect(matchingAllergens(['nickel'], [])).toEqual([]);
    expect(matchingAllergens(['nickel'], null)).toEqual([]);
  });
});
