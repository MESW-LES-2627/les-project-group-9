import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createRoutesStub, data} from 'react-router';
import {describe, expect, it} from 'vitest';
import {COMMENT_ENDPOINT, RatingComment} from '~/components/account/RatingComment';
import {LocaleContext, toAppLocale, type LocaleCode} from '~/lib/i18n';
import type {StoredComment} from '~/lib/ratings/comment-store.server';

const ORDER = 'gid://shopify/Order/101';
const RING = 'gid://shopify/Product/11';
const LANGUAGE = {en: 'EN', pt: 'PT_PT', fr: 'FR'} as const;

type Reply = {status: number; body: Record<string, unknown>};

function renderComment({
  comment = null,
  code = 'en',
  reply = (body) => ({
    status: 200,
    body: {productId: RING, comment: {text: (body as {comment: string}).comment, status: 'in_review'}},
  }),
}: {
  comment?: StoredComment | null;
  code?: LocaleCode;
  reply?: (body: unknown) => Reply | Promise<Reply>;
} = {}) {
  const requests: unknown[] = [];
  const locale = toAppLocale({language: LANGUAGE[code], country: 'US'});
  const Stub = createRoutesStub([
    {
      path: '/account/orders/:id',
      Component: () => (
        <LocaleContext.Provider value={locale}>
          <RatingComment
            orderId={ORDER}
            productId={RING}
            productTitle="Aurora ring"
            comment={comment}
          />
        </LocaleContext.Provider>
      ),
    },
    {
      path: COMMENT_ENDPOINT,
      action: async ({request}) => {
        const body = await request.json();
        requests.push(body);
        const {status, body: response} = await reply(body);
        return data(response, {status});
      },
    },
  ]);
  render(<Stub initialEntries={['/account/orders/abc']} />);
  return requests;
}

