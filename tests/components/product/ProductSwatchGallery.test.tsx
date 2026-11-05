import {fireEvent, render, screen} from '@testing-library/react';
import {useState} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {MappedProductOptions} from '@shopify/hydrogen';
import type {ProductFragment} from 'storefrontapi.generated';
import {ProductForm} from '~/components/product/ProductForm';
import {ProductGallery} from '~/components/product/ProductGallery';

const navigate = vi.fn();
let applyNavigation: (to: string) => void = () => {};

vi.mock('react-router', () => ({
  useNavigate: () => (to: string, options?: unknown) => {
    navigate(to, options);
    applyNavigation(to);
  },
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  >) => <a {...props}>{children}</a>,
}));

vi.mock('~/components/layout/Aside', () => ({
  useAside: () => ({open: vi.fn()}),
}));

vi.mock('~/lib/profile/useAllergenMatches', () => ({
  useAllergenMatches: () => ({matches: [], loading: false}),
}));

vi.mock('@shopify/hydrogen', () => {
  const CartForm = Object.assign(
    ({children}: {children: (fetcher: {state: string}) => React.ReactNode}) =>
      children({state: 'idle'}),
    {ACTIONS: {LinesAdd: 'LinesAdd'}},
  );
  return {
    CartForm,
    Image: ({data, alt}: {data: {url: string}; alt: string}) => (
      <img src={data.url} alt={alt} />
    ),
  };
});

const variants = [
  {
    name: 'Gold',
    color: '#d4af37',
    image: {id: 'image-1', url: '/image-1.jpg', altText: 'Gold ring'},
  },
  {
    name: 'Silver',
    color: '#c0c0c0',
    image: {id: 'image-2', url: '/image-2.jpg', altText: 'Silver ring'},
  },
  {
    name: 'Rose',
    color: '#b76e79',
    image: {id: 'image-3', url: '/image-3.jpg', altText: 'Rose ring'},
  },
];

function buildProductOptions(selectedColor: string): MappedProductOptions[] {
  return [
    {
      name: 'Color',
      optionValues: variants.map((variant) => ({
        name: variant.name,
        handle: 'ring',
        variantUriQuery: `Color=${variant.name}`,
        selected: variant.name === selectedColor,
        available: true,
        exists: true,
        isDifferentProduct: false,
        swatch: {color: variant.color},
      })),
    },
  ] as MappedProductOptions[];
}

/**
 * Mirrors what app/routes/products.$handle.tsx does: the URL query string
 * decides the selected variant, which is then handed to both the form and
 * the gallery.
 */
function ProductPage() {
  const [color, setColor] = useState('Gold');

  applyNavigation = (to: string) => {
    const next = new URLSearchParams(to.replace(/^\?/, '')).get('Color');
    if (next) setColor(next);
  };

  const variant = variants.find((item) => item.name === color)!;

  return (
    <div>
      <ProductGallery
        images={variants.map((item) => item.image)}
        variantImage={variant.image}
        title="Ring"
      />
      <ProductForm
        productOptions={buildProductOptions(color)}
        selectedVariant={
          {
            id: `variant-${variant.name}`,
            availableForSale: true,
          } as ProductFragment['selectedOrFirstAvailableVariant']
        }
      />
    </div>
  );
}

describe('color swatches on a product page', () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it('sets the variant and shows its image when a swatch is clicked', () => {
    render(<ProductPage />);

    expect(screen.getByRole('img', {name: 'Gold ring'})).toHaveAttribute(
      'src',
      '/image-1.jpg',
    );

    fireEvent.click(screen.getByRole('button', {name: 'Silver'}));

    expect(navigate).toHaveBeenCalledWith('?Color=Silver', {
      replace: true,
      preventScrollReset: true,
    });
    expect(screen.getByRole('button', {name: 'Silver'})).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('img', {name: 'Silver ring'})).toHaveAttribute(
      'src',
      '/image-2.jpg',
    );
  });

  it('jumps to the new variant image even after the shopper browsed the gallery', () => {
    render(<ProductPage />);

    fireEvent.click(screen.getByRole('button', {name: 'Show image 2 of 3'}));
    expect(screen.getByRole('img', {name: 'Silver ring'})).toHaveAttribute(
      'src',
      '/image-2.jpg',
    );

    fireEvent.click(screen.getByRole('button', {name: 'Rose'}));

    expect(screen.getByRole('img', {name: 'Rose ring'})).toHaveAttribute(
      'src',
      '/image-3.jpg',
    );
  });
});
