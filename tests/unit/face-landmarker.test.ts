import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  createFaceDetector,
  getFaceDetector,
  releaseFaceDetector,
  type FaceDetector,
} from '../../app/lib/try-on/face-landmarker';

const mediapipe = vi.hoisted(() => ({createFromOptions: vi.fn()}));

vi.mock('@mediapipe/tasks-vision', () => ({
  FaceLandmarker: {createFromOptions: mediapipe.createFromOptions},
}));

function fakeDetector(): FaceDetector {
  return {
    detectVideo: vi.fn().mockReturnValue(null),
    detectImage: vi.fn().mockResolvedValue(null),
    close: vi.fn(),
  };
}

function fakeLandmarker() {
  return {
    detectForVideo: vi.fn(() => ({faceLandmarks: []})),
    detect: vi.fn(() => ({faceLandmarks: []})),
    setOptions: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
}

afterEach(() => {
  releaseFaceDetector();
  mediapipe.createFromOptions.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getFaceDetector', () => {
  it('creates the landmarker once and reuses it', async () => {
    const create = vi.fn().mockResolvedValue(fakeDetector());

    const [first, second] = await Promise.all([
      getFaceDetector(create),
      getFaceDetector(create),
    ]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('does not cache a failed creation', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('ModuleFactory not set.'))
      .mockResolvedValueOnce(fakeDetector());

    await expect(getFaceDetector(create)).rejects.toThrow(
      'ModuleFactory not set.',
    );
    await expect(getFaceDetector(create)).resolves.toBeDefined();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('closes the detector on release and allows a new one', async () => {
    const detector = fakeDetector();
    const create = vi.fn().mockResolvedValue(detector);

    await getFaceDetector(create);
    releaseFaceDetector();

    await vi.waitFor(() => expect(detector.close).toHaveBeenCalledTimes(1));

    await getFaceDetector(create);
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe('createFaceDetector', () => {
  it('creates the landmarker from the bundled asset URLs', async () => {
    mediapipe.createFromOptions.mockResolvedValue(fakeLandmarker());

    await createFaceDetector();

    expect(mediapipe.createFromOptions).toHaveBeenCalledTimes(1);

    const [fileset, options] = mediapipe.createFromOptions.mock.calls[0];

    expect(fileset.wasmLoaderPath).toMatch(/vision_wasm_internal.*\.js/);
    expect(fileset.wasmBinaryPath).toMatch(/vision_wasm_internal.*\.wasm/);
    expect(options.baseOptions.modelAssetPath).toMatch(
      /face_landmarker.*\.task/,
    );
  });

  it('falls back to the CPU delegate', async () => {
    mediapipe.createFromOptions
      .mockRejectedValueOnce(new Error('GPU unavailable'))
      .mockResolvedValueOnce(fakeLandmarker());

    await createFaceDetector();

    expect(mediapipe.createFromOptions).toHaveBeenCalledTimes(2);
    expect(
      mediapipe.createFromOptions.mock.calls[1][1].baseOptions.delegate,
    ).toBe('CPU');
  });

  it('reports the asset status and MIME when it cannot start', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    mediapipe.createFromOptions.mockRejectedValue(new Error('Aborted'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 404,
          headers: {'content-type': 'text/html'},
        }),
      ),
    );

    await expect(createFaceDetector()).rejects.toThrow(
      /wasm .* 404 text\/html/,
    );
    expect(consoleError).toHaveBeenCalledWith(
      '[try-on] MediaPipe could not start',
      expect.any(Error),
      expect.any(Array),
    );
  });
});
