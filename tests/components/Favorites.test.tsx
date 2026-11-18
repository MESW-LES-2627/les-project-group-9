import type {ReactNode} from 'react';
import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  useFavorites: vi.fn(),
}));

const fetcherData = {
  products: [
    {
      id: 'gid://shopify/Product/1',
      title: 'Gold ring',
      handle: 'gold-ring',
      priceRange: {
        minVariantPrice: {amount: '35.0', currencyCode: 'EUR'},
      },
      featuredImage: null,
      options: [],
      variants: {nodes: []},
      selectedOrFirstAvailableVariant: null,
    },
  ],
  reasons: {
    'gid://shopify/Product/1': [{code: 'preferredMaterials'}],
  },
};

vi.mock('~/lib/favorites', () => ({
  useFavorites: mocks.useFavorites,
}));
vi.mock('~/lib/profile/ProfileProvider', () => ({
  useProfile: () => ({
    preferences: {preferredMaterials: ['gold-plated']},
  }),
}));
vi.mock('react-router', () => ({
  Link: ({children, to}: {children: ReactNode; to: string}) => (
    <a href={to}>{children}</a>
  ),
  useFetcher: () => ({load: vi.fn(), data: fetcherData}),
}));
vi.mock('~/components/product/ProductItem', () => ({
  ProductItem: () => <div />,
}));
vi.mock('~/lib/products.server', () => ({
  loadProductsByIds: vi.fn(),
  parseProductIds: vi.fn(() => []),
}));

import Favorites from '~/routes/favorites';

describe('Favorites', () => {
  beforeEach(() => {
    mocks.useFavorites.mockReturnValue({
      ids: [],
      ready: true,
      isLoggedIn: true,
    });
  });

  it('shows suggestions when preferences exist and favorites are empty', () => {
    render(<Favorites />);

    expect(
      screen.getByRole('heading', {name: 'Nothing saved yet.'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {name: 'Picked for you'}),
    ).toBeInTheDocument();
    expect(screen.getByText('Based on your preferences')).toBeInTheDocument();
    expect(
      screen.getByText('Matches your preferred materials'),
    ).toBeInTheDocument();
  });
});
