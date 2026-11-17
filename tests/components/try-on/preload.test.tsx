import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@mediapipe/tasks-vision', () => ({}));

type Preload = typeof import('~/lib/try-on/preload');

let preloadTryOnAssets: Preload['preloadTryOnAssets'];

beforeEach(async () => {
  vi.resetModules();
  Object.defineProperty(window, 'requestIdleCallback', {
    configurable: true,
    value: (callback: () => void) => {
      callback();
      return 1;
    },
  });
  ({preloadTryOnAssets} = await import('~/lib/try-on/preload'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('preloadTryOnAssets', () => {
  it('warms the WASM runtime and the model when the browser is idle', async () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal('fetch', fetchMock);

    preloadTryOnAssets();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledWith(
      '/mediapipe/wasm/vision_wasm_internal.wasm',
    );
    expect(fetchMock).toHaveBeenCalledWith('/models/face_landmarker.task');
  });

  it('only starts once', () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal('fetch', fetchMock);

    preloadTryOnAssets();
    preloadTryOnAssets();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
