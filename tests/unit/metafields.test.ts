import {describe, expect, it} from 'vitest';
import {
  normalizeValue,
  parseListMetafield,
  parseTextMetafield,
} from '../../app/lib/metafields';

describe('normalizeValue', () => {
  it('normalizes case, accents and separators', () => {
    expect(normalizeValue('  Gold Plated ')).toBe('gold-plated');
    expect(normalizeValue('Níquel')).toBe('niquel');
    expect(normalizeValue('--Silver__925--')).toBe('silver-925');
  });
});

describe('parseTextMetafield', () => {
  it('splits, normalizes and deduplicates comma-separated values', () => {
    expect(parseTextMetafield('gold plated, silver,, Gold Plated')).toEqual([
      'gold-plated',
      'silver',
    ]);
  });

  it('returns an empty list for missing values', () => {
    expect(parseTextMetafield(null)).toEqual([]);
    expect(parseTextMetafield('')).toEqual([]);
  });
});

describe('parseListMetafield', () => {
  it('parses a JSON list and keeps only non-empty strings', () => {
    expect(
      parseListMetafield('["Nickel", "nickel", 42, "", "cobalt"]'),
    ).toEqual(['nickel', 'cobalt']);
  });

  it('returns an empty list for malformed or non-list values', () => {
    expect(parseListMetafield('not json')).toEqual([]);
    expect(parseListMetafield('{"nickel": true}')).toEqual([]);
    expect(parseListMetafield(null)).toEqual([]);
  });
});
