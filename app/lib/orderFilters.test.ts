import {describe, expect, it} from 'vitest';
import {buildOrderSearchQuery, parseOrderFilters} from './orderFilters';

describe('buildOrderSearchQuery', () => {
  it('returns undefined when there are no filters', () => {
    expect(buildOrderSearchQuery({})).toBeUndefined();
    expect(buildOrderSearchQuery({name: '   '})).toBeUndefined();
  });

  it('strips the leading # from an order name', () => {
    expect(buildOrderSearchQuery({name: '#1001'})).toBe('name:1001');
  });

  it('sanitizes unsafe characters', () => {
    expect(buildOrderSearchQuery({name: '#10" OR *'})).toBe('name:10OR');
  });

  it('combines name and confirmation number', () => {
    expect(
      buildOrderSearchQuery({name: '1001', confirmationNumber: 'ABC-123'}),
    ).toBe('name:1001 AND confirmation_number:ABC-123');
  });
});

describe('parseOrderFilters', () => {
  it('reads both filters from the query string', () => {
    const params = new URLSearchParams(
      'name=1001&confirmation_number=ABC123',
    );

    expect(parseOrderFilters(params)).toEqual({
      name: '1001',
      confirmationNumber: 'ABC123',
    });
  });

  it('returns an empty object when no filters are present', () => {
    expect(parseOrderFilters(new URLSearchParams())).toEqual({});
  });
});
