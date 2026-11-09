import {describe, expect, it} from 'vitest';
import {
  materialsForColor,
  parseMaterials,
  parseProductMaterials,
} from '../../app/lib/materials';

describe('parseMaterials', () => {
  it('reads the handle and label of each material metaobject', () => {
    expect(
      parseMaterials({
        references: {
          nodes: [
            {
              handle: 'gold-plated',
              fields: [{key: 'label', value: 'Gold-plated'}],
            },
            {
              handle: 'silver-plated',
              fields: [{key: 'label', value: 'Silver-plated'}],
            },
          ],
        },
      }),
    ).toEqual([
      {handle: 'gold-plated', label: 'Gold-plated'},
      {handle: 'silver-plated', label: 'Silver-plated'},
    ]);
  });

  it('deduplicates by handle', () => {
    expect(
      parseMaterials({
        references: {
          nodes: [
            {
              handle: 'gold-plated',
              fields: [{key: 'label', value: 'Gold-plated'}],
            },
            {
              handle: 'gold-plated',
              fields: [{key: 'label', value: 'Gold-plated'}],
            },
          ],
        },
      }),
    ).toEqual([{handle: 'gold-plated', label: 'Gold-plated'}]);
  });

  it('falls back to the handle when the label is missing', () => {
    expect(
      parseMaterials({
        references: {nodes: [{handle: 'silver', fields: null}]},
      }),
    ).toEqual([{handle: 'silver', label: 'silver'}]);
  });

  it('returns an empty list when there are no materials', () => {
    expect(parseMaterials(null)).toEqual([]);
    expect(parseMaterials({references: null})).toEqual([]);
  });
});


describe('parseProductMaterials', () => {
  const metafield = (items: Array<[string, string]>) => ({
    references: {
      nodes: items.map(([handle, label]) => ({
        handle,
        fields: [{key: 'label', value: label}],
      })),
    },
  });

  it('merges jewelry and watch materials and deduplicates them', () => {
    expect(
      parseProductMaterials({
        jewelryMaterial: metafield([['gold-plated', 'Gold-plated']]),
        watchMaterial: metafield([
          ['stainless-steel', 'Stainless steel'],
          ['gold-plated', 'Gold-plated'],
        ]),
      }),
    ).toEqual([
      {handle: 'gold-plated', label: 'Gold-plated'},
      {handle: 'stainless-steel', label: 'Stainless steel'},
    ]);
  });

  it('returns an empty list when no material metafield exists', () => {
    expect(parseProductMaterials({})).toEqual([]);
    expect(
      parseProductMaterials({jewelryMaterial: null, watchMaterial: null}),
    ).toEqual([]);
  });
});

describe('materialsForColor', () => {
  const materials = [
    {handle: 'gold-plated', label: 'Gold-plated'},
    {handle: 'silver-plated', label: 'Silver-plated'},
    {handle: 'stainless-steel', label: 'Stainless steel'},
  ];

  it('keeps the selected colour material and shared composition materials', () => {
    expect(materialsForColor(materials, ['Gold', 'Silver'], 'Gold')).toEqual([
      {handle: 'gold-plated', label: 'Gold-plated'},
      {handle: 'stainless-steel', label: 'Stainless steel'},
    ]);

    expect(materialsForColor(materials, ['Gold', 'Silver'], 'Silver')).toEqual([
      {handle: 'silver-plated', label: 'Silver-plated'},
      {handle: 'stainless-steel', label: 'Stainless steel'},
    ]);
  });

  it('returns every material when there is no colour selection', () => {
    expect(materialsForColor(materials, [], null)).toEqual(materials);
    expect(materialsForColor(materials, ['Gold'], undefined)).toEqual(
      materials,
    );
  });

  it('returns every material when the selected colour is unknown', () => {
    expect(materialsForColor(materials, ['Gold', 'Silver'], 'Platinum')).toEqual(
      materials,
    );
  });

  it('does not show rose-gold materials for a plain gold selection', () => {
    const withRoseGold = [
      ...materials,
      {handle: 'rose-gold-plated', label: 'Rose gold-plated'},
    ];

    expect(
      materialsForColor(withRoseGold, ['Gold', 'Rose'], 'Gold'),
    ).toEqual([
      {handle: 'gold-plated', label: 'Gold-plated'},
      {handle: 'stainless-steel', label: 'Stainless steel'},
    ]);

    expect(
      materialsForColor(withRoseGold, ['Gold', 'Rose'], 'Rose'),
    ).toEqual([
      {handle: 'stainless-steel', label: 'Stainless steel'},
      {handle: 'rose-gold-plated', label: 'Rose gold-plated'},
    ]);
  });
});
