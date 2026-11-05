import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

vi.mock('@shopify/hydrogen', () => ({
  Money: ({data}: {data: {amount: string}}) => <span>{data.amount}</span>,
}));

import {ProductPrice} from '~/components/product/ProductPrice';

const price = {amount: '40.00', currencyCode: 'EUR'} as MoneyV2;
const compareAtPrice = {amount: '55.00', currencyCode: 'EUR'} as MoneyV2;

describe('ProductPrice', () => {
  it('shows the regular price', () => {
    render(<ProductPrice price={price} />);

    expect(screen.getByRole('group', {name: 'Price'})).toHaveTextContent(
      '40.00',
    );
  });

  it('shows the compare-at price struck through when on sale', () => {
    render(<ProductPrice compareAtPrice={compareAtPrice} price={price} />);

    expect(screen.getByText('40.00')).toBeInTheDocument();
    expect(screen.getByText('55.00').closest('s')).not.toBeNull();
  });

  it('renders no amount when there is no price', () => {
    render(<ProductPrice />);

    expect(screen.getByRole('group', {name: 'Price'})).not.toHaveTextContent(
      /\d/,
    );
  });
});
