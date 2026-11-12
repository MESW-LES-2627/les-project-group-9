import type {ReactNode} from 'react';
import {render, screen, within} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {OptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {PredictiveSearchReturn} from '~/lib/search';

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
  useFetcher: () => ({state: 'idle', data: undefined}),
}));

vi.mock('@shopify/hydrogen', () => {
  const CartForm = Object.assign(
    ({children}: {children: ReactNode}) => (
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
    Image: ({alt}: {alt?: string}) => <img alt={alt ?? ''} />,
    useOptimisticCart: <T,>(cart: T) => cart,
  };
});

vi.mock('~/components/layout/Aside', () => ({
  useAside: () => ({close: vi.fn()}),
}));

import {CartMain} from '~/components/cart/CartMain';
import {CartSummary} from '~/components/cart/CartSummary';
import {SearchResultsPredictive} from '~/components/search/SearchResultsPredictive';
import {LocaleContext, toAppLocale, type LocaleCode} from '~/lib/i18n';

const LANGUAGE = {en: 'EN', pt: 'PT_PT', fr: 'FR'} as const;

/** No-break space (U+00A0): pt-PT and fr-FR put it before €, French inside « ». */
const NBSP = String.fromCodePoint(0xa0);

function inLocale(code: LocaleCode, ui: ReactNode) {
  return render(
    <LocaleContext.Provider
      value={toAppLocale({language: LANGUAGE[code], country: 'US'})}
    >
      {ui}
    </LocaleContext.Provider>,
  );
}

/** Exact text match that keeps no-break spaces. */
const exact = {normalizer: (text: string) => text};

describe('CartMain in each language', () => {
  it.each([
    ['en', 'Cart page', 'Your bag is empty', 'Continue shopping'],
    [
      'pt',
      'Página do saco de compras',
      'O seu saco de compras está vazio',
      'Continuar a comprar',
    ],
    ['fr', 'Page du panier', 'Votre panier est vide', 'Continuer mes achats'],
  ] as const)(
    '%s: empty bag region, heading and link',
    (code, region, heading, link) => {
      inLocale(code, <CartMain cart={null} layout="page" />);

      const cart = screen.getByRole('region', {name: region});
      expect(within(cart).getByRole('heading', {name: heading})).toBeVisible();
      expect(within(cart).getByRole('link', {name: link})).toHaveAttribute(
        'href',
        '/collections',
      );
    },
  );
});

describe('CartSummary in each language', () => {
  const cart = {
    checkoutUrl: 'https://checkout.example.com/c/1',
    cost: {subtotalAmount: {amount: '120.00', currencyCode: 'EUR'}},
    discountCodes: [{code: 'SPRING10', applicable: true}],
    appliedGiftCards: [],
  } as unknown as OptimisticCart<CartApiQueryFragment | null>;

  it.each([
    [
      'en',
      {
        summary: 'Order summary',
        subtotal: 'Subtotal',
        amount: '€120.00',
        checkout: 'Checkout',
        discount: 'Discount code',
        applied: 'Applied codes',
        removeDiscount: 'Remove discount code',
      },
    ],
    [
      'pt',
      {
        summary: 'Resumo da encomenda',
        subtotal: 'Subtotal',
        amount: `120,00${NBSP}€`,
        checkout: 'Finalizar compra',
        discount: 'Código de desconto',
        applied: 'Códigos aplicados',
        removeDiscount: 'Remover código de desconto',
      },
    ],
    [
      'fr',
      {
        summary: 'Récapitulatif de la commande',
        subtotal: 'Sous-total',
        amount: `120,00${NBSP}€`,
        checkout: 'Paiement',
        discount: 'Code de réduction',
        applied: 'Codes appliqués',
        removeDiscount: 'Retirer le code de réduction',
      },
    ],
  ] as const)('%s: labels and subtotal format', (code, text) => {
    inLocale(code, <CartSummary cart={cart} layout="page" />);

    const summary = screen.getByRole('region', {name: text.summary});
    expect(within(summary).getByText(text.subtotal)).toBeInTheDocument();
    expect(within(summary).getByText(text.amount, exact)).toBeInTheDocument();
    expect(
      within(summary).getByRole('link', {name: new RegExp(text.checkout)}),
    ).toHaveAttribute('href', 'https://checkout.example.com/c/1');
    expect(within(summary).getByLabelText(text.discount)).toBeInTheDocument();
    expect(
      within(summary).getByRole('list', {name: text.applied}),
    ).toHaveTextContent('SPRING10');
    expect(
      within(summary).getByRole('button', {name: text.removeDiscount}),
    ).toBeInTheDocument();
  });
});

describe('SearchResultsPredictive in each language', () => {
  type Items = PredictiveSearchReturn['result']['items'];

  /** Shopify content stays as returned (English here, as when PT is not published). */
  const products = [
    {
      __typename: 'Product',
      id: 'gid://shopify/Product/1',
      title: 'Gold Ring',
      handle: 'gold-ring',
      trackingParameters: null,
      selectedOrFirstAvailableVariant: {
        id: 'variant-1',
        image: null,
        price: {amount: '40.00', currencyCode: 'EUR'},
      },
    },
  ] as unknown as Items['products'];

  const collections = [
    {
      __typename: 'Collection',
      id: 'gid://shopify/Collection/1',
      title: 'Rings',
      handle: 'rings',
      trackingParameters: null,
      image: null,
    },
  ] as unknown as Items['collections'];

  const term = {current: 'ring'};

  it.each([
    ['en', 'Pieces', 'Collections', '€40.00'],
    ['pt', 'Peças', 'Coleções', `40,00${NBSP}€`],
    ['fr', 'Pièces', 'Collections', `40,00${NBSP}€`],
  ] as const)(
    '%s: section headings and price format, untranslated catalog titles',
    (code, pieces, collectionsHeading, price) => {
      inLocale(
        code,
        <>
          <SearchResultsPredictive.Products
            closeSearch={vi.fn()}
            products={products}
            term={term}
          />
          <SearchResultsPredictive.Collections
            closeSearch={vi.fn()}
            collections={collections}
            term={term}
          />
        </>,
      );

      const piecesSection = screen.getByRole('region', {name: pieces});
      expect(within(piecesSection).getByText(price, exact)).toBeInTheDocument();
      expect(within(piecesSection).getByText('Gold Ring')).toBeInTheDocument();
      expect(
        within(screen.getByRole('region', {name: collectionsHeading})).getByRole(
          'link',
          {name: 'Rings'},
        ),
      ).toBeInTheDocument();
    },
  );

  it.each([
    ['en', 'No results found for “ring”'],
    ['pt', 'Nenhum resultado para «ring»'],
    ['fr', `Aucun résultat pour «${NBSP}ring${NBSP}»`],
  ] as const)('%s: no-results message keeps the language quotes', (code, text) => {
    inLocale(code, <SearchResultsPredictive.Empty term={term} />);

    expect(screen.getByText(text, exact)).toBeInTheDocument();
  });
});
