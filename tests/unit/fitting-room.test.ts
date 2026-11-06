import {describe, expect, it} from 'vitest';
import {
  applyFittingRoomOperation,
  MAX_FITTING_ROOM,
  parseFittingRoom,
  serializeFittingRoom,
} from '../../app/lib/profile/fitting-room';

const A = 'gid://shopify/Product/1';
const B = 'gid://shopify/Product/2';

function productIds(count: number): string[] {
  return Array.from(
    {length: count},
    (_, index) => `gid://shopify/Product/${index + 1}`,
  );
}

describe('parseFittingRoom', () => {
  it('parses a JSON array', () => {
    expect(parseFittingRoom(JSON.stringify([A, B]))).toEqual([A, B]);
  });

  it('drops invalid IDs and duplicates', () => {
    expect(
      parseFittingRoom(JSON.stringify([A, A, 'not-a-product', B])),
    ).toEqual([A, B]);
  });

  it('returns an empty array for missing or invalid JSON', () => {
    expect(parseFittingRoom(null)).toEqual([]);
    expect(parseFittingRoom('{')).toEqual([]);
    expect(parseFittingRoom(JSON.stringify({ids: [A]}))).toEqual([]);
  });

  it('caps the number of items', () => {
    expect(parseFittingRoom(JSON.stringify(productIds(60)))).toHaveLength(
      MAX_FITTING_ROOM,
    );
  });
});

describe('serializeFittingRoom', () => {
  it('round-trips through parseFittingRoom', () => {
    expect(parseFittingRoom(serializeFittingRoom([A, B, A]))).toEqual([A, B]);
  });
});

describe('applyFittingRoomOperation', () => {
  it('adds new IDs to the front', () => {
    expect(applyFittingRoomOperation([A], {add: [B]})).toEqual([B, A]);
  });

  it('does not add a piece that is already there twice', () => {
    expect(applyFittingRoomOperation([A, B], {add: [A]})).toEqual([A, B]);
  });

  it('removes IDs', () => {
    expect(applyFittingRoomOperation([A, B], {remove: [A]})).toEqual([B]);
  });

  it('ignores invalid IDs', () => {
    expect(applyFittingRoomOperation([A], {add: ['invalid']})).toEqual([A]);
  });

  it('caps the number of items', () => {
    expect(applyFittingRoomOperation([], {add: productIds(60)})).toHaveLength(
      MAX_FITTING_ROOM,
    );
  });
});
