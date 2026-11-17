import {describe, expect, it} from 'vitest';
import {tryOnPageUrl, withCorsParam} from '../../app/lib/try-on/url';

describe('withCorsParam', () => {
  it('keeps existing query params and adds the CORS cache key', () => {
    expect(withCorsParam('https://cdn.shopify.com/a.png?v=123')).toBe(
      'https://cdn.shopify.com/a.png?v=123&cors=1',
    );
  });

  it('is idempotent', () => {
    const once = withCorsParam('https://cdn.shopify.com/a.png?v=123');
    expect(withCorsParam(once)).toBe(once);
  });

  it('preserves the hash', () => {
    expect(withCorsParam('https://cdn.shopify.com/a.png#preview')).toBe(
      'https://cdn.shopify.com/a.png?cors=1#preview',
    );
  });

  it('handles relative URLs', () => {
    expect(withCorsParam('/files/a.png?v=1')).toBe('/files/a.png?v=1&cors=1');
  });
});

describe('tryOnPageUrl', () => {
  it('builds an absolute deep link on the request origin', () => {
    expect(
      tryOnPageUrl(
        'https://shop.example/products/aura?variant=1',
        'aura',
      ),
    ).toBe('https://shop.example/products/aura?tryOn=1');
  });

  it('keeps the port and encodes the handle', () => {
    expect(
      tryOnPageUrl('http://localhost:3000/products/x?q=1', 'a b'),
    ).toBe('http://localhost:3000/products/a%20b?tryOn=1');
  });
});
