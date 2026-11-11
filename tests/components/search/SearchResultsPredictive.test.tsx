import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
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
  useFetcher: () => ({state: 'idle'}),
}));

vi.mock('@shopify/hydrogen', () => ({
  Image: ({alt}: {alt?: string}) => <img alt={alt ?? ''} />,
}));

vi.mock('~/components/layout/Aside', () => ({
  useAside: () => ({close: vi.fn()}),
}));

import {SearchResultsPredictive} from '~/components/search/SearchResultsPredictive';

type Items = PredictiveSearchReturn['result']['items'];

const term = {current: 'ring'};

const products = [
  {
    __typename: 'Product',
    id: 'gid://shopify/Product/1',
    title: 'Gold Ring',
    handle: 'gold-ring',
    trackingParameters: 'tracking=1',
    selectedOrFirstAvailableVariant: {
      id: 'variant-1',
      image: {url: 'https://example.com/ring.jpg', altText: 'Gold Ring'},
      price: {amount: '40.00', currencyCode: 'EUR'},
    },
  },
  {
    __typename: 'Product',
    id: 'gid://shopify/Product/2',
    title: 'Silver Ring',
    handle: 'silver-ring',
    trackingParameters: null,
    selectedOrFirstAvailableVariant: {
      id: 'variant-2',
      image: null,
      price: {amount: '30.00', currencyCode: 'EUR'},
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

describe('SearchResultsPredictive.Products', () => {
  it('shows products as cards in a grid under "Pieces"', () => {
    render(
      <SearchResultsPredictive.Products
        closeSearch={vi.fn()}
        products={products}
        term={term}
      />,
    );

    const section = screen.getByRole('region', {name: 'Pieces'});
    const grid = within(section).getByRole('list');

    expect(grid).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-4');
    expect(within(grid).getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows the image, title and price of each product', () => {
    render(
      <SearchResultsPredictive.Products
        closeSearch={vi.fn()}
        products={products}
        term={term}
      />,
    );

    const card = screen.getByRole('link', {name: /Gold Ring/});

    expect(within(card).getByRole('img', {name: 'Gold Ring'})).toBeInTheDocument();
    expect(card).toHaveTextContent('40.00');
    expect(card.getAttribute('href')).toMatch(/^\/products\/gold-ring\?/);
  });

  it('closes the search panel when a product is clicked', async () => {
    const closeSearch = vi.fn();

    render(
      <SearchResultsPredictive.Products
        closeSearch={closeSearch}
        products={products}
        term={term}
      />,
    );

    await userEvent.click(screen.getByRole('link', {name: /Silver Ring/}));

    expect(closeSearch).toHaveBeenCalledTimes(1);
  });

  it('renders nothing without products', () => {
    const {container} = render(
      <SearchResultsPredictive.Products
        closeSearch={vi.fn()}
        products={[]}
        term={term}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('SearchResultsPredictive.Collections', () => {
  it('shows collections as a list of links that close the panel', async () => {
    const closeSearch = vi.fn();

    render(
      <SearchResultsPredictive.Collections
        closeSearch={closeSearch}
        collections={collections}
        term={term}
      />,
    );

    const section = screen.getByRole('region', {name: 'Collections'});
    const link = within(section).getByRole('link', {name: 'Rings'});

    expect(link.getAttribute('href')).toMatch(/^\/collections\/rings/);

    await userEvent.click(link);

    expect(closeSearch).toHaveBeenCalledTimes(1);
  });
});
