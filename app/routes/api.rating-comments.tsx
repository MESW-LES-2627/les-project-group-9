import {data} from 'react-router';
import type {Route} from './+types/api.rating-comments';
import {NO_STORE} from '~/lib/profile/operation.server';
import {parseCommentSubmission} from '~/lib/ratings/comment';
import {
  createCommentStore,
  type StoredComment,
} from '~/lib/ratings/comment-store.server';
import {createRatingStore} from '~/lib/ratings/rating-store.server';
import {
  RATING_ERROR_STATUS,
  submitComment,
  type RatingErrorCode,
} from '~/lib/ratings/ratings.server';
import {isSameOriginRequest} from '~/lib/request-origin.server';

/** Response body of `POST /api/rating-comments`. */
export type CommentActionData =
  | {productId: string; comment: StoredComment}
  | {error: RatingErrorCode};

function fail(error: RatingErrorCode) {
  return data<CommentActionData>(
    {error},
    {
      status: RATING_ERROR_STATUS[error],
      // RFC 9110: a 405 answer lists the methods the resource supports.
      headers:
        error === 'method_not_allowed' ? {...NO_STORE, Allow: 'POST'} : NO_STORE,
    },
  );
}

/**
 * `POST /api/rating-comments` with JSON `{orderId, productId, comment}`
 * (US-059). Saves or replaces the signed-in customer's comment on one of their
 * ratings and sends it to review. Identity, ownership and the saved rating are
 * resolved on the server.
 */
export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') return fail('method_not_allowed');
  if (!isSameOriginRequest(request)) return fail('cross_origin');

  const loggedIn = await context.customerAccount
    .isLoggedIn()
    .catch(() => false);
  if (!loggedIn) return fail('unauthenticated');

  const store = createRatingStore(context.env);
  const commentStore = createCommentStore(context.env);
  if (!store || !commentStore) return fail('ratings_unavailable');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('invalid_json');
  }
  const parsed = parseCommentSubmission(body);
  if ('error' in parsed) return fail(parsed.error);

  const result = await submitComment({
    customerAccount: context.customerAccount,
    store,
    commentStore,
    submission: parsed.submission,
  });
  if (!result.ok) return fail(result.error);

  return data<CommentActionData>(
    {productId: result.productId, comment: result.comment},
    {status: 200, headers: NO_STORE},
  );
}

/** Comments are written with POST only; there is nothing to read here. */
export function loader() {
  return fail('method_not_allowed');
}
