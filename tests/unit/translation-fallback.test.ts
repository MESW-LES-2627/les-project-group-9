import {describe, expect, it, vi} from 'vitest';
import {loader, meta} from '../../app/routes/products.$handle';

/*
 * US-047 acceptance criterion: when a product description is missing in PT,
 * the EN-US text is shown with no error.
 *
 * Shopify returns the shop's primary-language (English) content when a
 * resource has no translation for the requested language, so the app must
 * simply request the active language and render what comes back. These tests
 * mock that response; the real end-to-end check needs Portuguese published in
 * Shopify and a product left untranslated (docs/i18n.md → Shopify
 * administration setup).
 */

type LoaderArgs = Parameters<typeof loader>[0];
type MetaArgs = Parameters<typeof meta>[0];

const englishProduct = {
  id: 'gid://shopify/Product/1',
  handle: 'aura-bracelet',
  title: 'Aura bracelet',
  description: 'A fine chain bracelet.',
  seo: {description: null},
};

function portugueseRequest() {
  const query = vi
    .fn()
    .mockResolvedValueOnce({product: englishProduct})
    .mockResolvedValueOnce({productRecommendations: []});

  const args = {
    request: new Request('https://jeweliette.example/products/aura-bracelet'),
    params: {handle: 'aura-bracelet'},
    context: {
      storefront: {query, i18n: {language: 'PT_PT', country: 'US'}},
    },
  } as unknown as LoaderArgs;

  return {args, query};
}

const portugueseMatches = [
  {
    id: 'root',
    loaderData: {
      locale: {code: 'pt', language: 'PT_PT', country: 'US', tag: 'pt-PT'},
    },
  },
] as unknown as MetaArgs['matches'];

describe('missing Portuguese translation falls back to English', () => {
  it('loads the English content returned for a PT request without error', async () => {
    const {args} = portugueseRequest();

    const result = await loader(args);

    expect(result.product.description).toBe('A fine chain bracelet.');
    expect(result.product.title).toBe('Aura bracelet');
    await expect(result.recommendations).resolves.toEqual([]);
  });

  it('does not override the active language in the query', async () => {
    const {args, query} = portugueseRequest();

    await loader(args);

    // Hydrogen fills $language from context.storefront.i18n (PT_PT) when the
    // caller does not pass it; a hardcoded value would bypass translations.
    for (const [, options] of query.mock.calls) {
      expect(options.variables).not.toHaveProperty('language');
    }
  });

  it('uses the English title and description in the page metadata', () => {
    const tags = meta({
      data: {product: englishProduct, recommendations: Promise.resolve([])},
      matches: portugueseMatches,
    } as unknown as MetaArgs);

    expect(tags).toContainEqual({title: 'Aura bracelet | Jeweliette'});
    expect(tags).toContainEqual({
      name: 'description',
      content: 'A fine chain bracelet.',
    });
  });

  it('uses a Portuguese fallback title when Shopify returns no product data', () => {
    const tags = meta({
      data: undefined,
      matches: portugueseMatches,
    } as unknown as MetaArgs);

    expect(tags).toContainEqual({title: 'Produto | Jeweliette'});
  });
});
