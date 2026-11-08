import type {ComponentProps} from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import type {CatalogProduct} from '~/lib/jeweliette-catalog';

vi.mock('@shopify/hydrogen', () => ({
  Image: ({alt}: {alt?: string}) => <img alt={alt ?? ''} />,
  Money: ({data}: {data: {amount: string}}) => <span>{data.amount}</span>,
}));

import {FittingRoomView} from '../../app/components/fitting-room/FittingRoomView';

const products: CatalogProduct[] = [
  {
    id: 'gid://shopify/Product/1',
    title: 'Gold Ring',
    handle: 'gold-ring',
    priceRange: {minVariantPrice: {amount: '89.0', currencyCode: 'EUR'}},
    featuredImage: {url: '/gold.jpg', altText: 'Gold ring'},
    materials: {
      references: {
        nodes: [
          {
            handle: 'gold-plated',
            fields: [{key: 'label', value: 'Gold-plated'}],
          },
        ],
      },
    },
    selectedOrFirstAvailableVariant: {
      id: 'gid://shopify/ProductVariant/1',
      availableForSale: true,
    },
  },
  {
    id: 'gid://shopify/Product/2',
    title: 'Silver Necklace',
    handle: 'silver-necklace',
    priceRange: {minVariantPrice: {amount: '120.0', currencyCode: 'EUR'}},
    featuredImage: {url: '/silver.jpg', altText: 'Silver necklace'},
    selectedOrFirstAvailableVariant: {
      id: 'gid://shopify/ProductVariant/2',
      availableForSale: true,
    },
  },
];

function renderView(
  overrides: Partial<ComponentProps<typeof FittingRoomView>> = {},
) {
  return render(
    <FittingRoomView
      movingId={null}
      onClear={vi.fn()}
      onMoveToCart={vi.fn()}
      onRemove={vi.fn()}
      onSelectAll={vi.fn()}
      onToggle={vi.fn()}
      products={products}
      selectedIds={[]}
      {...overrides}
    />,
  );
}

describe('FittingRoomView', () => {
  it('lists the saved pieces and marks the selected ones', () => {
    renderView({selectedIds: ['gid://shopify/Product/1']});

    expect(screen.getByText('2 pieces')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {name: 'Select Gold Ring'}),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', {name: 'Select Silver Necklace'}),
    ).not.toBeChecked();
    expect(screen.getByText(/1 piece/)).toBeInTheDocument();
  });

  it('toggles a piece through its checkbox', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    renderView({onToggle});

    await user.click(
      screen.getByRole('checkbox', {name: 'Select Silver Necklace'}),
    );

    expect(onToggle).toHaveBeenCalledWith('gid://shopify/Product/2');
  });

  it('supports select all and clear', async () => {
    const user = userEvent.setup();
    const onSelectAll = vi.fn();
    const onClear = vi.fn();

    renderView({
      onClear,
      onSelectAll,
      selectedIds: ['gid://shopify/Product/1'],
    });

    await user.click(screen.getByRole('button', {name: 'Select all'}));
    await user.click(screen.getByRole('button', {name: 'Clear'}));

    expect(onSelectAll).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('removes a piece from the fitting room', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    renderView({onRemove});

    await user.click(
      screen.getByRole('button', {
        name: 'Remove Gold Ring from fitting room',
      }),
    );

    expect(onRemove).toHaveBeenCalledWith('gid://shopify/Product/1');
  });

  it('moves a piece to the cart', async () => {
    const user = userEvent.setup();
    const onMoveToCart = vi.fn();

    renderView({onMoveToCart});

    await user.click(
      screen.getByRole('button', {name: 'Move Gold Ring to cart'}),
    );

    expect(onMoveToCart).toHaveBeenCalledWith('gid://shopify/Product/1');
  });

  it('disables move to cart when the piece is sold out', () => {
    const soldOut: CatalogProduct = {
      ...products[0],
      selectedOrFirstAvailableVariant: {
        id: 'gid://shopify/ProductVariant/1',
        availableForSale: false,
      },
    };

    renderView({products: [soldOut]});

    const button = screen.getByRole('button', {
      name: 'Move Gold Ring to cart',
    });

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Sold out');
  });

  it('shows the moving state while a piece is being moved', () => {
    renderView({movingId: 'gid://shopify/Product/1'});

    expect(
      screen.getByRole('button', {name: 'Move Gold Ring to cart'}),
    ).toHaveTextContent('Moving…');
    expect(
      screen.getByRole('button', {
        name: 'Remove Gold Ring from fitting room',
      }),
    ).toBeDisabled();
  });

  it('shows the virtual try-on placeholder until pieces are selected', () => {
    renderView();

    expect(screen.getByText('See it on you')).toBeInTheDocument();
    expect(screen.getByText(/select at least one piece/i)).toBeInTheDocument();
  });
});
