import {describe, expect, it} from 'vitest';
import {
  currentTryOnLink,
  lookTryOnLink,
  secureTryOnLink,
  tryOnPageUrl,
  withCorsParam,
} from '../../app/lib/try-on/url';

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
      tryOnPageUrl('https://shop.example/products/aura?variant=1', 'aura'),
    ).toBe('https://shop.example/products/aura?tryOn=1');
  });

  it('keeps the port and encodes the handle', () => {
    expect(tryOnPageUrl('http://localhost:3000/products/x?q=1', 'a b')).toBe(
      'http://localhost:3000/products/a%20b?tryOn=1',
    );
  });

  it('preselects the variant options in the deep link', () => {
    expect(
      tryOnPageUrl('https://shop.example/fitting-room?ids=1', 'aura', [
        {name: 'Color', value: 'Clear'},
        {name: 'Size', value: 'M'},
      ]),
    ).toBe('https://shop.example/products/aura?Color=Clear&Size=M&tryOn=1');
  });
});

describe('currentTryOnLink', () => {
  it('keeps the page and its option params', () => {
    expect(
      currentTryOnLink(
        'https://shop.example/products/aura?Color=Clear&variant=123',
      ),
    ).toBe(
      'https://shop.example/products/aura?Color=Clear&variant=123&tryOn=1',
    );
  });
});

describe('lookTryOnLink', () => {
  it('carries the selected variant ids and opens the look', () => {
    expect(
      lookTryOnLink('https://shop.example/fitting-room?tryOn=1', [
        'gid://shopify/ProductVariant/1',
        'gid://shopify/ProductVariant/2',
      ]),
    ).toBe(
      'https://shop.example/fitting-room?ids=gid%3A%2F%2Fshopify%2FProductVariant%2F1%2Cgid%3A%2F%2Fshopify%2FProductVariant%2F2&tryOn=1',
    );
  });

  it('replaces stale ids and drops an empty list', () => {
    expect(
      lookTryOnLink('https://shop.example/fitting-room?ids=old&tryOn=1', [
        'gid://shopify/ProductVariant/3',
      ]),
    ).toBe(
      'https://shop.example/fitting-room?ids=gid%3A%2F%2Fshopify%2FProductVariant%2F3&tryOn=1',
    );
    expect(lookTryOnLink('https://shop.example/fitting-room?ids=old', [])).toBe(
      'https://shop.example/fitting-room?tryOn=1',
    );
  });
});

describe('secureTryOnLink', () => {
  it('upgrades an http deep link when the page is https', () => {
    expect(
      secureTryOnLink('http://shop.example/products/aura?tryOn=1', 'https:'),
    ).toBe('https://shop.example/products/aura?tryOn=1');
  });

  it('leaves https links and http pages untouched', () => {
    expect(
      secureTryOnLink('https://shop.example/products/aura?tryOn=1', 'https:'),
    ).toBe('https://shop.example/products/aura?tryOn=1');
    expect(
      secureTryOnLink('http://localhost:3000/products/aura?tryOn=1', 'http:'),
    ).toBe('http://localhost:3000/products/aura?tryOn=1');
  });

  it('falls back to the link when there is no page context', () => {
    expect(secureTryOnLink('/products/aura?tryOn=1')).toBe(
      '/products/aura?tryOn=1',
    );
  });
});
