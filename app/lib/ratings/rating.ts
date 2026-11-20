import {isProductGid} from '~/lib/profile/list-schema';

/** Lowest and highest star values a shopper can give (US-058). */
export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const RATING_VALUES = [1, 2, 3, 4, 5] as const;

const ORDER_GID = /^gid:\/\/shopify\/Order\/\d+$/;

/** Whether `value` is a Shopify order GID (`gid://shopify/Order/<number>`). */
export function isOrderGid(value: unknown): value is string {
  return typeof value === 'string' && ORDER_GID.test(value);
}

/** Whether `value` is a whole number of stars from 1 to 5. Strings are rejected. */
export function isRatingValue(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_RATING &&
    value <= MAX_RATING
  );
}

export type RatingSubmission = {
  orderId: string;
  productId: string;
  rating: number;
};

export type RatingSubmissionError =
  | 'invalid_payload'
  | 'invalid_order'
  | 'invalid_product'
  | 'invalid_rating';

/**
 * Validates the JSON body of a rating submission. Only the order, product and
 * star value are read; any other field (customer ID, "verified" flags…) is
 * ignored, because identity and eligibility are resolved on the server.
 */
export function parseRatingSubmission(
  body: unknown,
): {submission: RatingSubmission} | {error: RatingSubmissionError} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {error: 'invalid_payload'};
  }
  const {orderId, productId, rating} = body as Record<string, unknown>;
  if (!isOrderGid(orderId)) return {error: 'invalid_order'};
  if (!isProductGid(productId)) return {error: 'invalid_product'};
  if (!isRatingValue(rating)) return {error: 'invalid_rating'};
  return {submission: {orderId, productId, rating}};
}

export type OrderLineForRating = {
  id: string;
  productId?: string | null;
  quantity: number;
  title: string;
  image?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
};

export type RateableProduct = {
  productId: string;
  title: string;
  image: OrderLineForRating['image'] | null;
};

/**
 * Groups an order's lines into one rating opportunity per distinct product:
 * several units or variants of a product give a single entry. Lines without a
 * Shopify product ID (deleted products, custom lines) or with no remaining
 * quantity cannot be rated and are skipped.
 */
export function rateableProducts(
  lines: OrderLineForRating[],
): RateableProduct[] {
  return productsInOrder(lines.filter((line) => line.quantity > 0));
}

/**
 * Every distinct product of an order, whatever its current quantity. Used to
 * read saved ratings, so a rating stays visible even if Shopify later reports
 * a smaller quantity for its line; it never authorizes a new rating.
 */
export function productsInOrder(
  lines: OrderLineForRating[],
): RateableProduct[] {
  const products = new Map<string, RateableProduct>();
  for (const line of lines) {
    if (!isProductGid(line.productId)) continue;
    if (products.has(line.productId)) continue;
    products.set(line.productId, {
      productId: line.productId,
      title: line.title,
      image: line.image ?? null,
    });
  }
  return [...products.values()];
}

/** Identifies one rating: a customer's rating of a product within one order. */
export type RatingKey = {
  customerId: string;
  orderId: string;
  productId: string;
};

/**
 * Deterministic metaobject handle for a rating key. Shopify keeps handles
 * unique within a metaobject type, so this handle is what limits a customer
 * to one rating per order and product. Hashing keeps customer and order IDs
 * out of the handle.
 */
export async function ratingHandle(key: RatingKey): Promise<string> {
  const input = new TextEncoder().encode(
    `${key.customerId}|${key.orderId}|${key.productId}`,
  );
  const digest = await crypto.subtle.digest('SHA-256', input);
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `rating-${hex}`;
}
