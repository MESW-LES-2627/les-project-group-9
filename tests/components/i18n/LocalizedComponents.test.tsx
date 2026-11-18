import type {ReactNode} from 'react';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {CatalogProduct} from '~/lib/jeweliette-catalog';

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
    ({children}: {children: (fetcher: {state: string}) => ReactNode}) => (
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
  useAllergenMatches: () => ({matches: [], loading: false}),
}));

import {FittingRoomView} from '~/components/fitting-room/FittingRoomView';
import {ProductItem} from '~/components/product/ProductItem';
import {LocaleContext, toAppLocale, type LocaleCode} from '~/lib/i18n';
import type {FittingRoomPiece} from '~/lib/profile/fitting-room';

const LANGUAGE = {en: 'EN', pt: 'PT_PT', fr: 'FR'} as const;
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

/** Shopify content stays as returned (English here, as when PT is not published). */
const product: CatalogProduct = {
  id: 'gid://shopify/Product/1',
  title: 'Aura bracelet',
  handle: 'aura-bracelet',
  featuredImage: {
    url: 'https://example.com/aura.jpg',
    altText: 'Aura bracelet',
  },
  images: {nodes: []},
  options: [],
  priceRange: {minVariantPrice: {amount: '49.00', currencyCode: 'EUR'}},
  variants: {
    nodes: [{id: 'gid://shopify/ProductVariant/1', availableForSale: true}],
  },
  selectedOrFirstAvailableVariant: {
    id: 'gid://shopify/ProductVariant/1',
    availableForSale: true,
  },
};

describe('ProductItem in each language', () => {
  it.each([
    ['en', 'Add to bag', 'View Aura bracelet', '€49'],
    ['pt', 'Adicionar ao saco', 'Ver Aura bracelet', `49${NBSP}€`],
    ['fr', 'Ajouter au panier', 'Voir Aura bracelet', `49${NBSP}€`],
  ] as const)(
    // Cards show whole amounts without decimals (withoutTrailingZeros).
    '%s: translated labels and price format, untranslated catalog title',
    (code, addToBag, viewLabel, price) => {
      inLocale(code, <ProductItem product={product} />);

      expect(screen.getByRole('button', {name: addToBag})).toBeInTheDocument();
      expect(screen.getByRole('link', {name: viewLabel})).toBeInTheDocument();
      // Exact match: keep the no-break space that pt-PT and fr-FR use before €.
      expect(
        screen.getByText(price, {normalizer: (text) => text}),
      ).toBeInTheDocument();
      expect(screen.getByText('Aura bracelet')).toBeInTheDocument();
    },
  );

  it.each([
    ['en', 'Sold out'],
    ['pt', 'Esgotado'],
    ['fr', 'Épuisé'],
  ] as const)('%s: sold-out state', (code, soldOut) => {
    inLocale(
      code,
      <ProductItem
        product={{
          ...product,
          selectedOrFirstAvailableVariant: {
            id: 'gid://shopify/ProductVariant/1',
            availableForSale: false,
          },
          variants: {
            nodes: [
              {id: 'gid://shopify/ProductVariant/1', availableForSale: false},
            ],
          },
        }}
      />,
    );

    expect(screen.getByRole('link', {name: soldOut})).toBeInTheDocument();
  });
});

describe('FittingRoomView in each language', () => {
  function piece(variantId: string, title: string): FittingRoomPiece {
    return {
      variantId,
      product: {...product, id: `gid://shopify/Product/${variantId.split('/').at(-1)}`},
      image: product.featuredImage ?? null,
      variantTitle: 'Default Title',
      price: {amount: '49.00', currencyCode: 'EUR'},
      available: true,
      tryOn: null,
      tryOnLink: `https://shop.example/products/${title}?tryOn=1`,
    };
  }

  const pieces: FittingRoomPiece[] = [
    piece('gid://shopify/ProductVariant/1', 'aura-bracelet'),
    piece('gid://shopify/ProductVariant/2', 'second'),
  ];

  function renderView(code: LocaleCode, selectedIds: string[]) {
    return inLocale(
      code,
      <FittingRoomView
        isMobile={false}
        movingId={null}
        onClear={vi.fn()}
        onMoveToCart={vi.fn()}
        onRemove={vi.fn()}
        onSelectAll={vi.fn()}
        onToggle={vi.fn()}
        pieces={pieces}
        selectedIds={selectedIds}
      />,
    );
  }

  it.each([
    ['en', '2 pieces', '1 piece ready to try', 'Virtual try-on'],
    ['pt', '2 peças', '1 peça pronta a experimentar', 'Prova virtual'],
    ['fr', '2 pièces', '1 pièce prête à essayer', 'Essayage virtuel'],
  ] as const)(
    '%s: plural counts and the try-on placeholder',
    (code, count, ready, tryOn) => {
      renderView(code, [pieces[0].variantId]);

      expect(screen.getByText(count)).toBeInTheDocument();
      expect(screen.getByText(ready)).toBeInTheDocument();
      expect(
        screen.getByRole('complementary', {name: tryOn}),
      ).toBeInTheDocument();
    },
  );
});
