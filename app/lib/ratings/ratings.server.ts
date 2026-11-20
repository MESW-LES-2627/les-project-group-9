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
import {RatingStoreError, type RatingStore} from './rating-store.server';

type CustomerAccount = Pick<
  HydrogenRouterContextProvider['customerAccount'],
  'query' | 'i18n'
>;

/** A product of the order with the customer's saved rating, if any. */
export type ProductRatingView = RateableProduct & {rating: number | null};

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
  orderId,
}: {
  customerAccount: CustomerAccount;
  store: RatingStore | null;
  orderId: string;
}): Promise<OrderRatingsView> {
  if (!store) return {status: 'unavailable'};

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
  let saved;
  try {
    saved = await store.findRatings(
      products.map((product) => ({
        customerId: order.customerId,
        orderId: order.orderId,
        productId: product.productId,
      })),
    );
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

/** HTTP status for each rating error code returned by the rating endpoint. */
export const RATING_ERROR_STATUS = {
  method_not_allowed: 405,
  cross_origin: 403,
  unauthenticated: 401,
  invalid_json: 400,
  invalid_payload: 400,
  invalid_order: 400,
  invalid_product: 400,
  invalid_rating: 400,
  order_not_found: 404,
  product_not_in_order: 422,
  not_delivered: 403,
  already_rated: 409,
  ratings_unavailable: 503,
  verification_unavailable: 503,
  save_failed: 503,
} as const;

export type RatingErrorCode = keyof typeof RATING_ERROR_STATUS;
