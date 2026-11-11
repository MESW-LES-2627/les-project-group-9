import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, it} from 'vitest';
import {loadProductsByIds} from '../../app/lib/products.server';
import {getRecommendationCandidates} from '../../app/lib/recommendation/catalog.server';

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
