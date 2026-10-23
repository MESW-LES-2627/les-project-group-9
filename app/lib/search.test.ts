import {describe, expect, it} from 'vitest';
import {urlWithTrackingParams} from './search';

describe('urlWithTrackingParams', () => {
  it('adds the search term as the q parameter', () => {
    expect(urlWithTrackingParams({baseUrl: '/search', term: 'gold ring'})).toBe(
      '/search?q=gold+ring',
    );
  });

  it('keeps extra parameters before the search term', () => {
    expect(
      urlWithTrackingParams({
        baseUrl: '/search',
        term: 'ring',
        params: {type: 'product'},
      }),
    ).toBe('/search?type=product&q=ring');
  });

  it('appends the Shopify tracking parameters', () => {
    expect(
      urlWithTrackingParams({
        baseUrl: '/search',
        term: 'ring',
        trackingParams: 'utm_source=shopify',
      }),
    ).toBe('/search?q=ring&utm_source=shopify');
  });
});
