import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {TryOnQrDialog} from '~/components/try-on/TryOnQrDialog';

const LINK = 'https://shop.example/products/aura?tryOn=1';

describe('TryOnQrDialog', () => {
  it('shows a QR code and a plain link for the try-on page', () => {
    render(
      <TryOnQrDialog
        onClose={vi.fn()}
        onUpload={vi.fn()}
        tryOnLink={LINK}
      />,
    );

    expect(screen.getByRole('dialog', {name: 'Try it on your phone'})).toBeInTheDocument();
    expect(
      screen.getByRole('img', {name: 'Try it on your phone'}),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Open the try-on link'})).toHaveAttribute(
      'href',
      LINK,
    );
    expect(
      screen.getByText('Scan this code with your phone camera to open the try-on view.'),
    ).toBeInTheDocument();
  });

  it('lets a desktop shopper upload a photo instead', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();

    render(
      <TryOnQrDialog onClose={vi.fn()} onUpload={onUpload} tryOnLink={LINK} />,
    );

    await user.click(screen.getByRole('button', {name: 'Upload a photo'}));

    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('closes with Escape and with the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TryOnQrDialog onClose={onClose} onUpload={vi.fn()} tryOnLink={LINK} />,
    );

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', {name: 'Close'}));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
