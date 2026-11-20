import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import {isOrderFullyDelivered} from './delivery';
import {
  loadOrderForRating,
  RatingVerificationError,
} from './order-eligibility.server';
import {
  productsInOrder,
  rateableProducts,
  type RateableProduct,
  type RatingSubmission,
} from './rating';
import {
  RatingStoreError,
  type RatingStore,
  type StoredRating,
} from './rating-store.server';
import type {CommentStore, StoredComment} from './comment-store.server';
import type {CommentSubmission} from './comment';

type CustomerAccount = Pick<
  HydrogenRouterContextProvider['customerAccount'],
  'query' | 'i18n'
>;

/** A product of the order with the customer's saved rating and comment, if any. */
export type ProductRatingView = RateableProduct & {
  rating: number | null;
  /** Only set for a rated product (US-059). */
  comment: StoredComment | null;
};

/** What the order page shows in its ratings section. Codes, not text. */
export type OrderRatingsView =
  | {status: 'unavailable'}
  | {status: 'verification_error'}
  | {status: 'load_error'}
  | {
      status: 'ready';
      orderId: string;
      delivered: boolean;
      products: ProductRatingView[];
    };

/**
 * Builds the ratings section for one of the signed-in customer's orders. It
 * never throws: Shopify or store failures become an error status so the rest
 * of the order page still renders.
 */
export async function loadOrderRatings({
  customerAccount,
  store,
  commentStore,
  orderId,
}: {
  customerAccount: CustomerAccount;
  store: RatingStore | null;
  commentStore: CommentStore | null;
  orderId: string;
}): Promise<OrderRatingsView> {
  if (!store || !commentStore) return {status: 'unavailable'};

  let order;
  try {
    order = await loadOrderForRating(customerAccount, orderId);
  } catch (error) {
    if (error instanceof RatingVerificationError) {
      console.error('[ratings] order verification failed:', error.code);
      return {status: 'verification_error'};
    }
    throw error;
  }
  if (!order) return {status: 'verification_error'};

  // Reading and authorizing are separate: saved ratings are read for every
  // product of the order; only products with a quantity can get a new one.
  const products = productsInOrder(order.lines);
  const rateable = new Set(
    rateableProducts(order.lines).map((product) => product.productId),
  );
  const keys = products.map((product) => ({
    customerId: order.customerId,
    orderId: order.orderId,
    productId: product.productId,
  }));
  let saved: Array<StoredRating | null>;
  let comments: Array<StoredComment | null>;
  try {
    saved = await store.findRatings(keys);
    // Comments exist only for rated products, so only those are read.
    const ratedKeys = keys.filter((_, index) => saved[index]);
    const found = ratedKeys.length
      ? await commentStore.findComments(ratedKeys)
      : [];
    const byProduct = new Map(
      ratedKeys.map((key, index) => [key.productId, found[index] ?? null]),
    );
    comments = keys.map((key) => byProduct.get(key.productId) ?? null);
  } catch (error) {
    if (error instanceof RatingStoreError) {
      console.error('[ratings] reading saved ratings failed:', error.code);
      return {status: 'load_error'};
    }
    throw error;
  }

  return {
    status: 'ready',
    orderId: order.orderId,
    delivered: isOrderFullyDelivered(order),
    products: products
      .map((product, index) => ({
        ...product,
        rating: saved[index]?.rating ?? null,
        comment: comments[index],
      }))
      .filter(
        (product) => product.rating !== null || rateable.has(product.productId),
      ),
  };
}

export type SubmitRatingError =
  | 'order_not_found'
  | 'product_not_in_order'
  | 'not_delivered'
  | 'already_rated'
  | 'verification_unavailable'
  | 'save_failed';

export type SubmitRatingResult =
  | {ok: true; productId: string; rating: number}
  | {ok: false; error: SubmitRatingError; rating?: number};

/**
 * Saves a rating after re-checking, at submission time and on the server:
 * the order belongs to the signed-in customer, the whole order was delivered
 * and the product is part of it. A rating that already exists is returned
 * unchanged with `already_rated`.
 */
