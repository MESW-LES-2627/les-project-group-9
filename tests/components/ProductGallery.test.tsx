import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ProductGallery} from '~/components/ProductGallery';

vi.mock('@shopify/hydrogen', () => ({
  Image: ({data, alt}: {data: {url: string}; alt: string}) => (
    <img src={data.url} alt={alt} />
  ),
  CartForm: () => null,
}));

const images = [
  {id: 'image-1', url: '/image-1.jpg', altText: 'Gold ring'},
  {id: 'image-2', url: '/image-2.jpg', altText: 'Silver ring'},
  {id: 'image-3', url: '/image-3.jpg', altText: 'Rose ring'},
];

describe('ProductGallery', () => {
  it('shows the selected variant image', () => {
    render(
      <ProductGallery images={images} variantImage={images[1]} title="Ring" />,
    );

    expect(screen.getByRole('img', {name: 'Silver ring'})).toHaveAttribute(
      'src',
      '/image-2.jpg',
    );
  });

  it('jumps back to the variant image after the shopper browses the gallery', () => {
    const {rerender} = render(
      <ProductGallery images={images} variantImage={images[0]} title="Ring" />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Show image 2 of 3'}));
    expect(screen.getByRole('img', {name: 'Silver ring'})).toHaveAttribute(
      'src',
      '/image-2.jpg',
    );

    rerender(
      <ProductGallery images={images} variantImage={images[2]} title="Ring" />,
    );

    expect(screen.getByRole('img', {name: 'Rose ring'})).toHaveAttribute(
      'src',
      '/image-3.jpg',
    );
  });

  it('falls back to the first image when the variant has no image', () => {
    render(<ProductGallery images={images} variantImage={null} title="Ring" />);

    expect(screen.getByRole('img', {name: 'Gold ring'})).toHaveAttribute(
      'src',
      '/image-1.jpg',
    );
  });

  it('falls back to the first image when the variant image is not in the gallery', () => {
    render(
      <ProductGallery
        images={images}
        variantImage={{
          id: 'image-99',
          url: '/image-99.jpg',
          altText: 'Variant only image',
        }}
        title="Ring"
      />,
    );

    expect(screen.getByRole('img', {name: 'Gold ring'})).toHaveAttribute(
      'src',
      '/image-1.jpg',
    );
  });

  it('hides the thumbnails when the product has a single image', () => {
    render(
      <ProductGallery
        images={[images[0]]}
        variantImage={images[0]}
        title="Ring"
      />,
    );

    expect(
      screen.queryByRole('button', {name: /Show image/}),
    ).not.toBeInTheDocument();
  });
});
