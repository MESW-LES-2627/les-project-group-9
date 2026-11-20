import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  attachCameraStream,
  cameraConstraints,
  cameraSupport,
  classifyCameraError,
  describeError,
  openCameraStream,
  requestCamera,
  stopStream,
} from '../../app/lib/try-on/camera';

function fakeStream(trackCount = 1) {
  const stops = Array.from({length: trackCount}, () => vi.fn());
  const stream = {
    getTracks: () => stops.map((stop) => ({stop})),
  } as unknown as MediaStream;

  return {stream, stops};
}

function fakeVideo() {
  const listeners = new Map<string, () => void>();
  const attributes = new Map<string, string>();

  return {
    srcObject: null as MediaProvider | null,
    muted: false,
    readyState: 0,
    play: vi.fn().mockResolvedValue(undefined),
    setAttribute: (name: string, value: string) => {
      attributes.set(name, value);
    },
    addEventListener: (type: string, listener: () => void) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
    emit: (type: string) => listeners.get(type)?.(),
    listeners,
    attributes,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cameraConstraints', () => {
  it('asks for the front camera at 720p without audio', () => {
    expect(cameraConstraints()).toEqual({
      audio: false,
      video: {
        facingMode: 'user',
        width: {ideal: 1280},
        height: {ideal: 720},
      },
    });
  });
});

describe('classifyCameraError', () => {
  it('maps permission errors to denied', () => {
    expect(classifyCameraError(new DOMException('no', 'NotAllowedError'))).toBe(
      'denied',
    );
    expect(classifyCameraError(new DOMException('no', 'SecurityError'))).toBe(
      'denied',
    );
    expect(classifyCameraError({name: 'PermissionDeniedError'})).toBe('denied');
  });

  it('maps missing or busy devices to unavailable', () => {
    for (const name of [
      'NotFoundError',
      'NotReadableError',
      'OverconstrainedError',
      'AbortError',
    ]) {
      expect(classifyCameraError({name})).toBe('unavailable');
    }
  });

  it('falls back to unknown', () => {
    expect(classifyCameraError(new Error('boom'))).toBe('unknown');
    expect(classifyCameraError(null)).toBe('unknown');
    expect(classifyCameraError('nope')).toBe('unknown');
  });
});

describe('cameraSupport', () => {
  it('reports a browser without getUserMedia as unsupported', () => {
    vi.stubGlobal('navigator', {});

    expect(cameraSupport()).toBe('unsupported');
  });

  it('accepts a browser with getUserMedia', () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {getUserMedia: vi.fn()},
    });

    expect(cameraSupport()).toBe(null);
  });
});

describe('openCameraStream', () => {
  it('requests the front camera with the constraints', async () => {
    const {stream} = fakeStream();
    const request = vi.fn().mockResolvedValue(stream);

    await expect(openCameraStream(request)).resolves.toBe(stream);
    expect(request).toHaveBeenCalledWith(cameraConstraints());
  });

  it('retries without facingMode when the constraints are overconstrained', async () => {
    const {stream} = fakeStream();
    const request = vi
      .fn()
      .mockRejectedValueOnce(
        new DOMException('constraints', 'OverconstrainedError'),
      )
      .mockResolvedValueOnce(stream);

    await expect(openCameraStream(request)).resolves.toBe(stream);
    expect(request).toHaveBeenLastCalledWith({audio: false, video: true});
  });
});

describe('requestCamera', () => {
  it('resolves with the stream', async () => {
    const {stream} = fakeStream();
    const request = vi.fn().mockResolvedValue(stream);

    await expect(requestCamera(request)).resolves.toEqual({
      stream,
      error: null,
    });
  });

  it('resolves with the browser error instead of rejecting', async () => {
    const error = new DOMException('denied', 'NotAllowedError');
    const request = vi.fn().mockRejectedValue(error);

    await expect(requestCamera(request)).resolves.toEqual({
      stream: null,
      error,
    });
  });

  it('never rejects synchronously', async () => {
    await expect(
      requestCamera(vi.fn(() => {
        throw new Error('boom');
      })),
    ).resolves.toMatchObject({stream: null});
  });
});

describe('attachCameraStream', () => {
  it('sets the iOS inline attributes before attaching the stream', async () => {
    const {stream} = fakeStream();
    const video = fakeVideo();

    await attachCameraStream(video, stream);

    expect(video.attributes.get('playsinline')).toBe('true');
    expect(video.attributes.get('webkit-playsinline')).toBe('true');
    expect(video.muted).toBe(true);
    expect(video.srcObject).toBe(stream);
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it('reports a playback failure instead of rejecting', async () => {
    const {stream} = fakeStream();
    const video = fakeVideo();
    const onError = vi.fn();
    video.play.mockRejectedValue(new DOMException('no', 'NotAllowedError'));

    await expect(
      attachCameraStream(video, stream, {onError}),
    ).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('retries playback once after an AbortError', async () => {
    const {stream} = fakeStream();
    const video = fakeVideo();
    video.play
      .mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))
      .mockResolvedValueOnce(undefined);

    const attached = attachCameraStream(video, stream);

    await vi.waitFor(() => expect(video.listeners.has('canplay')).toBe(true));
    video.emit('canplay');
    await attached;

    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it('resolves even when playback never settles', async () => {
    const {stream} = fakeStream();
    const video = fakeVideo();
    video.play.mockReturnValue(new Promise(() => undefined));

    await expect(attachCameraStream(video, stream)).resolves.toBeUndefined();
  });
});

describe('describeError', () => {
  it('formats Error instances and DOMExceptions', () => {
    expect(describeError(new Error('boom'))).toBe('Error: boom');
    expect(describeError(new DOMException('busy', 'NotReadableError'))).toBe(
      'NotReadableError: busy',
    );
  });

  it('handles plain objects and primitives', () => {
    expect(describeError({name: 'AbortError'})).toBe('AbortError');
    expect(describeError({message: 'no camera'})).toBe('no camera');
    expect(describeError('nope')).toBe('nope');
  });
});

describe('stopStream', () => {
  it('ignores missing streams', () => {
    expect(() => stopStream(null)).not.toThrow();
    expect(() => stopStream(undefined)).not.toThrow();
  });
});