export async function submitRating({
  customerAccount,
  store,
  submission,
}: {
  customerAccount: CustomerAccount;
  store: RatingStore;
  submission: RatingSubmission;
}): Promise<SubmitRatingResult> {
  let order;
  try {
    order = await loadOrderForRating(customerAccount, submission.orderId);
  } catch (error) {
    if (error instanceof RatingVerificationError) {
      console.error('[ratings] order verification failed:', error.code);
      return {ok: false, error: 'verification_unavailable'};
    }
    throw error;
  }
  if (!order) return {ok: false, error: 'order_not_found'};

  const inOrder = rateableProducts(order.lines).some(
    (product) => product.productId === submission.productId,
  );
  if (!inOrder) return {ok: false, error: 'product_not_in_order'};
  if (!isOrderFullyDelivered(order)) return {ok: false, error: 'not_delivered'};

  try {
    const result = await store.createRating(
      {
        customerId: order.customerId,
        orderId: order.orderId,
        productId: submission.productId,
      },
      submission.rating,
    );
    return result.status === 'created'
      ? {ok: true, productId: submission.productId, rating: result.rating.rating}
      : {ok: false, error: 'already_rated', rating: result.rating.rating};
  } catch (error) {
    if (error instanceof RatingStoreError) {
      console.error('[ratings] saving a rating failed:', error.code);
      return {ok: false, error: 'save_failed'};
    }
    throw error;
  }
}

export type SubmitCommentError =
  | 'order_not_found'
  | 'product_not_in_order'
  | 'not_rated'
  | 'verification_unavailable'
  | 'save_failed';

export type SubmitCommentResult =
  | {ok: true; productId: string; comment: StoredComment}
  | {ok: false; error: SubmitCommentError};

/**
 * Saves (or replaces) the comment on one of the signed-in customer's ratings
 * and sends it to review (US-059). Re-checks on the server that the order is
 * the customer's, the product is in it and the customer has rated it.
 * Delivery is not checked again: a saved rating already required it.
 */
export async function submitComment({
  customerAccount,
  store,
  commentStore,
  submission,
}: {
  customerAccount: CustomerAccount;
  store: RatingStore;
  commentStore: CommentStore;
  submission: CommentSubmission;
}): Promise<SubmitCommentResult> {
  let order;
  try {
    order = await loadOrderForRating(customerAccount, submission.orderId);
  } catch (error) {
    if (error instanceof RatingVerificationError) {
      console.error('[ratings] order verification failed:', error.code);
      return {ok: false, error: 'verification_unavailable'};
    }
    throw error;
  }
  if (!order) return {ok: false, error: 'order_not_found'};

  // Like reading, a saved rating stays commentable if its line's quantity
  // later drops; the rating itself is the authorisation.
  const inOrder = productsInOrder(order.lines).some(
    (product) => product.productId === submission.productId,
  );
  if (!inOrder) return {ok: false, error: 'product_not_in_order'};

  const key = {
    customerId: order.customerId,
    orderId: order.orderId,
    productId: submission.productId,
  };
  try {
    const [rating] = await store.findRatings([key]);
    if (!rating) return {ok: false, error: 'not_rated'};
    const comment = await commentStore.saveComment(
      key,
      rating.rating,
      submission.comment,
    );
    return {ok: true, productId: submission.productId, comment};
  } catch (error) {
    if (error instanceof RatingStoreError) {
      console.error('[ratings] saving a comment failed:', error.code);
      return {ok: false, error: 'save_failed'};
    }
    throw error;
  }
}

/** HTTP status for each error code returned by the rating and comment endpoints. */
export const RATING_ERROR_STATUS = {
  method_not_allowed: 405,
  cross_origin: 403,
  unauthenticated: 401,
  invalid_json: 400,
  invalid_payload: 400,
  invalid_order: 400,
  invalid_product: 400,
  invalid_rating: 400,
  empty_comment: 400,
  comment_too_long: 400,
  order_not_found: 404,
  product_not_in_order: 422,
  not_delivered: 403,
  already_rated: 409,
  not_rated: 409,
  ratings_unavailable: 503,
  verification_unavailable: 503,
  save_failed: 503,
} as const;

export type RatingErrorCode = keyof typeof RATING_ERROR_STATUS;
