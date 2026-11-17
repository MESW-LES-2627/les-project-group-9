import {StrictMode} from 'react';
import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  loadOverlayImage: vi.fn(),
  overlayTransparency: vi.fn(),
  createFaceDetector: vi.fn(),
  close: vi.fn(),
  requestCamera: vi.fn(),
  stopStream: vi.fn(),
  cameraSupport: vi.fn(),
}));

vi.mock('~/lib/try-on/overlay', () => ({
  loadOverlayImage: mocks.loadOverlayImage,
  overlayTransparency: mocks.overlayTransparency,
}));

vi.mock('~/lib/try-on/face-landmarker', () => ({
  createFaceDetector: mocks.createFaceDetector,
}));

vi.mock('~/lib/try-on/camera', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/try-on/camera')>();
  return {
    ...actual,
    requestCamera: mocks.requestCamera,
    stopStream: mocks.stopStream,
    cameraSupport: mocks.cameraSupport,
  };
});

vi.mock('~/components/try-on/CameraStage', () => ({
  CameraStage: ({
    detector,
    onFailure,
  }: {
    detector: unknown;
    onFailure: (reason: string) => void;
  }) => (
    <div data-detector={detector ? 'ready' : 'pending'} data-testid="camera-stage">
      <button onClick={() => onFailure('denied')} type="button">
        Fail camera
      </button>
    </div>
  ),
}));

import {TryOnDialog} from '~/components/try-on/TryOnDialog';

const PIECE = {
  kind: 'earring' as const,
  overlayUrl: 'https://cdn.example/earring.png?cors=1',
  sizeCm: 2,
};

