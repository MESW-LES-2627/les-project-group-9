import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  requestCamera: vi.fn(),
}));

vi.mock('~/lib/try-on/preload', () => ({
  preloadTryOnAssets: vi.fn(),
}));

vi.mock('~/lib/try-on/camera', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/try-on/camera')>();
  return {...actual, requestCamera: mocks.requestCamera};
});

vi.mock('~/components/try-on/TryOnDialog', () => ({
  TryOnDialog: ({
    autoStart,
    initialMode,
  }: {
    autoStart?: boolean;
    initialMode: string;
  }) => (
    <div
      data-autostart={String(autoStart)}
      data-mode={initialMode}
      data-testid="try-on-dialog"
    />
  ),
}));

vi.mock('~/components/try-on/TryOnQrDialog', () => ({
  TryOnQrDialog: ({onUpload}: {onUpload: () => void}) => (
    <div data-testid="qr-dialog">
      <button onClick={onUpload} type="button">
        Mock upload
      </button>
    </div>
  ),
}));

import {TryOnButton} from '~/components/product/TryOnButton';

const PIECE = {
  kind: 'earring' as const,
  overlayUrl: 'https://cdn.example/earring.png?cors=1',
  sizeCm: 2,
};
const LINK = 'https://shop.example/products/aura?tryOn=1';

function renderButton(isMobile = false) {
  return render(
    <TryOnButton
      isMobile={isMobile}
      piece={PIECE}
      title="Aura Earrings"
      tryOnLink={LINK}
    />,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/products/aura');
  mocks.requestCamera
    .mockReset()
    .mockResolvedValue({stream: {} as MediaStream, error: null});
});

describe('TryOnButton', () => {
  it('shows the labelled button with the hint', () => {
    renderButton();

    expect(screen.getByRole('button', {name: 'Try on'})).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
    expect(
      screen.getByText('See it on you with your camera'),
    ).toBeInTheDocument();
  });

  it('opens the QR code on a computer without requesting the camera', async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', {name: 'Try on'}));

    expect(screen.getByTestId('qr-dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('try-on-dialog')).not.toBeInTheDocument();
    expect(mocks.requestCamera).not.toHaveBeenCalled();
  });

  it('requests the camera inside the tap on a phone', async () => {
    const user = userEvent.setup();
    renderButton(true);

    await user.click(screen.getByRole('button', {name: 'Try on'}));

    expect(mocks.requestCamera).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('try-on-dialog')).toHaveAttribute(
      'data-mode',
      'camera',
    );
    expect(screen.getByTestId('try-on-dialog')).toHaveAttribute(
      'data-autostart',
      'true',
    );
  });

  it('switches the QR code to the photo try-on', async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', {name: 'Try on'}));
    await user.click(screen.getByRole('button', {name: 'Mock upload'}));

    expect(screen.getByTestId('try-on-dialog')).toHaveAttribute(
      'data-mode',
      'photo',
    );
    expect(mocks.requestCamera).not.toHaveBeenCalled();
  });

  it('opens the QR code from a ?tryOn=1 link and clears the parameter', async () => {
    window.history.replaceState({}, '', '/products/aura?tryOn=1');

    renderButton();

    expect(await screen.findByTestId('qr-dialog')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('asks for a start tap from a ?tryOn=1 link on a phone', async () => {
    window.history.replaceState({}, '', '/products/aura?tryOn=1');

    renderButton(true);

    const dialog = await screen.findByTestId('try-on-dialog');

    expect(dialog).toHaveAttribute('data-mode', 'camera');
    expect(dialog).toHaveAttribute('data-autostart', 'false');
    expect(mocks.requestCamera).not.toHaveBeenCalled();
  });

  it('keeps other query parameters when clearing the deep link', async () => {
    window.history.replaceState({}, '', '/products/aura?tryOn=1&variant=2');

    renderButton();

    await screen.findByTestId('qr-dialog');
    expect(window.location.search).toBe('?variant=2');
  });
});
