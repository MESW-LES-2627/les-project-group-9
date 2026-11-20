import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createRoutesStub, data, type ShouldRevalidateFunction} from 'react-router';
import {describe, expect, it} from 'vitest';
import * as orderRoute from '~/routes/account.orders.$id';
import {RATING_ENDPOINT} from '~/components/account/OrderRatings';
import type {OrderRatingsView} from '~/lib/ratings/ratings.server';

// Route-level regression test for the order page after a rating is saved:
// the real order route component (Suspense/Await) with a stub loader that
// reads ratings from an in-memory "persisted" store, and a stub
// /api/order-ratings action with the endpoint's create-only answers.

const ORDER = 'gid://shopify/Order/101';
const RING = 'gid://shopify/Product/11';
const NECKLACE = 'gid://shopify/Product/22';
const MONEY = {amount: '10.0', currencyCode: 'EUR'};

type ReadyView = Extract<OrderRatingsView, {status: 'ready'}>;

function harness(initial: Record<string, number> = {}) {
  const persisted = new Map(Object.entries(initial));
  const calls = {loader: 0};

  const view = (): ReadyView => ({
    status: 'ready',
    orderId: ORDER,
    delivered: true,
    products: [
      {productId: RING, title: 'Aurora ring', image: null, rating: persisted.get(RING) ?? null},
      {productId: NECKLACE, title: 'Luna necklace', image: null, rating: persisted.get(NECKLACE) ?? null},
    ],
  });

  const renderPage = (staleRatings?: ReadyView) => {
    const Stub = createRoutesStub([
      {
        path: '/account/orders/:id',
        Component: orderRoute.default as never,
        shouldRevalidate: (orderRoute as {shouldRevalidate?: ShouldRevalidateFunction})
          .shouldRevalidate,
        loader: () => {
          calls.loader += 1;
          return {
            order: {
              id: ORDER,
              name: '#1001',
              processedAt: '2026-11-01T10:00:00Z',
              confirmationNumber: null,
              statusPageUrl: 'https://example.com/status',
              subtotal: MONEY,
              totalTax: MONEY,
              totalPrice: MONEY,
              shippingAddress: null,
            },
            lineItems: [],
            discountValue: null,
            discountPercentage: null,
            fulfillmentStatus: 'SUCCESS',
            ratings: Promise.resolve(staleRatings && calls.loader === 1 ? staleRatings : view()),
          };
        },
      },
      {
        path: RATING_ENDPOINT,
        action: async ({request}) => {
          const {productId, rating} = (await request.json()) as {productId: string; rating: number};
          const existing = persisted.get(productId);
          if (existing !== undefined) {
            return data({error: 'already_rated', rating: existing}, {status: 409});
          }
          persisted.set(productId, rating);
          return data({productId, rating}, {status: 201});
        },
      },
    ]);
    return render(<Stub initialEntries={['/account/orders/abc']} />);
  };

  return {persisted, calls, renderPage, view};
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

describe('order page after saving a rating', () => {
  it('keeps the confirmation and other unsaved choices, and a reload reads the saved rating', async () => {
    const user = userEvent.setup();
    const page = harness();
    const {unmount} = page.renderPage();

    const necklace = await screen.findByRole('group', {name: 'Your rating for Luna necklace'});
    const ring = screen.getByRole('group', {name: 'Your rating for Aurora ring'});
    expect(page.calls.loader).toBe(1);

    // 1. Choose stars for B without submitting.
    await user.click(within(necklace).getByRole('radio', {name: '2 stars'}));
    // 2. Rate and submit A.
    await user.click(within(ring).getByRole('radio', {name: '4 stars'}));
    const ringItem = ring.closest('li') as HTMLElement;
    await user.click(within(ringItem).getByRole('button', {name: 'Submit rating'}));
    await settle();

    // The rating was persisted by the action.
    expect(page.persisted.get(RING)).toBe(4);
    // 3. A shows its value and the success confirmation.
    expect(screen.getByText('Your rating: 4 out of 5')).toBeInTheDocument();
    expect(screen.getByText('Thank you. Your rating has been saved.')).toBeInTheDocument();
    // 5. A has no editable control.
    expect(screen.queryByRole('group', {name: 'Your rating for Aurora ring'})).not.toBeInTheDocument();
    // 4. B's unsaved choice is still there.
    expect(
      within(screen.getByRole('group', {name: 'Your rating for Luna necklace'})).getByRole('radio', {
        name: '2 stars',
      }),
    ).toBeChecked();
    // The order page's own loader did not run again for the rating submission.
    expect(page.calls.loader).toBe(1);

    // 6. A deliberate reload reads the persisted rating, read-only.
    unmount();
    page.renderPage();
    expect(await screen.findByText('Your rating: 4 out of 5')).toBeInTheDocument();
    expect(screen.queryByRole('group', {name: 'Your rating for Aurora ring'})).not.toBeInTheDocument();
    expect(screen.getByRole('group', {name: 'Your rating for Luna necklace'})).toBeInTheDocument();
  });

  it('treats an already-rated answer like a save: read-only value, message, no reload', async () => {
    const user = userEvent.setup();
    // Rated elsewhere (e.g. another tab) after this page was loaded.
    const page = harness({[RING]: 5});
    const stale: ReadyView = {
      ...page.view(),
      products: page.view().products.map((product) => ({...product, rating: null})),
    };
    page.renderPage(stale);

    const ring = await screen.findByRole('group', {name: 'Your rating for Aurora ring'});
    await user.click(within(ring).getByRole('radio', {name: '1 star'}));
    await user.click(within(ring.closest('li') as HTMLElement).getByRole('button', {name: 'Submit rating'}));
    await settle();

    expect(page.persisted.get(RING)).toBe(5);
    expect(screen.getByText('Your rating: 5 out of 5')).toBeInTheDocument();
    expect(screen.getByText('You have already rated this piece.')).toBeInTheDocument();
    expect(screen.queryByRole('group', {name: 'Your rating for Aurora ring'})).not.toBeInTheDocument();
    expect(page.calls.loader).toBe(1);
  });
});

describe('order route shouldRevalidate', () => {
  const shouldRevalidate = (orderRoute as {shouldRevalidate?: ShouldRevalidateFunction}).shouldRevalidate;
  const base = {
    currentUrl: new URL('http://localhost/account/orders/abc'),
    nextUrl: new URL('http://localhost/account/orders/abc'),
    currentParams: {},
    nextParams: {},
    defaultShouldRevalidate: true,
  };

  it('skips the reload only for its own rating submissions', () => {
    expect(shouldRevalidate).toBeTypeOf('function');
    expect(
      shouldRevalidate?.({...base, formMethod: 'POST', formAction: RATING_ENDPOINT, actionStatus: 201}),
    ).toBe(false);
  });

  it('keeps the default for other actions, navigation and locale changes', () => {
    expect(shouldRevalidate?.({...base, formMethod: 'POST', formAction: '/cart'})).toBe(true);
    expect(shouldRevalidate?.({...base, formMethod: 'POST', formAction: '/locale'})).toBe(true);
    expect(shouldRevalidate?.({...base})).toBe(true);
    expect(shouldRevalidate?.({...base, defaultShouldRevalidate: false})).toBe(false);
  });
});
