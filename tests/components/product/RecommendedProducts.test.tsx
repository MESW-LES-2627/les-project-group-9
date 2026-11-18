import {render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  useFavorites: vi.fn(),
  useProfile: vi.fn(),
  data: undefined as unknown,
}));

vi.mock('~/lib/favorites', () => ({
  useFavorites: mocks.useFavorites,
}));
vi.mock('~/lib/profile/ProfileProvider', () => ({
  useProfile: mocks.useProfile,
}));
vi.mock('react-router', () => ({
  useFetcher: () => ({load: mocks.load, data: mocks.data}),
}));
vi.mock('~/components/product/ProductItem', () => ({
  ProductItem: () => <div />,
}));

import {RecommendedProducts} from '~/components/product/RecommendedProducts';

describe('RecommendedProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.data = undefined;
    mocks.useFavorites.mockReturnValue({
      ids: [],
      ready: true,
      syncing: false,
    });
    mocks.useProfile.mockReturnValue({preferences: null});
  });

  it('loads recommendations when preferences exist without favorites', async () => {
    mocks.useProfile.mockReturnValue({
      preferences: {skin: {undertone: 'warm'}},
    });

    render(<RecommendedProducts />);

    await waitFor(() => {
      expect(mocks.load).toHaveBeenCalledWith('/api/recommendations?limit=4');
    });
  });

  it('uses preferences copy when there are no favorites', () => {
    mocks.useProfile.mockReturnValue({
      preferences: {skin: {undertone: 'warm'}},
    });
    mocks.data = {
      products: [{id: 'gid://shopify/Product/1'}],
      reasons: {'gid://shopify/Product/1': [{code: 'undertone'}]},
    };

    render(<RecommendedProducts />);

    expect(screen.getByText('Picked for you')).toBeInTheDocument();
    expect(screen.getByText('Based on your preferences')).toBeInTheDocument();
    expect(screen.getByText('Matches your undertone')).toBeInTheDocument();
  });

  it('does nothing without favorites or preferences', async () => {
    render(<RecommendedProducts />);

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mocks.load).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('uses favorites copy when there are favorites', async () => {
    mocks.useFavorites.mockReturnValue({
      ids: ['gid://shopify/Product/1'],
      ready: true,
      syncing: false,
    });
    mocks.data = {
      products: [{id: 'gid://shopify/Product/2'}],
      reasons: {'gid://shopify/Product/2': [{code: 'sameMaterial'}]},
    };

    render(<RecommendedProducts />);

    await waitFor(() => {
      expect(mocks.load).toHaveBeenCalledWith('/api/recommendations?limit=4');
    });
    expect(screen.getByText('You may also like')).toBeInTheDocument();
    expect(screen.getByText('Because you liked these')).toBeInTheDocument();
  });

  it('hides the section when the API returns no products', async () => {
    mocks.useProfile.mockReturnValue({
      preferences: {preferredMaterials: ['gold-plated']},
    });
    mocks.data = {products: [], reasons: {}};

    render(<RecommendedProducts />);

    await waitFor(() => {
      expect(mocks.load).toHaveBeenCalled();
    });
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
