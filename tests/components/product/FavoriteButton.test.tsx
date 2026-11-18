import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  has: vi.fn(),
  toggle: vi.fn(),
  isLoggedIn: true,
  assign: vi.fn(),
}));

vi.mock('~/lib/favorites', () => ({
  useFavorites: () => ({
    has: mocks.has,
    toggle: mocks.toggle,
    isLoggedIn: mocks.isLoggedIn,
  }),
}));

import {FavoriteButton} from '~/components/product/FavoriteButton';

function renderButton() {
  return render(<FavoriteButton productId="product-1" title="Ring" />);
}

beforeEach(() => {
  mocks.has.mockReset().mockReturnValue(false);
  mocks.toggle.mockReset();
  mocks.assign.mockReset();
  mocks.isLoggedIn = true;

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {...window.location, assign: mocks.assign},
  });
});

describe('FavoriteButton', () => {
  it('offers to add the product when it is not a favorite', () => {
    renderButton();

    const button = screen.getByRole('button', {name: 'Add Ring to favorites'});

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('data-active', 'false');
  });

  it('offers to remove the product when it is a favorite', () => {
    mocks.has.mockReturnValue(true);

    renderButton();

    const button = screen.getByRole('button', {
      name: 'Remove Ring from favorites',
    });

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-active', 'true');
  });

  it('toggles the favorite when clicked', async () => {
    renderButton();

    await userEvent.click(screen.getByRole('button'));

    expect(mocks.toggle).toHaveBeenCalledWith('product-1');
  });

  it('sends a logged-out shopper to the login page', async () => {
    mocks.isLoggedIn = false;

    renderButton();

    await userEvent.click(
      screen.getByRole('button', {name: 'Log in to save Ring to favorites'}),
    );

    expect(mocks.assign).toHaveBeenCalledWith('/account/login');
    expect(mocks.toggle).not.toHaveBeenCalled();
  });
});
