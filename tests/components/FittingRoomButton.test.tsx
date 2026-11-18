import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  has: vi.fn(),
  toggle: vi.fn(),
  useFittingRoom: vi.fn(),
}));

vi.mock('~/lib/fitting-room', () => ({
  useFittingRoom: mocks.useFittingRoom,
}));

import {FittingRoomButton} from '../../app/components/product/FittingRoomButton';

const PRODUCT_ID = 'gid://shopify/Product/1';

beforeEach(() => {
  mocks.has.mockReset();
  mocks.toggle.mockReset();
  mocks.useFittingRoom.mockReset();
  mocks.useFittingRoom.mockReturnValue({
    has: mocks.has,
    toggle: mocks.toggle,
    isLoggedIn: true,
  });
});

describe('FittingRoomButton', () => {
  it('adds the piece when it is not in the fitting room', async () => {
    const user = userEvent.setup();
    mocks.has.mockReturnValue(false);

    render(<FittingRoomButton productId={PRODUCT_ID} title="Solstice Ring" />);

    const button = screen.getByRole('button', {
      name: 'Add Solstice Ring to fitting room',
    });

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('data-active', 'false');

    await user.click(button);

    expect(mocks.toggle).toHaveBeenCalledWith(PRODUCT_ID);
  });

  it('is not offered for pieces that cannot be tried on', () => {
    render(
      <FittingRoomButton
        canTryOn={false}
        productId={PRODUCT_ID}
        title="Solstice Ring"
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reflects a piece that is already in the fitting room', () => {
    mocks.has.mockReturnValue(true);

    render(<FittingRoomButton productId={PRODUCT_ID} title="Solstice Ring" />);

    expect(
      screen.getByRole('button', {
        name: 'Remove Solstice Ring from fitting room',
      }),
    ).toHaveAttribute('data-active', 'true');
  });
});