describe('RatingComment', () => {
  it('adds a comment with the keyboard and shows it in review', async () => {
    const user = userEvent.setup();
    const requests = renderComment();

    await user.click(await screen.findByRole('button', {name: 'Add a comment'}));
    const field = screen.getByRole('textbox', {name: 'Your comment on Aurora ring'});
    expect(field).toHaveFocus();
    expect(field).toHaveAccessibleDescription(
      'Up to 1000 characters. Comments appear on the product page after our team reviews them. 0 of 1000 characters',
    );

    await user.type(field, '  Shines all day.');
    expect(screen.getByText('15 of 1000 characters')).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', {name: 'Send comment'})).toHaveFocus();
    await user.keyboard('{Enter}');

    const saved = await screen.findByText('Thank you. Your comment was sent for review.');
    expect(saved).toHaveFocus();
    expect(screen.getByText('Shines all day.')).toBeInTheDocument();
    expect(screen.getByText('Your comment · In review')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Edit comment'})).toBeInTheDocument();
    expect(requests).toEqual([{orderId: ORDER, productId: RING, comment: 'Shines all day.'}]);
  });

  it('shows a message and sends nothing when the comment is empty', async () => {
    const user = userEvent.setup();
    const requests = renderComment();

    await user.click(await screen.findByRole('button', {name: 'Add a comment'}));
    await user.type(screen.getByRole('textbox'), '   ');
    await user.click(screen.getByRole('button', {name: 'Send comment'}));

    expect(await screen.findByText('Write a comment before sending it.')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(requests).toHaveLength(0);
  });

  it('shows a message and sends nothing when the comment is too long', async () => {
    const user = userEvent.setup();
    const requests = renderComment();

    await user.click(await screen.findByRole('button', {name: 'Add a comment'}));
    const field = screen.getByRole('textbox');
    await user.click(field);
    await user.paste('a'.repeat(1001));
    expect(screen.getByText('1001 of 1000 characters')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    await user.click(screen.getByRole('button', {name: 'Send comment'}));

    expect(
      await screen.findByText('Your comment is too long. Shorten it to 1000 characters or fewer.'),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('edits a published comment and says it goes back to review', async () => {
    const user = userEvent.setup();
    const requests = renderComment({comment: {text: 'Old text', status: 'published'}});

    expect(await screen.findByText('Your comment · Published')).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Edit comment'}));
    const field = screen.getByRole('textbox');
    expect(field).toHaveValue('Old text');
    expect(field).toHaveAccessibleDescription(
      expect.stringContaining('Editing sends your comment back for review.'),
    );
    await user.clear(field);
    await user.type(field, 'New text');
    await user.click(screen.getByRole('button', {name: 'Send comment'}));

    expect(await screen.findByText('Your comment · In review')).toBeInTheDocument();
    expect(screen.getByText('New text')).toBeInTheDocument();
    expect(requests).toEqual([{orderId: ORDER, productId: RING, comment: 'New text'}]);
  });

  it('cancels without saving and returns focus to the button', async () => {
    const user = userEvent.setup();
    const requests = renderComment({comment: {text: 'Kept', status: 'in_review'}});

    await user.click(await screen.findByRole('button', {name: 'Edit comment'}));
    await user.type(screen.getByRole('textbox'), ' extra');
    await user.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(screen.getByText('Kept')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Edit comment'})).toHaveFocus();
    expect(requests).toHaveLength(0);
  });

  it('shows the pending state while saving', async () => {
    const user = userEvent.setup();
    let finish: (reply: Reply) => void = () => {};
    renderComment({reply: () => new Promise((resolve) => (finish = resolve))});

    await user.click(await screen.findByRole('button', {name: 'Add a comment'}));
    await user.type(screen.getByRole('textbox'), 'Nice');
    await user.click(screen.getByRole('button', {name: 'Send comment'}));

    expect(await screen.findByRole('button', {name: 'Sending your comment…'})).toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
    finish({status: 200, body: {productId: RING, comment: {text: 'Nice', status: 'in_review'}}});
    // Wait for the form to close: before that, the textarea also contains the text.
    expect(await screen.findByText('Your comment · In review')).toBeInTheDocument();
    expect(screen.getByText('Nice')).toBeInTheDocument();
  });

  it.each([
    ['save_failed', 503, "We couldn't save your comment. Please try again."],
    ['not_rated', 409, 'Rate this piece before adding a comment.'],
    ['unauthenticated', 401, 'Your session has ended. Sign in again to save your comment.'],
    ['comment_too_long', 400, 'Your comment is too long. Shorten it to 1000 characters or fewer.'],
    ['ratings_unavailable', 503, 'Ratings are not available at the moment.'],
    ['cross_origin', 403, "We couldn't save your comment. Please try again."],
  ])('keeps the text and explains a %s error until it is changed', async (error, status, message) => {
    const user = userEvent.setup();
    renderComment({reply: () => ({status, body: {error}})});

    await user.click(await screen.findByRole('button', {name: 'Add a comment'}));
    await user.type(screen.getByRole('textbox'), 'My words');
    await user.click(screen.getByRole('button', {name: 'Send comment'}));

    await waitFor(() => {
      expect(screen.getAllByRole('status').map((node) => node.textContent)).toContain(message);
    });
    expect(screen.getByRole('textbox')).toHaveValue('My words');

    await user.type(screen.getByRole('textbox'), '!');
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it.each([
    ['pt', 'Adicionar comentário', 'O seu comentário sobre Aurora ring', 'Enviar comentário', '0 de 1000 caracteres'],
    ['fr', 'Ajouter un commentaire', 'Votre commentaire sur Aurora ring', 'Envoyer le commentaire', '0 caractère sur 1000'],
  ] as const)('renders the form in %s', async (code, add, label, submit, counter) => {
    const user = userEvent.setup();
    renderComment({code});
    await user.click(await screen.findByRole('button', {name: add}));
    expect(screen.getByRole('textbox', {name: label})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: submit})).toBeInTheDocument();
    expect(screen.getByText(counter)).toBeInTheDocument();
  });

  it.each([
    ['pt', 'O seu comentário · Em revisão'],
    ['fr', 'Votre commentaire · En cours de vérification'],
  ] as const)('shows the review state in %s', async (code, text) => {
    renderComment({code, comment: {text: 'Texto', status: 'in_review'}});
    expect(await screen.findByText(text)).toBeInTheDocument();
  });
});
