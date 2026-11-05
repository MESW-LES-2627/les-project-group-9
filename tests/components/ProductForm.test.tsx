import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {MappedProductOptions} from '@shopify/hydrogen';
import type {ProductFragment} from 'storefrontapi.generated';
import {ProductForm} from '~/components/ProductForm';

const navigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => navigate,
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  >) => <a {...props}>{children}</a>,
}));

vi.mock('~/components/Aside', () => ({
  useAside: () => ({open: vi.fn()}),
}));

const profile = vi.hoisted(() => ({useProfile: vi.fn()}));

vi.mock('~/lib/profile/ProfileProvider', () => ({
  useProfile: profile.useProfile,
}));

vi.mock('@shopify/hydrogen', () => {
  const CartForm = Object.assign(
    ({children}: {children: (fetcher: {state: string}) => React.ReactNode}) =>
      children({state: 'idle'}),
    {ACTIONS: {LinesAdd: 'LinesAdd'}},
  );
  return {CartForm};
});

const productOptions = [
  {
    name: 'Color',
    optionValues: [
      {
        name: 'Gold',
        handle: 'ring',
        variantUriQuery: 'Color=Gold',
        selected: true,
        available: true,
        exists: true,
        isDifferentProduct: false,
        swatch: {color: '#d4af37'},
      },
      {
        name: 'Silver',
        handle: 'ring',
        variantUriQuery: 'Color=Silver',
        selected: false,
        available: true,
        exists: true,
        isDifferentProduct: false,
        swatch: {color: '#c0c0c0'},
      },
    ],
  },
] as MappedProductOptions[];

const selectedVariant = {
  id: 'variant-gold',
  availableForSale: true,
} as ProductFragment['selectedOrFirstAvailableVariant'];

describe('ProductForm', () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it('navigates to the selected color variant when a swatch is clicked', () => {
    render(
      <ProductForm
        productOptions={productOptions}
        selectedVariant={selectedVariant}
      />,
    );

    screen.getByRole('button', {name: 'Silver'}).click();

    expect(navigate).toHaveBeenCalledWith('?Color=Silver', {
      replace: true,
      preventScrollReset: true,
    });
  });

  it('does not navigate when the already selected swatch is clicked', () => {
    render(
      <ProductForm
        productOptions={productOptions}
        selectedVariant={selectedVariant}
      />,
    );

    screen.getByRole('button', {name: 'Gold'}).click();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('marks the selected color swatch as pressed', () => {
    render(
      <ProductForm
        productOptions={productOptions}
        selectedVariant={selectedVariant}
      />,
    );

    expect(screen.getByRole('button', {name: 'Gold'})).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', {name: 'Silver'})).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('paints each swatch with the color coming from the option', () => {
    render(
      <ProductForm
        productOptions={productOptions}
        selectedVariant={selectedVariant}
      />,
    );

    expect(screen.getByRole('button', {name: 'Gold'})).toHaveStyle({
      backgroundColor: '#d4af37',
    });
    expect(screen.getByRole('button', {name: 'Silver'})).toHaveStyle({
      backgroundColor: '#c0c0c0',
    });
  });

  describe('ring size helper', () => {
    const sizeOptions = [
      {
        name: 'Size',
        optionValues: [
          {
            name: '6',
            handle: 'ring',
            variantUriQuery: 'Size=6',
            selected: true,
            available: true,
            exists: true,
            isDifferentProduct: false,
          },
          {
            name: '7',
            handle: 'ring',
            variantUriQuery: 'Size=7',
            selected: false,
            available: true,
            exists: true,
            isDifferentProduct: false,
          },
        ],
      },
    ] as MappedProductOptions[];

    beforeEach(() => {
      profile.useProfile.mockReturnValue({
        status: 'ready',
        isLoggedIn: true,
        preferences: null,
      });
    });

    it('shows the helper on a ring product with a Size option', () => {
      render(
        <ProductForm
          productOptions={sizeOptions}
          selectedVariant={selectedVariant}
          isRing
        />,
      );

      expect(screen.getByRole('button', {name: '? Help'})).toBeInTheDocument();
    });

    it('hides the helper on products that are not rings', () => {
      render(
        <ProductForm
          productOptions={sizeOptions}
          selectedVariant={selectedVariant}
        />,
      );

      expect(
        screen.queryByRole('button', {name: '? Help'}),
      ).not.toBeInTheDocument();
    });

    it('hides the helper on a ring product without a Size option', () => {
      render(
        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
          isRing
        />,
      );

      expect(
        screen.queryByRole('button', {name: '? Help'}),
      ).not.toBeInTheDocument();
    });
  });

  it('uses the swatch image as the background when the option provides one', () => {
    const optionsWithImage = [
      {
        name: 'Color',
        optionValues: [
          {
            name: 'Gold',
            handle: 'ring',
            variantUriQuery: 'Color=Gold',
            selected: true,
            available: true,
            exists: true,
            isDifferentProduct: false,
            swatch: {color: '#d4af37'},
          },
          {
            name: 'Silver',
            handle: 'ring',
            variantUriQuery: 'Color=Silver',
            selected: false,
            available: true,
            exists: true,
            isDifferentProduct: false,
            swatch: {
              color: '#c0c0c0',
              image: {previewImage: {url: '/silver.jpg'}},
            },
          },
        ],
      },
    ] as MappedProductOptions[];

    render(
      <ProductForm
        productOptions={optionsWithImage}
        selectedVariant={selectedVariant}
      />,
    );

    expect(screen.getByRole('button', {name: 'Silver'})).toHaveStyle({
      backgroundImage: 'url(/silver.jpg)',
    });
  });
});
