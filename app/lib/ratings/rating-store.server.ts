import {
  ADMIN_RATING_CREATE_MUTATION,
  ADMIN_RATING_DELETE_MUTATION,
  adminRatingsByHandleQuery,
} from '~/graphql/admin/RatingMetaobjects';
import {
  AdminTokenError,
  createAccessTokenProvider,
  type AccessTokenCache,
  type AccessTokenProvider,
  type AdminCredentials,
} from './admin-token.server';
import {isRatingValue, ratingHandle, type RatingKey} from './rating';

/** Metaobject definition type that holds rating records (see docs/architecture.md → Order ratings). */
export const RATING_METAOBJECT_TYPE = 'product_rating';
/** Admin API version used for rating records. */
export const ADMIN_API_VERSION = '2026-04';

const REQUEST_TIMEOUT_MS = 10_000;
const HANDLES_PER_REQUEST = 25;

/** A persisted rating, as read back from Shopify. */
export type StoredRating = RatingKey & {rating: number};

export type CreateRatingResult =
  | {status: 'created'; rating: StoredRating}
  | {status: 'exists'; rating: StoredRating};

/** The store could not complete the request; nothing should be reported as saved. */
export class RatingStoreError extends Error {
  constructor(readonly code: string) {
    super(`Rating store error: ${code}`);
    this.name = 'RatingStoreError';
  }
}

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

export type RatingStoreEnv = {
  PUBLIC_STORE_DOMAIN?: string;
  PRIVATE_ADMIN_API_TOKEN?: string;
  PRIVATE_ADMIN_API_CLIENT_ID?: string;
  PRIVATE_ADMIN_API_CLIENT_SECRET?: string;
};

type AdminConfig = {
  domain: string;
  endpoint: string;
  credentials: AdminCredentials;
};

const MYSHOPIFY_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/**
 * Reads the Admin API configuration from the server environment: a
 * `*.myshopify.com` domain plus either a static token or a client ID and
 * secret (the static token wins when both are set). Returns `null` (ratings
 * unavailable) otherwise, e.g. in CI against mock.shop.
 */
export function readAdminConfig(env: RatingStoreEnv): AdminConfig | null {
  const domain = env.PUBLIC_STORE_DOMAIN?.trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  if (!domain || !MYSHOPIFY_DOMAIN.test(domain)) return null;

  const token = env.PRIVATE_ADMIN_API_TOKEN?.trim();
  const clientId = env.PRIVATE_ADMIN_API_CLIENT_ID?.trim();
  const clientSecret = env.PRIVATE_ADMIN_API_CLIENT_SECRET?.trim();
  let credentials: AdminCredentials;
  if (token) credentials = {kind: 'static', token};
  else if (clientId && clientSecret) {
    credentials = {kind: 'client_credentials', clientId, clientSecret};
  } else return null;

  return {
    domain,
    endpoint: `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    credentials,
  };
}

/** Creates the Shopify-backed store, or `null` when it is not configured. */
export function createRatingStore(
  env: RatingStoreEnv,
  fetchImpl: typeof fetch = fetch,
  tokenCache?: AccessTokenCache,
): RatingStore | null {
  const config = readAdminConfig(env);
  if (!config) return null;
  const tokens = createAccessTokenProvider({
    domain: config.domain,
    credentials: config.credentials,
    fetchImpl,
    cache: tokenCache,
  });
  return new ShopifyRatingStore(config.endpoint, tokens, fetchImpl);
}

type MetaobjectNode = {
  id: string;
  handle: string;
  fields: Array<{key: string; value: string | null}>;
};

type UserError = {field?: string[] | null; message: string; code?: string | null};

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
  constructor(
    private readonly endpoint: string,
    private readonly tokens: AccessTokenProvider,
    private readonly fetchImpl: typeof fetch,
  ) {}

  async findRatings(keys: RatingKey[]): Promise<Array<StoredRating | null>> {
    const handles = await Promise.all(keys.map(ratingHandle));
    const results: Array<StoredRating | null> = [];

    for (let start = 0; start < keys.length; start += HANDLES_PER_REQUEST) {
      const chunk = handles.slice(start, start + HANDLES_PER_REQUEST);
      const variables = Object.fromEntries(
        chunk.map((handle, index) => [
          `h${index}`,
          {type: RATING_METAOBJECT_TYPE, handle},
        ]),
      );
      const data = await this.#request<Record<string, MetaobjectNode | null>>(
        adminRatingsByHandleQuery(chunk.length),
        variables,
      );
      chunk.forEach((handle, index) => {
        const node = data[`r${index}`];
        results.push(
          node ? toStoredRating(node, handle, keys[start + index]) : null,
        );
      });
    }

    return results;
  }

  async createRating(
    key: RatingKey,
    rating: number,
  ): Promise<CreateRatingResult> {
    if (!isRatingValue(rating)) throw new RatingStoreError('invalid_rating');
    const handle = await ratingHandle(key);

    const data = await this.#request<{
      metaobjectCreate: {
        metaobject: MetaobjectNode | null;
        userErrors: UserError[];
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
      const data = await this.#request<{
        metaobjectDelete: {userErrors: UserError[]} | null;
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

  async #request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    let token: string;
    try {
      token = await this.tokens.get();
    } catch (error) {
      if (error instanceof AdminTokenError) {
        throw new RatingStoreError(`token_${error.code}`);
      }
      throw error;
    }

    // Call fetch as a plain function: the Workers runtime (Oxygen, MiniOxygen)
    // throws "Illegal invocation" when the global fetch runs with another
    // object as `this`, as `this.fetchImpl(...)` would.
    const fetchImpl = this.fetchImpl;
    let response: Response;
    try {
      response = await fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify({query, variables}),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      console.error(
        '[ratings] Admin API request failed:',
        error instanceof Error ? error.name : 'unknown',
      );
      throw new RatingStoreError('network');
    }
    if (response.status === 401) this.tokens.invalidate();
    if (!response.ok) throw new RatingStoreError(`http_${response.status}`);

    const body = (await response.json().catch(() => null)) as {
      data?: T | null;
      errors?: unknown[];
    } | null;
    if (!body || body.errors?.length || !body.data) {
      throw new RatingStoreError('graphql');
    }
    return body.data;
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
  const fields = new Map(node.fields.map((field) => [field.key, field.value]));
  const rating = Number(fields.get('rating'));
  if (
    node.handle !== handle ||
    fields.get('customer_id') !== key.customerId ||
    fields.get('order_id') !== key.orderId ||
    fields.get('product_id') !== key.productId ||
    !isRatingValue(rating)
  ) {
    throw new RatingStoreError('record_mismatch');
  }
  return {...key, rating};
}
