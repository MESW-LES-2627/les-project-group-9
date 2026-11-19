import {afterAll, afterEach, describe, expect, it, vi} from 'vitest';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {
  loadTryOnOverlays,
  overlayAspect,
  overlayTransparency,
} from '~/lib/try-on/overlay';

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

describe('overlayAspect', () => {
  it('uses the natural size of the decoded PNG', () => {
    expect(
      overlayAspect({
        naturalWidth: 200,
        naturalHeight: 100,
      } as HTMLImageElement),
    ).toBe(2);
  });

  it('falls back to a square when the size is not available', () => {
    expect(
      overlayAspect({naturalWidth: 0, naturalHeight: 0} as HTMLImageElement),
    ).toBe(1);
  });
});

describe('loadTryOnOverlays', () => {
  class FakeImage {
    crossOrigin = '';
    decoding = '';
    naturalWidth = 200;
    naturalHeight = 100;
    opaque = false;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(value: string) {
      this.opaque = value.includes('opaque');
      queueMicrotask(() => {
        if (value.includes('missing')) this.onerror?.();
        else this.onload?.();
      });
    }
  }

  function piece(id: string, file: string): TryOnPiece {
    return {
      id,
      kind: 'earring',
      overlayUrl: `https://cdn.example/${file}?cors=1`,
      sizeCm: 2,
    };
  }

  it('keeps the usable pieces in input order and counts the rest', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    let drawn: {opaque?: boolean} | null = null;

    vi.stubGlobal('Image', FakeImage);
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () =>
        ({
          drawImage: (value: {opaque?: boolean}) => {
            drawn = value;
          },
          getImageData: () => {
            const data = new Uint8ClampedArray(32 * 32 * 4).fill(255);
            data[3] = drawn?.opaque ? 255 : 0;
            return {data};
          },
        }) as unknown as CanvasRenderingContext2D,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    const result = await loadTryOnOverlays([
      piece('ok', 'ok'),
      piece('opaque', 'opaque'),
      piece('missing', 'missing'),
      piece('ok-2', 'ok-2'),
    ]);

    expect(result.ready.map((item) => item.piece.id)).toEqual(['ok', 'ok-2']);
    expect(result.opaque).toBe(1);
    expect(result.failed).toBe(1);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
    vi.unstubAllGlobals();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});
