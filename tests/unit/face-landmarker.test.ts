import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  getFaceDetector,
  releaseFaceDetector,
  type FaceDetector,
} from '../../app/lib/try-on/face-landmarker';

function fakeDetector(): FaceDetector {
  return {
    detectVideo: vi.fn().mockReturnValue(null),
    detectImage: vi.fn().mockResolvedValue(null),
    close: vi.fn(),
  };
}

afterEach(() => {
  releaseFaceDetector();
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
