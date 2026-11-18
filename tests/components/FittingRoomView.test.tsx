import type {ComponentProps} from 'react';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import type {FittingRoomPiece} from '~/lib/profile/fitting-room';

vi.mock('@shopify/hydrogen', () => ({
  Image: ({alt}: {alt?: string}) => <img alt={alt ?? ''} />,
}));

vi.mock('~/lib/try-on/preload', () => ({
  preloadTryOnAssets: vi.fn(),
}));

vi.mock('~/lib/try-on/overlay', () => ({
  preloadOverlayImage: vi.fn(),
  loadOverlayImage: vi.fn(),
  overlayTransparency: vi.fn(),
}));

vi.mock('~/lib/try-on/camera', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/try-on/camera')>();
  return {
    ...actual,
    requestCamera: vi.fn().mockResolvedValue({stream: null, error: null}),
  };
});

vi.mock('~/components/try-on/TryOnQrDialog', () => ({
  TryOnQrDialog: () => <div data-testid="qr-dialog" />,
}));

vi.mock('~/components/try-on/TryOnDialog', () => ({
  TryOnDialog: ({initialMode}: {initialMode: string}) => (
    <div data-mode={initialMode} data-testid="camera-dialog" />
  ),
}));

import {FittingRoomView} from '../../app/components/fitting-room/FittingRoomView';

const VARIANT_A = 'gid://shopify/ProductVariant/1';
const VARIANT_B = 'gid://shopify/ProductVariant/2';

const TRY_ON = {
  kind: 'necklace' as const,
  overlayUrl: 'https://cdn.example/necklace.png?cors=1',
  sizeCm: 16,
};

function piece(overrides: Partial<FittingRoomPiece> = {}): FittingRoomPiece {
  return {
    variantId: VARIANT_A,
    product: {
      id: 'gid://shopify/Product/1',
      title: 'Gold Ring',
      handle: 'gold-ring',
      priceRange: {minVariantPrice: {amount: '89.0', currencyCode: 'EUR'}},
    },
    image: {url: '/gold.jpg', altText: 'Gold ring'},
    variantTitle: 'Default Title',
    price: {amount: '89.0', currencyCode: 'EUR'},
    available: true,
    tryOn: null,
    tryOnLink: 'https://shop.example/products/gold-ring?tryOn=1',
    ...overrides,
  };
}

const necklace = piece({
  variantId: VARIANT_B,
  product: {
    id: 'gid://shopify/Product/2',
    title: 'Silver Necklace',
    handle: 'silver-necklace',
    priceRange: {minVariantPrice: {amount: '120.0', currencyCode: 'EUR'}},
  },
  image: {url: '/silver.jpg', altText: 'Silver necklace'},
  price: {amount: '120.0', currencyCode: 'EUR'},
  tryOn: TRY_ON,
  tryOnLink:
    'https://shop.example/products/silver-necklace?Color=Silver&tryOn=1',
});

function renderView(
  overrides: Partial<ComponentProps<typeof FittingRoomView>> = {},
) {
  return render(
    <FittingRoomView
      isMobile={false}
      movingId={null}
      onClear={vi.fn()}
      onMoveToCart={vi.fn()}
      onRemove={vi.fn()}
      onSelectAll={vi.fn()}
      onToggle={vi.fn()}
      pieces={[piece(), necklace]}
      selectedIds={[]}
      {...overrides}
    />,
  );
}

