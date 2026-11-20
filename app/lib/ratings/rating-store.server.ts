import {
  ADMIN_PRODUCT_RATINGS_QUERY,
  ADMIN_RATING_CREATE_MUTATION,
  ADMIN_RATING_DELETE_MUTATION,
  adminRatingsByHandleQuery,
} from '~/graphql/admin/RatingMetaobjects';
import type {AccessTokenCache} from './admin-token.server';
import {
  createAdminClient,
  fieldMap,
  logUserErrors,
  productFieldQuery,
  RatingStoreError,
  type AdminClient,
  type AdminUserError,
  type MetaobjectNode,
  type RatingStoreEnv,
} from './admin-client.server';
import {isRatingValue, ratingHandle, type RatingKey} from './rating';

export {
  ADMIN_API_VERSION,
  RatingStoreError,
  readAdminConfig,
  type RatingStoreEnv,
} from './admin-client.server';

/** Metaobject definition type that holds rating records (see docs/architecture.md → Order ratings). */
export const RATING_METAOBJECT_TYPE = 'product_rating';

/** Pages of 250 ratings read for one product before failing closed (US-060). */
export const MAX_RATING_PAGES = 20;

/** Handles read per `metaobjectByHandle` batch request. */
export const HANDLES_PER_REQUEST = 25;

/** A persisted rating, as read back from Shopify. */
export type StoredRating = RatingKey & {rating: number};

export type CreateRatingResult =
  | {status: 'created'; rating: StoredRating}
  | {status: 'exists'; rating: StoredRating};

/** Persistence boundary for ratings. Records are create-only. */
export interface RatingStore {
  /** Reads the saved rating for each key, in the same order (`null` when none). */
  findRatings(keys: RatingKey[]): Promise<Array<StoredRating | null>>;
  /**
   * Saves a rating unless one already exists for the key. An existing rating is
   * never changed; it is returned with `status: 'exists'`.
   */
  createRating(key: RatingKey, rating: number): Promise<CreateRatingResult>;
}

/** Creates the Shopify-backed store, or `null` when it is not configured. */
export function createRatingStore(
  env: RatingStoreEnv,
  fetchImpl: typeof fetch = fetch,
  tokenCache?: AccessTokenCache,
): RatingStore | null {
  const client = createAdminClient(env, fetchImpl, tokenCache);
  return client ? new ShopifyRatingStore(client) : null;
}

/**
 * Reads metaobjects by exact handle, `HANDLES_PER_REQUEST` per request, and
 * returns them in the order of `handles` (`null` when a handle has no record).
 */
export async function readByHandles(
  client: AdminClient,
  type: string,
  handles: string[],
  query: (count: number) => string,
): Promise<Array<MetaobjectNode | null>> {
  const results: Array<MetaobjectNode | null> = [];
  for (let start = 0; start < handles.length; start += HANDLES_PER_REQUEST) {
    const chunk = handles.slice(start, start + HANDLES_PER_REQUEST);
    const variables = Object.fromEntries(
      chunk.map((handle, index) => [`h${index}`, {type, handle}]),
    );
    const data = await client.request<Record<string, MetaobjectNode | null>>(
      query(chunk.length),
      variables,
    );
    chunk.forEach((_, index) => results.push(data[`r${index}`] ?? null));
  }
  return results;
}

/**
 * Rating records as private Shopify metaobjects, through the Admin GraphQL API.
 *
 * Records are only ever created with `metaobjectCreate` and an explicit,
 * deterministic handle (never upserted or updated), and reads use that exact
 * handle. Whether this gives one record per customer + order + product depends
 * on how Shopify answers a create whose explicit handle already exists, which
 * its documentation (2026-04) does not state. Responses are handled as:
 *
 * - record returned with the requested handle: saved (`created`);
 * - no record (any `userErrors`, e.g. `TAKEN`, or none): the record under the
 *   exact handle is read and reported as `exists`; if there is none, the save
 *   failed;
 * - record returned with a different handle: Shopify accepted a second record.
 *   This breaks the uniqueness rule. It is logged, deleted as a best-effort
 *   compensation (which can fail, or never run if the request dies) and the
 *   record under the exact handle is reported. This path is NOT a uniqueness
 *   guarantee; see docs/architecture.md → Order ratings → Storage.
 */
export class ShopifyRatingStore implements RatingStore {
  constructor(private readonly client: AdminClient) {}

  async findRatings(keys: RatingKey[]): Promise<Array<StoredRating | null>> {
    const handles = await Promise.all(keys.map(ratingHandle));
    const nodes = await readByHandles(
      this.client,
      RATING_METAOBJECT_TYPE,
      handles,
      adminRatingsByHandleQuery,
    );
    return nodes.map((node, index) =>
      node ? toStoredRating(node, handles[index], keys[index]) : null,
    );
  }

