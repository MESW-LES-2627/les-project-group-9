import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createRoutesStub, data} from 'react-router';
import {describe, expect, it} from 'vitest';
import {
  OrderRatings,
  OrderRatingsLoading,
  RATING_ENDPOINT,
} from '~/components/account/OrderRatings';
import {LocaleContext, toAppLocale, type LocaleCode} from '~/lib/i18n';
import type {OrderRatingsView} from '~/lib/ratings/ratings.server';
import type {StoredComment} from '~/lib/ratings/comment-store.server';

const ORDER = 'gid://shopify/Order/101';
const RING = 'gid://shopify/Product/11';
const NECKLACE = 'gid://shopify/Product/22';
const LANGUAGE = {en: 'EN', pt: 'PT_PT', fr: 'FR'} as const;

const ready = (
  products: Array<{
    productId: string;
    title: string;
    rating: number | null;
    comment?: StoredComment | null;
  }>,
  delivered = true,
): OrderRatingsView => ({
  status: 'ready',
  orderId: ORDER,
  delivered,
  products: products.map((product) => ({comment: null, ...product, image: null})),
});

type ActionReply = {status: number; body: Record<string, unknown>};

function renderRatings(
  view: OrderRatingsView,
  {
    code = 'en',
    reply = () => ({status: 201, body: {productId: RING, rating: 4}}),
  }: {code?: LocaleCode; reply?: (body: unknown) => ActionReply | Promise<ActionReply>} = {},
) {
  const requests: Array<{body: unknown; contentType: string | null}> = [];
  const locale = toAppLocale({language: LANGUAGE[code], country: 'US'});
  const Stub = createRoutesStub([
    {
      path: '/account/orders/:id',
      Component: () => (
        <LocaleContext.Provider value={locale}>
          <OrderRatings view={view} />
        </LocaleContext.Provider>
      ),
    },
    {
      path: RATING_ENDPOINT,
      action: async ({request}) => {
        const body = await request.json();
        requests.push({body, contentType: request.headers.get('Content-Type')});
        const {status, body: response} = await reply(body);
        return data(response, {status});
      },
    },
  ]);
  render(<Stub initialEntries={['/account/orders/abc']} />);
  return requests;
}