describe('FittingRoomView', () => {
  it('lists the saved variants and marks the selected ones', () => {
    renderView({selectedIds: [VARIANT_A]});

    expect(screen.getByText('2 pieces')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {name: 'Select Gold Ring'}),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', {name: 'Select Silver Necklace'}),
    ).not.toBeChecked();
    expect(screen.getByText(/1 piece/)).toBeInTheDocument();
  });

  it('shows the colour of a non-default variant', () => {
    renderView({
      pieces: [piece({variantTitle: 'Clear'})],
    });

    expect(within(screen.getByRole('listitem')).getByText('Clear')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {name: 'Select Gold Ring · Clear'}),
    ).toBeInTheDocument();
  });

  it('keeps two colours of the same product as separate rows', () => {
    renderView({
      pieces: [
        piece({variantId: VARIANT_A, variantTitle: 'Clear'}),
        piece({variantId: VARIANT_B, variantTitle: 'Pink'}),
      ],
      selectedIds: [VARIANT_A],
    });

    expect(screen.getByText('2 pieces')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {name: 'Select Gold Ring · Clear'}),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', {name: 'Select Gold Ring · Pink'}),
    ).not.toBeChecked();
  });

  it('toggles a variant through its checkbox', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    renderView({onToggle});

    await user.click(
      screen.getByRole('checkbox', {name: 'Select Silver Necklace'}),
    );

    expect(onToggle).toHaveBeenCalledWith(VARIANT_B);
  });

  it('supports select all and clear', async () => {
    const user = userEvent.setup();
    const onSelectAll = vi.fn();
    const onClear = vi.fn();

    renderView({onClear, onSelectAll, selectedIds: [VARIANT_A]});

    await user.click(screen.getByRole('button', {name: 'Select all'}));
    await user.click(screen.getByRole('button', {name: 'Clear'}));

    expect(onSelectAll).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('removes a variant from the fitting room', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    renderView({onRemove});

    await user.click(
      screen.getByRole('button', {
        name: 'Remove Gold Ring from fitting room',
      }),
    );

    expect(onRemove).toHaveBeenCalledWith(VARIANT_A);
  });

  it('moves a variant to the cart', async () => {
    const user = userEvent.setup();
    const onMoveToCart = vi.fn();

    renderView({onMoveToCart});

    await user.click(
      screen.getByRole('button', {name: 'Move Gold Ring to cart'}),
    );

    expect(onMoveToCart).toHaveBeenCalledWith(VARIANT_A);
  });

  it('disables move to cart when the variant is sold out but keeps try-on', () => {
    renderView({pieces: [piece({available: false, tryOn: TRY_ON})]});

    const button = screen.getByRole('button', {
      name: 'Move Gold Ring to cart',
    });

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Sold out');
    expect(
      screen.getByRole('button', {name: 'Try on Gold Ring'}),
    ).toBeEnabled();
  });

  it('shows the moving state while a variant is being moved', () => {
    renderView({movingId: VARIANT_A});

    expect(
      screen.getByRole('button', {name: 'Move Gold Ring to cart'}),
    ).toHaveTextContent('Moving…');
    expect(
      screen.getByRole('button', {
        name: 'Remove Gold Ring from fitting room',
      }),
    ).toBeDisabled();
  });

  it('shows the virtual try-on panel until pieces are selected', () => {
    renderView();

    expect(screen.getByText('See it on you')).toBeInTheDocument();
    expect(screen.getByText(/select at least one piece/i)).toBeInTheDocument();
  });

  it('offers try-on only for variants with an overlay', () => {
    renderView();

    expect(
      screen.getByRole('button', {name: 'Try on Silver Necklace'}),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Try on Gold Ring'}),
    ).not.toBeInTheDocument();
  });

  it('opens the QR code from the fitting room on a computer', async () => {
    const user = userEvent.setup();

    renderView({pieces: [necklace]});

    await user.click(
      screen.getByRole('button', {name: 'Try on Silver Necklace'}),
    );

    expect(screen.getByTestId('qr-dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('camera-dialog')).not.toBeInTheDocument();
  });

  it('opens the camera from the fitting room on a phone', async () => {
    const user = userEvent.setup();

    renderView({isMobile: true, pieces: [necklace]});

    await user.click(
      screen.getByRole('button', {name: 'Try on Silver Necklace'}),
    );

    expect(screen.getByTestId('camera-dialog')).toHaveAttribute(
      'data-mode',
      'camera',
    );
  });
});