  async createRating(
    key: RatingKey,
    rating: number,
  ): Promise<CreateRatingResult> {
    if (!isRatingValue(rating)) throw new RatingStoreError('invalid_rating');
    const handle = await ratingHandle(key);

    const data = await this.client.request<{
      metaobjectCreate: {
        metaobject: MetaobjectNode | null;
        userErrors: AdminUserError[];
      } | null;
    }>(ADMIN_RATING_CREATE_MUTATION, {
      metaobject: {
        type: RATING_METAOBJECT_TYPE,
        handle,
        fields: [
          {key: 'customer_id', value: key.customerId},
          {key: 'order_id', value: key.orderId},
          {key: 'product_id', value: key.productId},
          {key: 'rating', value: String(rating)},
        ],
      },
    });

    const created = data.metaobjectCreate?.metaobject ?? null;
    logUserErrors('metaobjectCreate', data.metaobjectCreate?.userErrors ?? []);
    if (created?.handle === handle) {
      return {status: 'created', rating: toStoredRating(created, handle, key)};
    }
    if (created) {
      console.error(
        '[ratings] uniqueness violation: metaobjectCreate stored a record under another handle',
      );
      await this.#deleteDuplicate(created.id);
    }

    // Rejected or renamed: report the record under the exact handle, if any.
    const [existing] = await this.findRatings([key]);
    if (existing) return {status: 'exists', rating: existing};
    throw new RatingStoreError('create_rejected');
  }

  async #deleteDuplicate(id: string): Promise<void> {
    try {
      const data = await this.client.request<{
        metaobjectDelete: {userErrors: AdminUserError[]} | null;
      }>(ADMIN_RATING_DELETE_MUTATION, {id});
      if (data.metaobjectDelete?.userErrors.length) {
        console.error('[ratings] could not delete duplicate record', id);
      }
    } catch {
      // The authoritative record is still the one under the exact handle, so
      // reads are unaffected; the stray record needs manual clean-up.
      console.error('[ratings] could not delete duplicate record', id);
    }
  }
}

/**
 * Converts a metaobject into a rating, checking that it really belongs to the
 * expected key. A record that does not match is treated as a store error.
 */
function toStoredRating(
  node: MetaobjectNode,
  handle: string,
  key: RatingKey,
): StoredRating {
  const fields = fieldMap(node);
  const rating = Number(fields.get('rating'));
  if (
    node.handle !== handle ||
    !fieldsMatchKey(fields, key) ||
    !isRatingValue(rating)
  ) {
    throw new RatingStoreError('record_mismatch');
  }
  return {...key, rating};
}

/** Whether a record's ID fields name exactly this customer, order and product. */
export function fieldsMatchKey(
  fields: Map<string, string | null>,
  key: RatingKey,
): boolean {
  return (
    fields.get('customer_id') === key.customerId &&
    fields.get('order_id') === key.orderId &&
    fields.get('product_id') === key.productId
  );
}

type ProductRatingsPage = {
  metaobjects: {
    nodes: Array<{
      productId: {value: string | null} | null;
      rating: {value: string | null} | null;
    }>;
    pageInfo: {hasNextPage: boolean; endCursor: string | null};
  };
};

/**
 * Every star value saved for a product, for the public average (US-060). Only
 * the product and rating fields are read, never customer or order IDs. Records
 * of another product or with an invalid value are skipped.
 *
 * @throws RatingStoreError when Shopify fails or there are more than
 *   {@link MAX_RATING_PAGES} pages: an average of part of the ratings would be
 *   misleading.
 */
export async function listProductRatingValues(
  client: AdminClient,
  productId: string,
): Promise<number[]> {
  const query = productFieldQuery(productId);
  const values: number[] = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_RATING_PAGES; page++) {
    const data: ProductRatingsPage = await client.request(ADMIN_PRODUCT_RATINGS_QUERY, {
      type: RATING_METAOBJECT_TYPE,
      query,
      after,
    });
    for (const node of data.metaobjects.nodes) {
      const value = Number(node.rating?.value);
      if (node.productId?.value === productId && isRatingValue(value)) {
        values.push(value);
      }
    }
    const {hasNextPage, endCursor} = data.metaobjects.pageInfo;
    if (!hasNextPage) return values;
    if (!endCursor) throw new RatingStoreError('missing_cursor');
    after = endCursor;
  }
  throw new RatingStoreError('too_many_ratings');
}