function fakeDetector() {
  return {
    detectVideo: vi.fn(),
    detectImage: vi.fn(),
    close: mocks.close,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return {promise, resolve};
}

function renderDialog(
  initialMode: 'camera' | 'photo' = 'camera',
  overrides: {autoStart?: boolean} = {},
) {
  return render(
    <TryOnDialog
      autoStart={overrides.autoStart ?? true}
      initialMode={initialMode}
      onClose={vi.fn()}
      piece={PIECE}
      title="Aura Earrings"
    />,
  );
}

beforeEach(() => {
  mocks.loadOverlayImage
    .mockReset()
    .mockResolvedValue({naturalWidth: 200, naturalHeight: 100});
  mocks.overlayTransparency.mockReset().mockReturnValue('transparent');
  mocks.close.mockReset();
  mocks.requestCamera
    .mockReset()
    .mockResolvedValue({stream: {} as MediaStream, error: null});
  mocks.stopStream.mockReset();
  mocks.cameraSupport.mockReset().mockReturnValue(null);
  mocks.createFaceDetector.mockReset().mockResolvedValue(fakeDetector());
});

describe('TryOnDialog', () => {
  it('shows the live preview before the landmarker finishes', async () => {
    const pending = deferred<ReturnType<typeof fakeDetector>>();
    mocks.createFaceDetector.mockReturnValue(pending.promise);

    renderDialog();

    const stage = await screen.findByTestId('camera-stage');
    expect(stage).toHaveAttribute('data-detector', 'pending');

    await act(async () => {
      pending.resolve(fakeDetector());
    });

    await waitFor(() =>
      expect(screen.getByTestId('camera-stage')).toHaveAttribute(
        'data-detector',
        'ready',
      ),
    );
  });

  it('requests the camera right after the tap and releases it on close', async () => {
    const {unmount} = renderDialog();

    await screen.findByTestId('camera-stage');
    expect(mocks.requestCamera).toHaveBeenCalledTimes(1);
    expect(mocks.createFaceDetector).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('Your camera and photos stay on this device.'),
    ).toBeInTheDocument();

    unmount();
    await waitFor(() => expect(mocks.stopStream).toHaveBeenCalled());
    await waitFor(() => expect(mocks.close).toHaveBeenCalled());
  });

  it('keeps the camera and landmarker alive across StrictMode remounts', async () => {
    render(
      <StrictMode>
        <TryOnDialog
          autoStart
          initialMode="camera"
          onClose={vi.fn()}
          piece={PIECE}
          title="Aura Earrings"
        />
      </StrictMode>,
    );

    await screen.findByTestId('camera-stage');
    expect(mocks.requestCamera).toHaveBeenCalledTimes(1);
    expect(mocks.stopStream).not.toHaveBeenCalled();
  });

  it('asks for a start tap after a QR link instead of auto-opening', async () => {
    const user = userEvent.setup();
    renderDialog('camera', {autoStart: false});

    expect(
      await screen.findByText(
        'Tap below to open your camera and try Aura Earrings on.',
      ),
    ).toBeInTheDocument();
    expect(mocks.requestCamera).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', {name: 'Open camera'}));

    expect(await screen.findByTestId('camera-stage')).toBeInTheDocument();
    expect(mocks.requestCamera).toHaveBeenCalledTimes(1);
  });

  it('refuses to paint an opaque overlay over the shopper', async () => {
    mocks.overlayTransparency.mockReturnValue('opaque');

    renderDialog();

    expect(
      await screen.findByText('Try-on isn’t available for this piece yet.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('camera-stage')).not.toBeInTheDocument();
    // The landmarker starts in parallel; it is closed when the dialog unmounts.
    expect(mocks.createFaceDetector).toHaveBeenCalledTimes(1);
    expect(mocks.stopStream).toHaveBeenCalled();
  });

  it('falls back to the photo upload when the camera is denied', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole('button', {name: 'Fail camera'}));

    expect(
      screen.getByText('Camera access is off. Upload a photo instead.'),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('Upload a photo')).toBeInTheDocument();
    expect(screen.queryByTestId('camera-stage')).not.toBeInTheDocument();
  });

  it('offers the photo fallback and a retry when the camera cannot open', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mocks.requestCamera.mockResolvedValue({
      stream: null,
      error: new DOMException('busy', 'NotReadableError'),
    });

    renderDialog();

    expect(
      await screen.findByText(
        'This device can’t start the camera. Upload a photo instead.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Try again'})).toBeInTheDocument();
    expect(await screen.findByLabelText('Upload a photo')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('retries the camera from the failure button', async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mocks.requestCamera.mockResolvedValueOnce({
      stream: null,
      error: new DOMException('busy', 'NotReadableError'),
    });

    renderDialog();
    await user.click(await screen.findByRole('button', {name: 'Try again'}));

    expect(await screen.findByTestId('camera-stage')).toBeInTheDocument();
    expect(mocks.requestCamera).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it('explains an unsupported browser instead of asking for the camera', async () => {
    mocks.cameraSupport.mockReturnValue('unsupported');

    renderDialog();

    expect(
      await screen.findByText(
        'This browser can’t open the camera. Open the page in Safari or Chrome.',
      ),
    ).toBeInTheDocument();
    expect(mocks.requestCamera).not.toHaveBeenCalled();
    expect(await screen.findByLabelText('Upload a photo')).toBeInTheDocument();
  });

  it('starts in photo mode for desktops without opening the camera', async () => {
    renderDialog('photo');

    expect(await screen.findByLabelText('Upload a photo')).toBeInTheDocument();
    expect(mocks.requestCamera).not.toHaveBeenCalled();
  });

  it('shows a single failure message when the overlay cannot load', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mocks.loadOverlayImage.mockRejectedValue(new Error('overlay-load: 404'));

    renderDialog();

    const messages = await screen.findAllByText(
      'Something went wrong. Please try again.',
    );

    expect(messages).toHaveLength(1);
    expect(mocks.stopStream).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('closes the landmarker when unmounted', async () => {
    const {unmount} = renderDialog();

    await screen.findByTestId('camera-stage');
    await waitFor(() =>
      expect(screen.getByTestId('camera-stage')).toHaveAttribute(
        'data-detector',
        'ready',
      ),
    );

    unmount();
    await waitFor(() => expect(mocks.close).toHaveBeenCalledTimes(1));
  });

  it('shows the exact browser error on the failure banner', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mocks.requestCamera.mockResolvedValue({
      stream: null,
      error: new DOMException('busy', 'NotReadableError'),
    });

    renderDialog();

    expect(
      await screen.findByText('Details: NotReadableError: busy'),
    ).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('shows the WASM/landmarker error when it cannot start', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mocks.createFaceDetector.mockRejectedValue(
      new Error('ModuleFactory not set.'),
    );

    renderDialog();

    expect(
      await screen.findByText('Details: Error: ModuleFactory not set.'),
    ).toBeInTheDocument();
    consoleError.mockRestore();
  });
});