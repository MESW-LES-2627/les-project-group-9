import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {CartLine} from '~/components/cart/CartLineItem';

vi.mock('react-router', () => ({
  Link: ({
    children,
    to,
    prefetch: _prefetch,
    ...props
  }: React.PropsWithChildren<
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      to: string;
      prefetch?: string;
    }
  >) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@shopify/hydrogen', () => {
  const CartForm = Object.assign(
    ({children}: {children: React.ReactNode}) => (
      <form onSubmit={(event) => event.preventDefault()}>{children}</form>
    ),
    {ACTIONS: {LinesUpdate: 'LinesUpdate', LinesRemove: 'LinesRemove'}},
  );

  return {
    CartForm,
    Image: ({alt}: {alt?: string}) => <img alt={alt ?? ''} />,
  };
});

vi.mock('~/components/layout/Aside', () => ({
  useAside: () => ({close: vi.fn()}),
}));

vi.mock('~/lib/variants', () => ({
  useVariantUrl: () => '/products/ring?Size=M',
}));

import {CartLineItem} from '~/components/cart/CartLineItem';
import {DEFAULT_APP_LOCALE, LocaleContext} from '~/lib/i18n';

function makeLine(overrides: Partial<CartLine> = {}) {
  return {
    id: 'line-1',
    quantity: 2,
    isOptimistic: false,
    cost: {totalAmount: {amount: '80.00', currencyCode: 'EUR'}},
    merchandise: {
      title: 'M',
      image: null,
      product: {title: 'Ring', handle: 'ring'},
      selectedOptions: [{name: 'Size', value: 'M'}],
    },
    ...overrides,
  } as unknown as CartLine;
}

function renderLine(line = makeLine()) {
  // English (US) set explicitly: the line price is formatted for the locale.
  return render(
    <LocaleContext.Provider value={DEFAULT_APP_LOCALE}>
      <ul>
        <CartLineItem childrenMap={{}} layout="page" line={line} />
      </ul>
    </LocaleContext.Provider>,
  );
}

describe('CartLineItem', () => {
  it('shows the product title, option, quantity and line price', () => {
    renderLine();

    expect(screen.getByRole('link', {name: 'Ring'})).toHaveAttribute(
      'href',
      '/products/ring?Size=M',
    );
    expect(screen.getByText('Size: M')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // Line total for 2 × €40.00, in EUR as returned by Shopify.
    expect(screen.getByText('€80.00')).toBeInTheDocument();
  });

  it('can decrease, increase and remove the line', () => {
    renderLine();

    expect(screen.getByRole('button', {name: 'Decrease quantity'})).toBeEnabled();
    expect(screen.getByRole('button', {name: 'Increase quantity'})).toBeEnabled();
    expect(screen.getByRole('button', {name: 'Remove'})).toBeEnabled();
  });

  it('cannot decrease below a quantity of one', () => {
    renderLine(makeLine({quantity: 1}));

    expect(
      screen.getByRole('button', {name: 'Decrease quantity'}),
    ).toBeDisabled();
  });

  it('disables every action while the line is being updated', () => {
    renderLine(makeLine({isOptimistic: true}));

    expect(
      screen.getByRole('button', {name: 'Decrease quantity'}),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {name: 'Increase quantity'}),
    ).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Remove'})).toBeDisabled();
  });

  it('hides the default "Title" option', () => {
    renderLine(
      makeLine({
        merchandise: {
          ...makeLine().merchandise,
          selectedOptions: [{name: 'Title', value: 'Default Title'}],
        },
      } as Partial<CartLine>),
    );

    expect(screen.queryByText(/Default Title/)).not.toBeInTheDocument();
  });
});
