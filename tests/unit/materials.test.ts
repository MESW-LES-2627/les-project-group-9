import {describe, expect, it} from 'vitest';
import {materialLabels, parseMaterials} from '../../app/lib/materials';

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

describe('materialLabels', () => {
  it('returns only the display labels', () => {
    expect(
      materialLabels({
        references: {
          nodes: [
            {
              handle: 'gold-plated',
              fields: [{key: 'label', value: 'Gold-plated'}],
            },
          ],
        },
      }),
    ).toEqual(['Gold-plated']);
  });
});
