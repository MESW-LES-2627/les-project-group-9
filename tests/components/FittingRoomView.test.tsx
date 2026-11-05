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
    material: {value: 'gold-plated'},
  },
  {
    id: 'gid://shopify/Product/2',
    title: 'Silver Necklace',
    handle: 'silver-necklace',
    priceRange: {minVariantPrice: {amount: '120.0', currencyCode: 'EUR'}},
    featuredImage: {url: '/silver.jpg', altText: 'Silver necklace'},
  },
];

describe('FittingRoomView', () => {
  it('lists the saved pieces and marks the selected ones', () => {
    render(
      <FittingRoomView
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        onToggle={vi.fn()}
        products={products}
        selectedIds={['gid://shopify/Product/1']}
      />,
    );

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

    render(
      <FittingRoomView
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        onToggle={onToggle}
        products={products}
        selectedIds={[]}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', {name: 'Select Silver Necklace'}),
    );

    expect(onToggle).toHaveBeenCalledWith('gid://shopify/Product/2');
  });

  it('supports select all and clear', async () => {
    const user = userEvent.setup();
    const onSelectAll = vi.fn();
    const onClear = vi.fn();

    render(
      <FittingRoomView
        onClear={onClear}
        onSelectAll={onSelectAll}
        onToggle={vi.fn()}
        products={products}
        selectedIds={['gid://shopify/Product/1']}
      />,
    );

    await user.click(screen.getByRole('button', {name: 'Select all'}));
    await user.click(screen.getByRole('button', {name: 'Clear'}));

    expect(onSelectAll).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows the virtual try-on placeholder until pieces are selected', () => {
    render(
      <FittingRoomView
        onClear={vi.fn()}
        onSelectAll={vi.fn()}
        onToggle={vi.fn()}
        products={products}
        selectedIds={[]}
      />,
    );

    expect(screen.getByText('See it on you')).toBeInTheDocument();
    expect(screen.getByText(/select at least one piece/i)).toBeInTheDocument();
  });
});
