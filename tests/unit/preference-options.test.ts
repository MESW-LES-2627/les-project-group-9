import {describe, expect, it, vi} from 'vitest';
import {
  getPreferenceOptions,
  labelizeOption,
} from '../../app/lib/profile/preference-options.server';

type Context = Parameters<typeof getPreferenceOptions>[0];

function contextWith(result: unknown) {
  const calls: Array<{query: string; options?: {variables?: unknown}}> = [];

  const context = {
    storefront: {
      CacheShort: () => ({}),
      query: async (query: string, options?: {variables?: unknown}) => {
        calls.push({query, options});
        return result;
      },
    },
  } as unknown as Context;

  return {context, calls};
}

const goldPlated = {
  handle: 'gold-plated',
  fields: [{key: 'label', value: 'Gold-plated'}],
};

describe('labelizeOption', () => {
  it('turns a slug into a readable label', () => {
    expect(labelizeOption('rose-gold')).toBe('Rose gold');
    expect(labelizeOption('gold')).toBe('Gold');
  });
});

describe('getPreferenceOptions', () => {
  it('deduplicates and sorts the colours and materials in the catalog', async () => {
    const {context} = contextWith({
      products: {
        nodes: [
          {
            metal: {value: 'Gold, Silver'},
            jewelryMaterial: {
              references: {nodes: [goldPlated, goldPlated]},
            },
            watchMaterial: null,
          },
          {
            metal: {value: 'rose gold'},
            jewelryMaterial: null,
            watchMaterial: {
              references: {
                nodes: [{handle: 'stainless-steel', fields: null}],
              },
            },
          },
          {metal: {value: 'gold'}, jewelryMaterial: null, watchMaterial: null},
        ],
      },
    });

    const options = await getPreferenceOptions(context);

    expect(options.colors).toEqual([
      {value: 'gold', label: 'Gold'},
      {value: 'rose-gold', label: 'Rose gold'},
      {value: 'silver', label: 'Silver'},
    ]);
    expect(options.materials).toEqual([
      {value: 'gold-plated', label: 'Gold-plated'},
      {value: 'stainless-steel', label: 'stainless-steel'},
    ]);
  });

  it('uses product colour options when custom.metal is not set', async () => {
    const {context} = contextWith({
      products: {
        nodes: [
          {
            metal: null,
            options: [
              {
                name: 'Color',
                optionValues: [{name: 'Gold'}, {name: 'Silver'}],
              },
              {name: 'Size', optionValues: [{name: '6'}]},
            ],
            jewelryMaterial: null,
            watchMaterial: null,
          },
        ],
      },
    });

    const options = await getPreferenceOptions(context);

    expect(options.colors).toEqual([
      {value: 'gold', label: 'Gold'},
      {value: 'silver', label: 'Silver'},
    ]);
  });

  it('ignores null products and missing metafields', async () => {
    const {context} = contextWith({
      products: {nodes: [null, {}, {metal: null}]},
    });

    await expect(getPreferenceOptions(context)).resolves.toEqual({
      colors: [],
      materials: [],
    });
  });

  it('returns empty groups when the catalog query fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const context = {
      storefront: {
        CacheShort: () => ({}),
        query: async () => {
          throw new Error('Storefront unavailable');
        },
      },
    } as unknown as Context;

    await expect(getPreferenceOptions(context)).resolves.toEqual({
      colors: [],
      materials: [],
    });

    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('uses the active language and country through @inContext', async () => {
    const {context, calls} = contextWith({products: {nodes: []}});

    await getPreferenceOptions(context);

    expect(calls).toHaveLength(1);
    expect(calls[0].query).toContain(
      '@inContext(country: $country, language: $language)',
    );
    expect(calls[0].options?.variables).toBeUndefined();
  });
});
