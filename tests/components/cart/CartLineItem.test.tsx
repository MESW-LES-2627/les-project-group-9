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
import {DEFAULT_APP_LOCALE, LocaleContext, toAppLocale} from '~/lib/i18n';

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

  it('shows the gem color and engraving under the product name', () => {
    renderLine(
      makeLine({
        attributes: [
          {key: 'Gem color', value: 'Ruby'},
          {key: 'Engraving', value: 'Ana & Rui'},
        ],
      } as Partial<CartLine>),
    );

    expect(screen.getByText('Gem color')).toBeInTheDocument();
    expect(screen.getByText('Ruby')).toBeInTheDocument();
    expect(screen.getByText('Engraving')).toBeInTheDocument();
    // Shown exactly as typed (not upper-cased, not parsed as HTML).
    expect(screen.getByText('Ana & Rui')).toBeInTheDocument();
  });

  it('labels the customization in the active language', () => {
    render(
      <LocaleContext.Provider
        value={toAppLocale({language: 'PT_PT', country: 'PT'})}
      >
        <ul>
          <CartLineItem
            childrenMap={{}}
            layout="page"
            line={makeLine({
              attributes: [
                {key: 'Gem color', value: 'Ruby'},
                {key: 'Engraving', value: 'Ana'},
              ],
            } as Partial<CartLine>)}
          />
        </ul>
      </LocaleContext.Provider>,
    );

    expect(screen.getByText('Cor da pedra')).toBeInTheDocument();
    expect(screen.getByText('Gravação')).toBeInTheDocument();
  });

  it('shows no customization for lines without it', () => {
    renderLine(
      makeLine({
        attributes: [{key: 'gift_note', value: 'Hi'}],
      } as Partial<CartLine>),
    );

    expect(screen.queryByText('Engraving')).not.toBeInTheDocument();
    expect(screen.queryByText('Hi')).not.toBeInTheDocument();
  });
});
