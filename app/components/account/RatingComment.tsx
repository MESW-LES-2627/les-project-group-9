import {useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {useFetcher} from 'react-router';
import {
  accountInput,
  accountTouchButton,
  accountTouchSecondaryButton,
} from '~/lib/account-ui';
import {useTranslation, type MessageKey} from '~/lib/i18n';
import {
  commentError,
  commentLength,
  MAX_COMMENT_LENGTH,
  normalizeComment,
} from '~/lib/ratings/comment';
import type {StoredComment} from '~/lib/ratings/comment-store.server';
import type {RatingErrorCode} from '~/lib/ratings/ratings.server';
import type {CommentActionData} from '~/routes/api.rating-comments';

/** Endpoint that saves a comment (app/routes/api.rating-comments.tsx). */
export const COMMENT_ENDPOINT = '/api/rating-comments';

const ERROR_MESSAGES: Partial<Record<RatingErrorCode, MessageKey>> = {
  empty_comment: 'comment.error.empty',
  comment_too_long: 'comment.error.tooLong',
  not_rated: 'comment.error.notRated',
  unauthenticated: 'comment.error.signIn',
  verification_unavailable: 'rating.verificationError',
  ratings_unavailable: 'rating.unavailable',
};

/** Message key for a failed comment save; technical errors share one text. */
export function commentErrorMessage(error: RatingErrorCode): MessageKey {
  return ERROR_MESSAGES[error] ?? 'comment.error.save';
}

type RatingCommentProps = {
  orderId: string;
  productId: string;
  productTitle: string;
  /** The customer's saved comment on this rating, if any. */
  comment: StoredComment | null;
};

/**
 * The comment on one saved rating (US-059): shows it with its review state
 * and lets the customer add or edit it. Every save sends it (back) to review.
 */
export function RatingComment({
  orderId,
  productId,
  productTitle,
  comment,
}: RatingCommentProps) {
  const t = useTranslation();
  const ids = {
    field: useId(),
    help: useId(),
    note: useId(),
    counter: useId(),
  };
  const fetcher = useFetcher<CommentActionData>();
  const pending = fetcher.state !== 'idle';
  const result = fetcher.data;
  const saved = result && !('error' in result) ? result.comment : null;
  const current = saved ?? comment;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<RatingErrorCode | null>(null);
  // A server error belongs to the text that was sent: hide it once that changes.
  const [showServerError, setShowServerError] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const savedRef = useRef<HTMLParagraphElement>(null);
  const focusAfterClose = useRef<'toggle' | 'saved' | null>(null);

  // A successful save closes the form and announces the result.
  useEffect(() => {
    if (saved) {
      focusAfterClose.current = 'saved';
      setEditing(false);
    }
  }, [saved]);

  // Keep keyboard focus on the page when the form disappears.
  useEffect(() => {
    if (editing) return;
    if (focusAfterClose.current === 'saved') savedRef.current?.focus();
    if (focusAfterClose.current === 'toggle') toggleRef.current?.focus();
    focusAfterClose.current = null;
  }, [editing]);

  const open = () => {
    setDraft(current?.text ?? '');
    setLocalError(null);
    setShowServerError(false);
    setEditing(true);
  };

  const cancel = () => {
    focusAfterClose.current = 'toggle';
    setEditing(false);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    // Same rule as the server, so the shopper gets the message without a round trip.
    const text = normalizeComment(draft);
    const error = commentError(text);
    setLocalError(error);
    if (error) return;
    setShowServerError(true);
    void fetcher.submit(
      {orderId, productId, comment: text},
      {method: 'POST', action: COMMENT_ENDPOINT, encType: 'application/json'},
    );
  };

  if (!editing) {
    return (
      <div className="mt-3 space-y-2">
        {current && (
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-primary">
              {t('comment.yours')}
              {' · '}
              {t(`comment.status.${current.status}`)}
            </p>
            <p className="whitespace-pre-line break-words text-sm text-ink">
              {current.text}
            </p>
          </div>
        )}
        {saved && (
          <p
            ref={savedRef}
            tabIndex={-1}
            role="status"
            className="text-sm text-primary outline-none"
          >
            {t('comment.saved')}
          </p>
        )}
        <button
          ref={toggleRef}
          type="button"
          onClick={open}
          className={accountTouchSecondaryButton}
        >
          {current ? t('comment.edit') : t('comment.add')}
        </button>
      </div>
    );
  }

  const length = commentLength(normalizeComment(draft));
  const tooLong = length > MAX_COMMENT_LENGTH;
  const serverError =
    showServerError && result && 'error' in result ? result.error : null;
  const error = localError ?? serverError;
  const describedBy = [ids.help, current ? ids.note : null, ids.counter]
    .filter(Boolean)
    .join(' ');

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-2" aria-busy={pending}>
      <label htmlFor={ids.field} className="block text-sm text-ink">
        {t('comment.label', {product: productTitle})}
      </label>
      <textarea
        id={ids.field}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setLocalError(null);
          setShowServerError(false);
        }}
        rows={5}
        disabled={pending}
        aria-describedby={describedBy}
        aria-invalid={error === 'empty_comment' || error === 'comment_too_long' || tooLong}
        className={accountInput}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- opened by the shopper's own click
        autoFocus
      />
      <p id={ids.help} className="text-xs text-primary">
        {t('comment.help', {max: MAX_COMMENT_LENGTH})}
      </p>
      {current && (
        <p id={ids.note} className="text-xs text-primary">
          {t('comment.editNote')}
        </p>
      )}
      <p
        id={ids.counter}
        className={`text-xs ${tooLong ? 'text-red-800' : 'text-primary'}`}
      >
        {t('comment.counter', {count: length, max: MAX_COMMENT_LENGTH})}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={accountTouchButton} disabled={pending}>
          {pending ? t('comment.submitting') : t('comment.submit')}
        </button>
        <button
          type="button"
          onClick={cancel}
          className={accountTouchSecondaryButton}
          disabled={pending}
        >
          {t('comment.cancel')}
        </button>
      </div>
      <p role="status" className="text-sm text-red-800">
        {error ? t(commentErrorMessage(error), {max: MAX_COMMENT_LENGTH}) : null}
      </p>
    </form>
  );
}
