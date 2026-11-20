import {data} from 'react-router';
import type {Route} from './+types/api.order-ratings';
import {NO_STORE} from '~/lib/profile/operation.server';
import {parseRatingSubmission} from '~/lib/ratings/rating';
import {createRatingStore} from '~/lib/ratings/rating-store.server';
import {
  RATING_ERROR_STATUS,
  submitRating,
  type RatingErrorCode,
} from '~/lib/ratings/ratings.server';
import {isSameOriginRequest} from '~/lib/request-origin.server';

/** Response body of `POST /api/order-ratings`. */
export type RatingActionData =
  | {productId: string; rating: number}
  | {error: RatingErrorCode; rating?: number};

function fail(error: RatingErrorCode, rating?: number) {
  return data<RatingActionData>(
    rating === undefined ? {error} : {error, rating},
    {status: RATING_ERROR_STATUS[error], headers: NO_STORE},
  );
}

/**
 * `POST /api/order-ratings` with JSON `{orderId, productId, rating}` (US-058).
 * Saves the signed-in customer's 1–5 star rating for a product of one of their
 * fully delivered orders. Identity, ownership and delivery are resolved on the
 * server; a saved rating is never replaced.
 */
export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') return fail('method_not_allowed');
  if (!isSameOriginRequest(request)) return fail('cross_origin');

  const loggedIn = await context.customerAccount
    .isLoggedIn()
    .catch(() => false);
  if (!loggedIn) return fail('unauthenticated');

  const store = createRatingStore(context.env);
  if (!store) return fail('ratings_unavailable');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('invalid_json');
  }
  const parsed = parseRatingSubmission(body);
  if ('error' in parsed) return fail(parsed.error);

  const result = await submitRating({
    customerAccount: context.customerAccount,
    store,
    submission: parsed.submission,
  });
  if (!result.ok) return fail(result.error, result.rating);

  return data<RatingActionData>(
    {productId: result.productId, rating: result.rating},
    {status: 201, headers: NO_STORE},
  );
}

/** Ratings are written with POST only; there is nothing to read here. */
export function loader() {
  return fail('method_not_allowed');
}
