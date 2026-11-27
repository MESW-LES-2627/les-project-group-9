import {describe, expect, it} from 'vitest';
import {pick3dModel, type Model3dMediaNode} from '~/lib/model3d';

const image = (id: string): Model3dMediaNode => ({__typename: 'MediaImage', id});

const baseModel: Model3dMediaNode = {
  __typename: 'Model3d',
  id: 'model-1',
  alt: 'Round Signet Ring 3D model',
  sources: [
    {
      url: 'https://cdn.example/signet-ring.glb',
      mimeType: 'model/gltf-binary',
      format: 'glb',
    },
  ],
  previewImage: {url: 'https://cdn.example/poster.jpg', altText: 'Signet ring'},
};

const model = (overrides: Partial<Model3dMediaNode> = {}): Model3dMediaNode => ({
  ...baseModel,
  ...overrides,
});

describe('pick3dModel', () => {
  it('returns null for an empty media list', () => {
    expect(pick3dModel([])).toBeNull();
  });

  it('returns null when the product only has images', () => {
    expect(pick3dModel([image('a'), image('b')])).toBeNull();
  });

  it('picks the model out of mixed media', () => {
    expect(pick3dModel([image('a'), model(), image('b')])).toEqual({
      url: 'https://cdn.example/signet-ring.glb',
      altText: 'Round Signet Ring 3D model',
      previewImageUrl: 'https://cdn.example/poster.jpg',
    });
  });

  it('prefers the GLB source over the USDZ source regardless of order', () => {
    const picked = pick3dModel([
      model({
        sources: [
          {
            url: 'https://cdn.example/signet-ring.usdz',
            mimeType: 'model/vnd.usdz+zip',
            format: 'usdz',
          },
          {
            url: 'https://cdn.example/signet-ring.glb',
            mimeType: 'model/gltf-binary',
            format: 'glb',
          },
        ],
      }),
    ]);

    expect(picked?.url).toBe('https://cdn.example/signet-ring.glb');
  });

  it('falls back to any source when the MIME types are unknown', () => {
    const picked = pick3dModel([
      model({sources: [{url: 'https://cdn.example/model.bin'}]}),
    ]);

    expect(picked?.url).toBe('https://cdn.example/model.bin');
  });

  it('uses the preview image alt text when the model has none', () => {
    const picked = pick3dModel([model({alt: null})]);

    expect(picked?.altText).toBe('Signet ring');
  });

  it('keeps a model without a preview image', () => {
    expect(pick3dModel([model({previewImage: null})])).toEqual({
      url: 'https://cdn.example/signet-ring.glb',
      altText: 'Round Signet Ring 3D model',
      previewImageUrl: null,
    });
  });

  it('skips a model whose sources have no usable url', () => {
    expect(pick3dModel([model({sources: []})])).toBeNull();
    expect(pick3dModel([model({sources: null})])).toBeNull();
  });
});
