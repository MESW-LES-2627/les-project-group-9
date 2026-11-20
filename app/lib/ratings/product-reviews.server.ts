import {CacheCustom, type WithCache} from '@shopify/hydrogen';
import type {AccessTokenCache} from './admin-token.server';
import {
  createAdminClient,
  RatingStoreError,
  readAdminConfig,
  type RatingStoreEnv,
} from './admin-client.server';
import {ShopifyCommentStore, type PublicComment} from './comment-store.server';
import {listProductRatingValues} from './rating-store.server';
import {summarizeRatings, type RatingSummary} from './reviews';

/** Published comments shown on a product page, newest first. */
export const COMMENTS_PER_PRODUCT = 20;

/** What the product page shows in its reviews section. Codes, not text. */
export type ProductReviewsView =
  | {status: 'unavailable'}
  | {status: 'error'}
  | {status: 'ready'; summary: RatingSummary; comments: PublicComment[]};

/**
 * Public reviews must appear without hammering the Admin API on every page
 * view: a published comment shows up within about a minute (five while stale).
 */
const REVIEWS_CACHE = CacheCustom({
  mode: 'public',
  maxAge: 60,
  staleWhileRevalidate: 240,
});

/**
 * Loads a product's public reviews (US-060): the average and number of all
 * verified ratings, and the published comments. Customer and order IDs never
 * leave this function. It never throws, so the product page always renders.
 *
 * With `withCache` (the worker cache), only complete results are cached.
 */
export async function loadProductReviews({
  env,
  productId,
  withCache,
  fetchImpl = fetch,
  tokenCache,
}: {
  env: RatingStoreEnv;
  productId: string;
  withCache?: WithCache;
  fetchImpl?: typeof fetch;
  tokenCache?: AccessTokenCache;
}): Promise<ProductReviewsView> {
  const client = createAdminClient(env, fetchImpl, tokenCache);
  if (!client) return {status: 'unavailable'};

  const load = async (): Promise<ProductReviewsView> => {
    try {
      const [values, comments] = await Promise.all([
        listProductRatingValues(client, productId),
        new ShopifyCommentStore(client).listPublished(productId, COMMENTS_PER_PRODUCT),
      ]);
      return {status: 'ready', summary: summarizeRatings(values), comments};
    } catch (error) {
      if (error instanceof RatingStoreError) {
        console.error('[ratings] loading product reviews failed:', error.code);
        return {status: 'error'};
      }
      throw error;
    }
  };

  try {
    if (!withCache) return await load();
    return await withCache.run(
      {
        cacheKey: ['product-reviews', readAdminConfig(env)?.domain ?? '', productId],
        cacheStrategy: REVIEWS_CACHE,
        shouldCacheResult: (view) => view.status === 'ready',
      },
      load,
    );
  } catch (error) {
    console.error(
      '[ratings] unexpected error loading product reviews:',
      error instanceof Error ? error.name : 'unknown',
    );
    return {status: 'error'};
  }
}
