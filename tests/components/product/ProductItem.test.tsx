import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {CatalogProduct} from '~/lib/jeweliette-catalog';

const mocks = vi.hoisted(() => ({
  requestSubmit: vi.fn(),
  useAllergenMatches: vi.fn(),
}));

vi.mock('react-router', () => ({
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  >) => <a {...props}>{children}</a>,
}));

vi.mock('@shopify/hydrogen', () => {
  const CartForm = Object.assign(
    ({children}: {children: (fetcher: {state: string}) => React.ReactNode}) => (
      <form onSubmit={(event) => event.preventDefault()}>
        {children({state: 'idle'})}
      </form>
    ),
    {ACTIONS: {LinesAdd: 'LinesAdd'}},
  );

  return {
    CartForm,
    Image: ({alt}: {alt?: string}) => <img alt={alt ?? ''} />,
  };
});

vi.mock('~/components/product/FavoriteButton', () => ({
  FavoriteButton: () => null,
}));

vi.mock('~/lib/profile/useAllergenMatches', () => ({
  useAllergenMatches: mocks.useAllergenMatches,
}));

import {ProductItem} from '~/components/product/ProductItem';

const product: CatalogProduct = {
  id: 'gid://shopify/Product/1',
  title: 'Test Piece',
  handle: 'test-piece',
  featuredImage: {url: 'https://example.com/piece.jpg', altText: 'Test Piece'},
  images: {nodes: []},
  options: [],
  priceRange: {minVariantPrice: {amount: '10.00', currencyCode: 'EUR'}},
  allergens: {value: '["nickel"]'},
  variants: {
    nodes: [{id: 'gid://shopify/ProductVariant/1', availableForSale: true}],
  },
};

beforeEach(() => {
  mocks.requestSubmit.mockReset();
  mocks.useAllergenMatches.mockReset();
  mocks.useAllergenMatches.mockReturnValue({
    matches: ['nickel'],
    loading: false,
  });

  Object.defineProperty(HTMLFormElement.prototype, 'requestSubmit', {
    configurable: true,
    value: mocks.requestSubmit,
  });
});

describe('ProductItem quick add', () => {
  it('warns before quick-adding a product that matches an allergy', async () => {
    const user = userEvent.setup();
    render(<ProductItem product={product} />);

    expect(screen.getByText('Allergen')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Add to bag'}));

    expect(screen.getByRole('dialog')).toHaveTextContent(/contains Nickel/i);
    expect(mocks.requestSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', {name: 'Yes, add to bag'}));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.requestSubmit).toHaveBeenCalledTimes(1);
  });
});
