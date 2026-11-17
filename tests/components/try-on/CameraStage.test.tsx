import {render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  attachCameraStream: vi.fn(),
  stopStream: vi.fn(),
}));

vi.mock('~/lib/try-on/camera', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/try-on/camera')>();
  return {
    ...actual,
    attachCameraStream: mocks.attachCameraStream,
    stopStream: mocks.stopStream,
  };
});

import {CameraStage} from '~/components/try-on/CameraStage';

const detector = {
  detectVideo: vi.fn().mockReturnValue(null),
  detectImage: vi.fn(),
  close: vi.fn(),
};

const overlay = document.createElement('img');

function fakeStream() {
  const listeners = new Map<string, () => void>();
  const track = {
    stop: vi.fn(),
    addEventListener: (type: string, listener: () => void) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
  };

  return {
    stream: {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream,
    listeners,
  };
}

const {stream: streamWithTrack, listeners: trackListeners} = fakeStream();

beforeEach(() => {
  mocks.attachCameraStream.mockReset();
  mocks.stopStream.mockReset();
  trackListeners.clear();
});

function renderStage(overrides: {onFailure?: () => void; onStatus?: () => void} = {}) {
  return render(
    <CameraStage
      detector={detector}
      onFailure={overrides.onFailure ?? vi.fn()}
      onStatus={overrides.onStatus ?? vi.fn()}
      overlay={overlay}
      overlayAspect={1}
      piece={{kind: 'earring', sizeCm: 2}}
      stream={streamWithTrack}
      title="Aura Earrings"
    />,
  );
}

describe('CameraStage', () => {
  it('attaches the stream to the visible preview', async () => {
    const {container} = renderStage();

    await waitFor(() =>
      expect(mocks.attachCameraStream).toHaveBeenCalledTimes(1),
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(mocks.attachCameraStream.mock.calls[0][0]).toBe(video);
    expect(mocks.attachCameraStream.mock.calls[0][1]).toBe(streamWithTrack);
    // The preview must stay visible: Safari releases the camera of a hidden one.
    expect(video?.className).not.toContain('opacity-0');
    expect(
      screen.getByRole('img', {name: 'Preview with Aura Earrings on you'}),
    ).toBeInTheDocument();
  });

  it('does not stop the shared stream on unmount (the dialog owns it)', async () => {
    const {unmount} = renderStage();
    await waitFor(() => expect(mocks.attachCameraStream).toHaveBeenCalled());

    unmount();

    expect(mocks.stopStream).not.toHaveBeenCalled();
  });

  it('reports when the camera is released by the device', async () => {
    const onFailure = vi.fn();
    renderStage({onFailure});
    await waitFor(() => expect(mocks.attachCameraStream).toHaveBeenCalled());

    trackListeners.get('ended')?.();

    expect(onFailure).toHaveBeenCalledWith(
      'unavailable',
      expect.stringContaining('TrackEnded'),
    );
  });

  it('shows the preview and reports preparing while the landmarker loads', async () => {
    const onStatus = vi.fn();

    const {container} = render(
      <CameraStage
        detector={null}
        onFailure={vi.fn()}
        onStatus={onStatus}
        overlay={overlay}
        overlayAspect={1}
        piece={{kind: 'earring', sizeCm: 2}}
        stream={streamWithTrack}
        title="Aura Earrings"
      />,
    );

    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'videoWidth', {configurable: true, value: 640});
    Object.defineProperty(video, 'videoHeight', {configurable: true, value: 480});

    await waitFor(() => expect(onStatus).toHaveBeenCalledWith('preparing'));
  });
});
