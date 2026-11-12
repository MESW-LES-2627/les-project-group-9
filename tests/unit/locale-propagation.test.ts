import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {createStorefrontClient, InMemoryCache} from '@shopify/hydrogen';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {loadProductsByIds} from '../../app/lib/products.server';
import {getRecommendationCandidates} from '../../app/lib/recommendation/catalog.server';
import {getLocaleFromRequest} from '../../app/lib/i18n';

type QueryOptions = {variables?: Record<string, unknown>};

/** Fake storefront that records query options. Hydrogen fills `$language` from i18n when absent. */
function recordingStorefront(result: unknown) {
  const calls: QueryOptions[] = [];
  const storefront = {
    CacheShort: () => ({}),
    query: async (_query: string, options: QueryOptions = {}) => {
      calls.push(options);
      return result;
    },
  };
  return {calls, context: {storefront} as never};
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe('active language propagation', () => {
  it('product cards by id do not override the active language', async () => {
    const {calls, context} = recordingStorefront({nodes: []});
    await loadProductsByIds(context, ['gid://shopify/Product/1']);

    expect(calls).toHaveLength(1);
    expect(calls[0].variables).not.toHaveProperty('language');
  });

  it('recommendation candidates do not override the active language', async () => {
    const {calls, context} = recordingStorefront({products: {nodes: []}});
    await getRecommendationCandidates(context);

    expect(calls).toHaveLength(1);
    expect(calls[0].variables ?? {}).not.toHaveProperty('language');
  });

  it('no app code hardcodes a language variable', () => {
    const appDir = join(__dirname, '../../app');
    const offenders = sourceFiles(appDir)
      .filter((file) => !file.endsWith(join('lib', 'i18n.ts')))
      .filter((file) =>
        /\blanguage:\s*['"][A-Z_]+['"]/.test(readFileSync(file, 'utf8')),
      )
      .map((file) => relative(appDir, file));

    expect(offenders).toEqual([]);
  });
});

/** GraphQL operations (`query`/`mutation`) in `#graphql` template strings, with the source file. */
function graphqlOperations(appDir: string) {
  return sourceFiles(appDir).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    const documents = source.match(/`\s*#graphql[\s\S]*?`/g) ?? [];
    return documents.flatMap((document) =>
      [...document.matchAll(/\b(query|mutation)\s+(\w+)([^{]*)\{/g)].map(
        ([, kind, name, header]) => ({
          file: relative(appDir, file),
          kind,
          name,
          header,
        }),
      ),
    );
  });
}

/**
 * Operations that return no translatable content: customer metafields hold
 * product IDs and JSON preferences only.
 */
const LANGUAGE_FREE_OPERATIONS = ['CustomerProfile', 'CustomerFavoritesSet'];

describe('Shopify locale variables', () => {
  const appDir = join(__dirname, '../../app');

  it('finds the GraphQL operations it checks', () => {
    expect(graphqlOperations(appDir).length).toBeGreaterThan(20);
  });

  it('every operation passes the active language through @inContext', () => {
    const missing = graphqlOperations(appDir)
      .filter(({name}) => !LANGUAGE_FREE_OPERATIONS.includes(name))
      .filter(
        ({header}) =>
          !/@inContext\([^)]*\blanguage:\s*\$language\b/.test(header) ||
          !/\$language:\s*LanguageCode\b/.test(header),
      )
      .map(({file, name}) => `${file}: ${name}`);

    expect(missing).toEqual([]);
  });

  it('the language-free allowlist only names existing operations', () => {
    const names = graphqlOperations(appDir).map(({name}) => name);
    for (const name of LANGUAGE_FREE_OPERATIONS) {
      expect(names).toContain(name);
    }
  });
});

describe('Storefront cache per language', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const QUERY = `#graphql
    query MenuTitles($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
      menu(handle: "main-menu") { items { title } }
    }
  `;

  /** Real Hydrogen client and cache; only the network is faked. */
  function setup() {
    const requests: Array<{language: unknown; country: unknown}> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init: RequestInit) => {
        const {variables} = JSON.parse(String(init.body)) as {
          variables: {language: string; country: string};
        };
        requests.push(variables);
        const title = {
          EN: 'Earrings',
          PT_PT: 'Brincos',
          FR: "Boucles d'oreilles",
        }[variables.language];
        return new Response(
          JSON.stringify({data: {menu: {items: [{title}]}}}),
          {headers: {'content-type': 'application/json'}},
        );
      }),
    );

    const cache = new InMemoryCache();
    const pending: Promise<unknown>[] = [];
    const clientFor = (acceptLanguage: string) =>
      createStorefrontClient({
        cache,
        waitUntil: (promise: Promise<unknown>) => void pending.push(promise),
        i18n: getLocaleFromRequest(
          new Request('https://shop.test/', {
            headers: {'accept-language': acceptLanguage},
          }),
        ),
        storeDomain: 'shop.test',
        publicStorefrontToken: 'test-token',
        storefrontApiVersion: '2025-07',
      }).storefront;

    const query = async (acceptLanguage: string) => {
      const result = (await clientFor(acceptLanguage).query(QUERY, {
        cache: {mode: 'public', maxAge: 60, staleWhileRevalidate: 60},
      })) as {menu: {items: Array<{title: string}>}};
      await Promise.all(pending);
      return result.menu.items[0].title;
    };

    return {requests, query};
  }

  it('sends the resolved language and keeps the commercial country', async () => {
    const {requests, query} = setup();

    await query('pt-PT');
    await query('fr-FR');

    expect(requests).toEqual([
      {country: 'US', language: 'PT_PT'},
      {country: 'US', language: 'FR'},
    ]);
  });

  it('does not serve a cached English response to a Portuguese request', async () => {
    const {requests, query} = setup();

    expect(await query('en-US')).toBe('Earrings');
    expect(await query('en-US')).toBe('Earrings');
    expect(requests).toHaveLength(1);

    expect(await query('pt-PT')).toBe('Brincos');
    expect(await query('fr-FR')).toBe("Boucles d'oreilles");
    expect(requests.map(({language}) => language)).toEqual([
      'EN',
      'PT_PT',
      'FR',
    ]);
  });
});
