import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {OptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

vi.mock('react-router', () => ({
  useFetcher: () => ({state: 'idle', data: undefined}),
}));

vi.mock('@shopify/hydrogen', () => {
  const CartForm = Object.assign(
    ({children}: {children: React.ReactNode}) => (
      <form onSubmit={(event) => event.preventDefault()}>{children}</form>
    ),
    {
      ACTIONS: {
        DiscountCodesUpdate: 'DiscountCodesUpdate',
        GiftCardCodesAdd: 'GiftCardCodesAdd',
        GiftCardCodesRemove: 'GiftCardCodesRemove',
      },
    },
  );

  return {
    CartForm,
  };
});

import {CartSummary} from '~/components/cart/CartSummary';

type Cart = OptimisticCart<CartApiQueryFragment | null>;

function makeCart(overrides: Record<string, unknown> = {}) {
  return {
    checkoutUrl: 'https://checkout.example.com/c/1',
    cost: {subtotalAmount: {amount: '120.00', currencyCode: 'EUR'}},
    discountCodes: [],
    appliedGiftCards: [],
    ...overrides,
  } as unknown as Cart;
}

describe('CartSummary', () => {
  it('shows the subtotal', () => {
    render(<CartSummary cart={makeCart()} layout="page" />);

    expect(screen.getByText('Subtotal').nextElementSibling).toHaveTextContent(
      '120.00',
    );
  });

  it('shows a dash when there is no subtotal', () => {
    render(<CartSummary cart={makeCart({cost: null})} layout="page" />);

    expect(screen.getByText('Subtotal').nextElementSibling).toHaveTextContent(
      '-',
    );
  });

  it('links to the checkout', () => {
    render(<CartSummary cart={makeCart()} layout="page" />);

    expect(screen.getByRole('link', {name: /Checkout/})).toHaveAttribute(
      'href',
      'https://checkout.example.com/c/1',
    );
  });

  it('hides the checkout link without a checkout URL', () => {
    render(
      <CartSummary cart={makeCart({checkoutUrl: undefined})} layout="page" />,
    );

    expect(
      screen.queryByRole('link', {name: /Checkout/}),
    ).not.toBeInTheDocument();
  });

  it('lists the applied discount codes', () => {
    render(
      <CartSummary
        cart={makeCart({
          discountCodes: [
            {code: 'SPRING10', applicable: true},
            {code: 'EXPIRED', applicable: false},
          ],
        })}
        layout="page"
      />,
    );

    const applied = screen.getByRole('list', {name: 'Applied codes'});

    expect(applied).toHaveTextContent('SPRING10');
    expect(applied).not.toHaveTextContent('EXPIRED');
  });
});
