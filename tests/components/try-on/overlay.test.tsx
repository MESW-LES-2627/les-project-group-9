import {afterAll, afterEach, describe, expect, it, vi} from 'vitest';
import {overlayTransparency} from '~/lib/try-on/overlay';

const originalGetContext = HTMLCanvasElement.prototype.getContext;

function fakeContext(options: {
  alpha: number;
  throwOnRead?: boolean;
}): CanvasRenderingContext2D {
  return {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => {
      if (options.throwOnRead) throw new Error('tainted canvas');
      const data = new Uint8ClampedArray(32 * 32 * 4).fill(255);
      data[3] = options.alpha;
      return {data};
    }),
  } as unknown as CanvasRenderingContext2D;
}

function setContext(value: CanvasRenderingContext2D | null) {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => value,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

const image = document.createElement('img');

describe('overlayTransparency', () => {
  it('accepts a cut-out with transparent pixels', () => {
    setContext(fakeContext({alpha: 0}));

    expect(overlayTransparency(image)).toBe('transparent');
  });

  it('rejects a fully opaque PNG', () => {
    setContext(fakeContext({alpha: 255}));

    expect(overlayTransparency(image)).toBe('opaque');
  });

  it('does not block when the canvas cannot be read', () => {
    setContext(null);
    expect(overlayTransparency(image)).toBe('unknown');

    setContext(fakeContext({alpha: 0, throwOnRead: true}));
    expect(overlayTransparency(image)).toBe('unknown');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});
