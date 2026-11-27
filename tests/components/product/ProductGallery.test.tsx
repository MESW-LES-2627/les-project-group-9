import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ProductGallery} from '~/components/product/ProductGallery';

vi.mock('@shopify/hydrogen', () => ({
  Image: ({data, alt}: {data: {url: string}; alt: string}) => (
    <img src={data.url} alt={alt} />
  ),
  CartForm: () => null,
}));

vi.mock('@google/model-viewer', () => ({}));

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

  it('shows no 3D entry when the product has no model', () => {
    render(<ProductGallery images={images} variantImage={images[0]} title="Ring" />);

    expect(
      screen.queryByRole('button', {name: 'Show the 3D view'}),
    ).not.toBeInTheDocument();
  });
});

const model = {
  url: 'https://cdn.example/signet-ring.glb',
  altText: 'Round Signet Ring 3D model',
  previewImageUrl: 'https://cdn.example/poster.jpg',
};

async function findViewer(container: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const viewer = container.querySelector('model-viewer');
    expect(viewer).not.toBeNull();
    return viewer as HTMLElement;
  });
}

describe('ProductGallery with a 3D model', () => {
  it('opens on the photos, with the 3D entry after the image thumbnails', () => {
    const {container} = render(
      <ProductGallery
        images={images}
        variantImage={images[0]}
        title="Ring"
        model={model}
      />,
    );

    // The photo is the main media; the viewer is opt-in (owner decision,
    // 2026-11-26, overriding US-011's AC1).
    expect(screen.getByRole('img', {name: 'Gold ring'})).toHaveAttribute(
      'src',
      '/image-1.jpg',
    );
    expect(container.querySelector('model-viewer')).toBeNull();

    // The 3D entry is the LAST thumbnail.
    const entries = container.querySelectorAll('ul li');
    expect(entries).toHaveLength(images.length + 1);
    expect(
      within(entries[entries.length - 1] as HTMLElement).getByRole('button', {
        name: 'Show the 3D view',
      }),
    ).toBeInTheDocument();
  });

  it('shows the viewer after the shopper picks the 3D entry', async () => {
    const {container} = render(
      <ProductGallery
        images={images}
        variantImage={images[0]}
        title="Ring"
        model={model}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Show the 3D view'}));

    const viewer = await findViewer(container);

    expect(viewer).toHaveAttribute('src', 'https://cdn.example/signet-ring.glb');
    expect(viewer).toHaveAttribute('poster', 'https://cdn.example/poster.jpg');
    expect(viewer).toHaveAttribute('camera-controls');

    // Sizing regression guard: React 18 writes className on a custom element
    // as a literal attribute CSS ignores, so the size must come as a style.
    expect((viewer as HTMLElement).style.width).toBe('100%');
    expect((viewer as HTMLElement).style.height).toBe('100%');
  });

  it('returns to the viewer after browsing the images', async () => {
    const {container} = render(
      <ProductGallery
        images={images}
        variantImage={images[0]}
        title="Ring"
        model={model}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Show the 3D view'}));
    await findViewer(container);

    fireEvent.click(screen.getByRole('button', {name: 'Show image 2 of 3'}));
    expect(screen.getByRole('img', {name: 'Silver ring'})).toHaveAttribute(
      'src',
      '/image-2.jpg',
    );
    expect(container.querySelector('model-viewer')).toBeNull();

    fireEvent.click(screen.getByRole('button', {name: 'Show the 3D view'}));
    await findViewer(container);
  });

  it('falls back to the images when the model fails to load', async () => {
    const {container} = render(
      <ProductGallery
        images={images}
        variantImage={images[0]}
        title="Ring"
        model={model}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Show the 3D view'}));

    const viewer = await findViewer(container);

    fireEvent(viewer, new Event('error'));

    // The variant image becomes the main media and the 3D entry disappears.
    expect(screen.getByRole('img', {name: 'Gold ring'})).toHaveAttribute(
      'src',
      '/image-1.jpg',
    );
    expect(
      screen.queryByRole('button', {name: 'Show the 3D view'}),
    ).not.toBeInTheDocument();
    expect(container.querySelector('model-viewer')).toBeNull();
  });

  it('uses the product title as alt text when the model has none', async () => {
    const {container} = render(
      <ProductGallery
        images={images}
        variantImage={images[0]}
        title="Round Signet Ring"
        model={{...model, altText: ''}}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Show the 3D view'}));

    const viewer = await findViewer(container);

    expect(viewer).toHaveAttribute('alt', 'Round Signet Ring');
  });

  it('follows the variant image after a swatch change while in 3D', async () => {
    const {rerender, container} = render(
      <ProductGallery
        images={images}
        variantImage={images[0]}
        title="Ring"
        model={model}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Show the 3D view'}));
    await findViewer(container);

    rerender(
      <ProductGallery
        images={images}
        variantImage={images[1]}
        title="Ring"
        model={model}
      />,
    );

    // The swatch change jumps back to the variant image, as before the model.
    expect(screen.getByRole('img', {name: 'Silver ring'})).toHaveAttribute(
      'src',
      '/image-2.jpg',
    );
    expect(container.querySelector('model-viewer')).toBeNull();
  });
});
