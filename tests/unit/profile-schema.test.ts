import {describe, expect, it} from 'vitest';
import {
  applyFavoriteOperation,
  parseFavorites,
  serializeFavorites,
} from '../../app/lib/profile/schema';

const A = 'gid://shopify/Product/1';
const B = 'gid://shopify/Product/2';

describe('parseFavorites', () => {
  it('parses a JSON array', () => {
    expect(parseFavorites(JSON.stringify([A, B]))).toEqual([A, B]);
  });

  it('drops invalid IDs and duplicates', () => {
    expect(parseFavorites(JSON.stringify([A, A, 'not-a-product', B]))).toEqual(
      [A, B],
    );
  });

  it('returns an empty array for missing or invalid JSON', () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites('{')).toEqual([]);
    expect(parseFavorites(JSON.stringify({ids: [A]}))).toEqual([]);
  });
});

describe('serializeFavorites', () => {
  it('round-trips through parseFavorites', () => {
    expect(parseFavorites(serializeFavorites([A, B, A]))).toEqual([A, B]);
  });
});

describe('applyFavoriteOperation', () => {
  it('adds new IDs to the front', () => {
    expect(applyFavoriteOperation([A], {add: [B]})).toEqual([B, A]);
  });

  it('removes IDs', () => {
    expect(applyFavoriteOperation([A, B], {remove: [A]})).toEqual([B]);
  });

  it('ignores invalid IDs', () => {
    expect(applyFavoriteOperation([A], {add: ['invalid']})).toEqual([A]);
  });
});
