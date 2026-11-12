import {describe, expect, it} from 'vitest';
import {toMenuPath} from '../../app/lib/menu';

const domains = ['shop.example.com', 'https://www.shop.example'];

describe('toMenuPath', () => {
  it('turns a shop URL into its path', () => {
    expect(
      toMenuPath('https://shop.example.com/collections/rings', domains),
    ).toBe('/collections/rings');
    expect(
      toMenuPath('https://test-shop.myshopify.com/pages/about', domains),
    ).toBe('/pages/about');
  });

  it('drops the language folder Shopify adds in PT and FR', () => {
    expect(
      toMenuPath('https://www.shop.example/pt/collections/rings', domains),
    ).toBe('/collections/rings');
    expect(toMenuPath('https://shop.example.com/fr/search', domains)).toBe(
      '/search',
    );
    expect(
      toMenuPath('https://shop.example.com/pt-pt/policies/privacy', domains),
    ).toBe('/policies/privacy');
  });

  it('turns the language home into the root path', () => {
    expect(toMenuPath('https://shop.example.com/pt', domains)).toBe('/');
    expect(toMenuPath('https://shop.example.com/fr/', domains)).toBe('/');
  });

  it('keeps paths that only start with the same letters', () => {
    expect(
      toMenuPath('https://shop.example.com/products/pt-ring', domains),
    ).toBe('/products/pt-ring');
    expect(toMenuPath('https://shop.example.com/frames', domains)).toBe(
      '/frames',
    );
  });

  it('leaves external URLs and app paths unchanged', () => {
    expect(toMenuPath('https://instagram.com/jewels', domains)).toBe(
      'https://instagram.com/jewels',
    );
    expect(toMenuPath('/collections/all', domains)).toBe('/collections/all');
  });

  it('ignores an empty domain', () => {
    expect(toMenuPath('https://other.example/pt/x', ['', ...domains])).toBe(
      'https://other.example/pt/x',
    );
  });
});
