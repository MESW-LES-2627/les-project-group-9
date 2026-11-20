import {render, screen, within} from '@testing-library/react';
import {createRoutesStub} from 'react-router';
import {describe, expect, it} from 'vitest';
import {
  ProductReviews,
  ProductReviewsLoading,
} from '~/components/product/ProductReviews';
import {LocaleContext, toAppLocale, type LocaleCode} from '~/lib/i18n';
import type {ProductReviewsView} from '~/lib/ratings/product-reviews.server';

const LANGUAGE = {en: 'EN', pt: 'PT_PT', fr: 'FR'} as const;

const ready = (
  average: number | null,
  count: number,
  comments: Array<{rating: number; text: string; date: string}> = [],
): ProductReviewsView => ({status: 'ready', summary: {average, count}, comments});

function renderReviews(view: ProductReviewsView, code: LocaleCode = 'en') {
  const locale = toAppLocale({language: LANGUAGE[code], country: 'US'});
  const Stub = createRoutesStub([
    {
      path: '/products/:handle',
      Component: () => (
        <LocaleContext.Provider value={locale}>
          <ProductReviews view={view} />
        </LocaleContext.Provider>
      ),
    },
  ]);
  render(<Stub initialEntries={['/products/piece']} />);
}

describe('ProductReviews', () => {
  it('shows the average, the number of reviews and the approved comments', async () => {
    renderReviews(
      ready(4.3, 12, [
        {rating: 5, text: 'Shines all day.\nTrue to size.', date: '2026-11-10T09:00:00Z'},
        {rating: 3, text: 'Smaller than expected.', date: '2026-11-02T09:00:00Z'},
      ]),
    );

    const section = await screen.findByRole('region', {name: 'Reviews'});
    expect(within(section).getByText('4.3 out of 5')).toBeInTheDocument();
    expect(within(section).getByText('12 reviews')).toBeInTheDocument();

    const list = within(section).getByRole('list', {name: 'What shoppers say'});
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Rated 5 out of 5')).toBeInTheDocument();
    expect(within(items[0]).getByText(/Shines all day\./)).toBeInTheDocument();
    expect(within(items[0]).getByText(/Verified buyer/)).toBeInTheDocument();
    expect(within(items[0]).getByText('November 10, 2026')).toHaveAttribute(
      'datetime',
      '2026-11-10T09:00:00Z',
    );
    expect(within(items[1]).getByText('Rated 3 out of 5')).toBeInTheDocument();
  });

  it('uses the singular for one review', async () => {
    renderReviews(ready(5, 1));
    expect(await screen.findByText('1 review')).toBeInTheDocument();
  });

  it('shows ratings without comments when none is approved yet', async () => {
    renderReviews(ready(4, 2));
    expect(await screen.findByText('4.0 out of 5')).toBeInTheDocument();
    expect(screen.getByText('No written comments yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('invites the first review when there are none', async () => {
    renderReviews(ready(null, 0));
    expect(
      await screen.findByText(
        'No reviews yet. Bought this piece? Rate it from your orders once it has been delivered.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Go to my orders'})).toHaveAttribute(
      'href',
      '/account/orders',
    );
    expect(screen.queryByText(/out of 5/)).not.toBeInTheDocument();
  });

  it('renders comment text as plain text, never as HTML', async () => {
    renderReviews(ready(5, 1, [{rating: 5, text: '<img src=x onerror=alert(1)>', date: '2026-11-10T09:00:00Z'}]));
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it.each([
    [{status: 'unavailable'} as const, 'Reviews are not available at the moment.'],
    [{status: 'error'} as const, "We couldn't load the reviews right now. Please try again later."],
  ])('explains the %j state', async (view, message) => {
    renderReviews(view);
    expect(await screen.findByRole('status')).toHaveTextContent(message);
  });

  it('announces that reviews are loading', () => {
    render(<ProductReviewsLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading reviews…');
  });
});

describe('ProductReviews in other languages', () => {
  const comment = {rating: 4, text: 'Texto', date: '2026-11-10T09:00:00Z'};

  it.each([
    ['pt', 'Avaliações', '4,3 de 5', '3 avaliações', 'O que dizem os clientes', 'Avaliado com 4 de 5', /Comprador verificado/, '10 de novembro de 2026'],
    ['fr', 'Avis', '4,3 sur 5', '3 avis', 'Ce qu’en pensent nos clients', 'Noté 4 sur 5', /Acheteur vérifié/, '10 novembre 2026'],
  ] as const)('renders the reviews in %s', async (code, heading, average, count, listName, rated, buyer, date) => {
    renderReviews(ready(4.3, 3, [comment]), code);
    const section = await screen.findByRole('region', {name: heading});
    expect(within(section).getByText(average)).toBeInTheDocument();
    expect(within(section).getByText(count)).toBeInTheDocument();
    const list = within(section).getByRole('list', {name: listName});
    expect(within(list).getByText(rated)).toBeInTheDocument();
    expect(within(list).getByText(buyer)).toBeInTheDocument();
    expect(within(list).getByText(date)).toBeInTheDocument();
  });

  it.each([
    ['pt', 'Ver as minhas encomendas'],
    ['fr', 'Voir mes commandes'],
  ] as const)('invites the first review in %s', async (code, link) => {
    renderReviews(ready(null, 0), code);
    expect(await screen.findByRole('link', {name: link})).toBeInTheDocument();
  });
});
