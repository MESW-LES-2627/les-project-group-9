import {describe, expect, it} from 'vitest';
import {
  totalPersonalizationPrice,
  type PersonalizationGroup,
} from '~/lib/personalization';

const group = (
  id: string,
  amount: string | null,
): PersonalizationGroup => ({
  kind: 'engraving',
  id,
  label: id,
  optional: true,
  summary: '',
  errorSummary: null,
  priceDelta: amount ? {amount, currencyCode: 'EUR'} : null,
  error: null,
  maxLength: 20,
  value: '',
});

describe('totalPersonalizationPrice', () => {
  it('returns null when every group is included', () => {
    expect(totalPersonalizationPrice([group('a', null), group('b', null)])).toBeNull();
  });

  it('adds the priced groups in cents', () => {
    expect(
      totalPersonalizationPrice([
        group('a', '35.00'),
        group('b', '15.50'),
        group('c', null),
      ]),
    ).toEqual({amount: '50.50', currencyCode: 'EUR'});
  });

  it('returns null when priced groups use different currencies', () => {
    const usd = group('b', '10.00');
    usd.priceDelta = {amount: '10.00', currencyCode: 'USD'};

    expect(totalPersonalizationPrice([group('a', '35.00'), usd])).toBeNull();
  });
});
