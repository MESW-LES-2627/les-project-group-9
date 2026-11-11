import {describe, expect, it} from 'vitest';
import {
  redirectIfHandleIsLocalized,
  toSafeRedirectPath,
} from '../../app/lib/redirect';

function request(path: string) {
  return new Request(`http://localhost${path}`);
}

function thrownResponse(callback: () => void) {
  try {
    callback();
  } catch (error) {
    return error as Response;
  }

  throw new Error('Expected a redirect to be thrown');
}

describe('redirectIfHandleIsLocalized', () => {
  it('does nothing when the handle matches', () => {
    expect(() =>
      redirectIfHandleIsLocalized(request('/products/ring'), {
        handle: 'ring',
        data: {handle: 'ring'},
      }),
    ).not.toThrow();
  });

  it('redirects to the localized handle', () => {
    const response = thrownResponse(() =>
      redirectIfHandleIsLocalized(request('/products/anillo'), {
        handle: 'anillo',
        data: {handle: 'ring'},
      }),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(
      'http://localhost/products/ring',
    );
  });

  it('replaces every localized handle and keeps the query string', () => {
    const response = thrownResponse(() =>
      redirectIfHandleIsLocalized(
        request('/blogs/noticias/articulo?ref=home'),
        {handle: 'noticias', data: {handle: 'news'}},
        {handle: 'articulo', data: {handle: 'article'}},
      ),
    );

    expect(response.headers.get('Location')).toBe(
      'http://localhost/blogs/news/article?ref=home',
    );
  });
});

describe('toSafeRedirectPath', () => {
  const requestUrl = 'https://jeweliette.example/locale';

  it('keeps same-origin paths with query and hash', () => {
    expect(
      toSafeRedirectPath('/products/ring?Color=Gold#details', requestUrl),
    ).toBe('/products/ring?Color=Gold#details');
    expect(toSafeRedirectPath('/', requestUrl)).toBe('/');
  });

  it.each([
    ['missing', null],
    ['not a string', 42],
    ['empty', ''],
    ['absolute URL', 'https://evil.example/'],
    ['same-origin absolute URL', 'https://jeweliette.example/cart'],
    ['protocol-relative', '//evil.example/path'],
    ['backslash host', '/\\evil.example'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['relative path', 'products/ring'],
    ['tab trick', '/\t/evil.example'],
    ['newline', '/cart\nSet-Cookie: x=1'],
  ])('falls back to / for %s', (_label, input) => {
    expect(toSafeRedirectPath(input, requestUrl)).toBe('/');
  });

  it('uses a custom fallback', () => {
    expect(toSafeRedirectPath('//evil.example', requestUrl, '/cart')).toBe(
      '/cart',
    );
  });
});