describe('OrderRatings', () => {
  it('rates a product with the keyboard and then shows it read-only', async () => {
    const user = userEvent.setup();
    const requests = renderRatings(ready([{productId: RING, title: 'Aurora ring', rating: null}]));

    const group = await screen.findByRole('group', {name: 'Your rating for Aurora ring'});
    expect(group).toHaveAccessibleDescription('A rating cannot be changed after you submit it.');
    const submit = screen.getByRole('button', {name: 'Submit rating'});
    expect(submit).toBeDisabled();

    await user.tab();
    expect(within(group).getByRole('radio', {name: '1 star'})).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(within(group).getByRole('radio', {name: '4 stars'})).toBeChecked();
    expect(submit).toBeEnabled();

    await user.tab();
    expect(submit).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Thank you. Your rating has been saved.')).toBeInTheDocument();
    expect(screen.getByText('Your rating: 4 out of 5')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Submit rating'})).not.toBeInTheDocument();
    // A just-saved rating can get a comment straight away (US-059).
    expect(screen.getByRole('button', {name: 'Add a comment'})).toBeInTheDocument();
    expect(requests).toEqual([
      {body: {orderId: ORDER, productId: RING, rating: 4}, contentType: 'application/json'},
    ]);
  });

  it('shows a saved rating without any control to change it', async () => {
    renderRatings(ready([{productId: RING, title: 'Aurora ring', rating: 2}]));
    expect(await screen.findByText('Your rating: 2 out of 5')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Submit rating'})).not.toBeInTheDocument();
    // The only control left is the comment (US-059); the stars stay final.
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Add a comment',
    ]);
  });

  it('offers one form per unrated product', async () => {
    renderRatings(
      ready([
        {productId: RING, title: 'Aurora ring', rating: 5},
        {productId: NECKLACE, title: 'Luna necklace', rating: null},
      ]),
    );
    expect(await screen.findByRole('group', {name: 'Your rating for Luna necklace'})).toBeInTheDocument();
    expect(screen.queryByRole('group', {name: 'Your rating for Aurora ring'})).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: 'Submit rating'})).toHaveLength(1);
  });

  it('shows the pending state while saving', async () => {
    const user = userEvent.setup();
    let finish: (reply: ActionReply) => void = () => {};
    renderRatings(ready([{productId: RING, title: 'Aurora ring', rating: null}]), {
      reply: () => new Promise((resolve) => (finish = resolve)),
    });

    await user.click(await screen.findByRole('radio', {name: '3 stars'}));
    await user.click(screen.getByRole('button', {name: 'Submit rating'}));

    const pending = await screen.findByRole('button', {name: 'Saving your rating…'});
    expect(pending).toBeDisabled();
    expect(screen.getByRole('radio', {name: '3 stars'})).toBeDisabled();

    finish({status: 201, body: {productId: RING, rating: 3}});
    expect(await screen.findByText('Your rating: 3 out of 5')).toBeInTheDocument();
  });

  it('shows the existing rating when the server says it was already rated', async () => {
    const user = userEvent.setup();
    renderRatings(ready([{productId: RING, title: 'Aurora ring', rating: null}]), {
      reply: () => ({status: 409, body: {error: 'already_rated', rating: 5}}),
    });

    await user.click(await screen.findByRole('radio', {name: '1 star'}));
    await user.click(screen.getByRole('button', {name: 'Submit rating'}));

    expect(await screen.findByText('You have already rated this piece.')).toBeInTheDocument();
    expect(screen.getByText('Your rating: 5 out of 5')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it.each([
    ['save_failed', 503, "We couldn't save your rating. Please try again."],
    ['not_delivered', 403, 'You can rate the pieces in this order once the whole order has been delivered.'],
    ['verification_unavailable', 503, "We couldn't check this order's delivery right now. Please try again later."],
    ['unauthenticated', 401, 'Your session has ended. Sign in again to rate this piece.'],
  ])('keeps the form and explains a %s error', async (error, status, message) => {
    const user = userEvent.setup();
    renderRatings(ready([{productId: RING, title: 'Aurora ring', rating: null}]), {
      reply: () => ({status, body: {error}}),
    });

    await user.click(await screen.findByRole('radio', {name: '2 stars'}));
    await user.click(screen.getByRole('button', {name: 'Submit rating'}));

    await waitFor(() => {
      const statuses = screen.getAllByRole('status').map((node) => node.textContent);
      expect(statuses).toContain(message);
    });
    expect(screen.queryByText(/Your rating: /)).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Submit rating'})).toBeEnabled();
  });

  it('explains why an order that is not fully delivered cannot be rated', async () => {
    renderRatings(ready([{productId: RING, title: 'Aurora ring', rating: null}], false));
    expect(
      await screen.findByText(
        'You can rate the pieces in this order once the whole order has been delivered.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it.each([
    [{status: 'unavailable'} as const, 'Ratings are not available at the moment.'],
    [{status: 'verification_error'} as const, "We couldn't check this order's delivery right now. Please try again later."],
    [{status: 'load_error'} as const, "We couldn't load your ratings right now. Please try again later."],
    [ready([]), 'There are no pieces in this order that can be rated.'],
  ])('shows the %j state', async (view, message) => {
    renderRatings(view);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});

describe('OrderRatings in other languages', () => {
  const TEXT = {
    pt: {
      heading: 'Avalie as suas peças',
      legend: 'A sua avaliação de Aurora ring',
      star: '1 estrela',
      stars: '4 estrelas',
      submit: 'Enviar avaliação',
      saved: 'A sua avaliação: 4 de 5',
      notDelivered: 'Pode avaliar as peças desta encomenda quando a encomenda completa tiver sido entregue.',
    },
    fr: {
      heading: 'Notez vos pièces',
      legend: 'Votre note pour Aurora ring',
      star: '1 étoile',
      stars: '4 étoiles',
      submit: 'Envoyer la note',
      saved: 'Votre note : 4 sur 5',
      notDelivered: 'Vous pourrez noter les pièces de cette commande une fois la commande entièrement livrée.',
    },
  } as const;

  it.each(['pt', 'fr'] as const)('renders the rating form and states in %s', async (code) => {
    const text = TEXT[code];
    renderRatings(ready([{productId: RING, title: 'Aurora ring', rating: null}]), {code});
    expect(await screen.findByRole('heading', {name: text.heading})).toBeInTheDocument();
    const group = screen.getByRole('group', {name: text.legend});
    expect(within(group).getByRole('radio', {name: text.star})).toBeInTheDocument();
    expect(within(group).getByRole('radio', {name: text.stars})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: text.submit})).toBeInTheDocument();
  });

  it.each(['pt', 'fr'] as const)('renders saved and undelivered states in %s', async (code) => {
    const text = TEXT[code];
    renderRatings(
      ready([{productId: RING, title: 'Aurora ring', rating: 4}], false),
      {code},
    );
    expect(
      await screen.findByText(text.saved, {normalizer: (value) => value}),
    ).toBeInTheDocument();
    expect(screen.getByText(text.notDelivered)).toBeInTheDocument();
  });

  it('localises the loading state', () => {
    render(
      <LocaleContext.Provider value={toAppLocale({language: 'FR', country: 'US'})}>
        <OrderRatingsLoading />
      </LocaleContext.Provider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Vérification de la possibilité de noter cette commande…',
    );
  });
});
