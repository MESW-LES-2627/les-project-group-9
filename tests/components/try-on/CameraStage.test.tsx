import {render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import type {LoadedTryOnPiece} from '~/lib/try-on/overlay';

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

const PIECE: TryOnPiece = {
  id: 'gid://shopify/ProductVariant/1',
  kind: 'earring',
  overlayUrl: 'https://cdn.example/earring.png?cors=1',
  sizeCm: 2,
};

const SECOND_PIECE: TryOnPiece = {
  ...PIECE,
  id: 'gid://shopify/ProductVariant/2',
  overlayUrl: 'https://cdn.example/necklace.png?cors=1',
  kind: 'necklace',
  sizeCm: 16,
};

const detector = {
  detectVideo: vi.fn().mockReturnValue(null),
  detectImage: vi.fn(),
  close: vi.fn(),
};

const overlay = document.createElement('img');
const secondOverlay = document.createElement('img');

const LOADED: LoadedTryOnPiece = {piece: PIECE, image: overlay};

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

function renderStage(
  overrides: {
    onFailure?: () => void;
    onStatus?: () => void;
    pieces?: LoadedTryOnPiece[];
  } = {},
) {
  return render(
    <CameraStage
      detector={detector}
      onFailure={overrides.onFailure ?? vi.fn()}
      onStatus={overrides.onStatus ?? vi.fn()}
      pieces={overrides.pieces ?? [LOADED]}
      previewLabel="Preview with Aura Earrings on you"
      stream={streamWithTrack}
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
        pieces={[LOADED]}
        previewLabel="Preview with Aura Earrings on you"
        stream={streamWithTrack}
      />,
    );

    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'videoWidth', {
      configurable: true,
      value: 640,
    });
    Object.defineProperty(video, 'videoHeight', {
      configurable: true,
      value: 480,
    });

    await waitFor(() => expect(onStatus).toHaveBeenCalledWith('preparing'));
  });

  it('joins a piece when its PNG arrives without restarting the camera', async () => {
    const {rerender} = renderStage({pieces: []});

    await waitFor(() =>
      expect(mocks.attachCameraStream).toHaveBeenCalledTimes(1),
    );

    rerender(
      <CameraStage
        detector={detector}
        onFailure={vi.fn()}
        onStatus={vi.fn()}
        pieces={[LOADED]}
        previewLabel="Preview with Aura Earrings on you"
        stream={streamWithTrack}
      />,
    );

    expect(mocks.attachCameraStream).toHaveBeenCalledTimes(1);
  });

  it('keeps the stream running when another piece joins the look', async () => {
    const {rerender} = renderStage();

    await waitFor(() =>
      expect(mocks.attachCameraStream).toHaveBeenCalledTimes(1),
    );

    rerender(
      <CameraStage
        detector={detector}
        onFailure={vi.fn()}
        onStatus={vi.fn()}
        pieces={[LOADED, {piece: SECOND_PIECE, image: secondOverlay}]}
        previewLabel="Preview of your look on you"
        stream={streamWithTrack}
      />,
    );

    expect(mocks.attachCameraStream).toHaveBeenCalledTimes(1);
  });
});
