import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {TRY_ON_ASSETS} from '~/lib/try-on/assets';

const mocks = vi.hoisted(() => ({
  warmFaceDetector: vi.fn(),
  releaseFaceDetector: vi.fn(),
}));

vi.mock('@mediapipe/tasks-vision', () => ({}));

vi.mock('~/lib/try-on/face-landmarker', () => ({
  getFaceDetector: vi.fn(),
  warmFaceDetector: mocks.warmFaceDetector,
  releaseFaceDetector: mocks.releaseFaceDetector,
}));

type Preload = typeof import('~/lib/try-on/preload');

let preloadTryOnAssets: Preload['preloadTryOnAssets'];

beforeEach(async () => {
  vi.resetModules();
  mocks.warmFaceDetector.mockReset();
  mocks.releaseFaceDetector.mockReset();
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
  it('warms the WASM runtime, the model and the landmarker when idle', async () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal('fetch', fetchMock);

    preloadTryOnAssets();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledWith(TRY_ON_ASSETS.wasmUrl);
    expect(fetchMock).toHaveBeenCalledWith(TRY_ON_ASSETS.modelUrl);
    await vi.waitFor(() =>
      expect(mocks.warmFaceDetector).toHaveBeenCalledTimes(1),
    );
  });

  it('only starts once', () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    vi.stubGlobal('fetch', fetchMock);

    preloadTryOnAssets();
    preloadTryOnAssets();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('releases the shared landmarker when the page is hidden', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));

    preloadTryOnAssets();
    window.dispatchEvent(new Event('pagehide'));

    expect(mocks.releaseFaceDetector).toHaveBeenCalled();
  });
});
