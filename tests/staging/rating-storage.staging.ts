/**
 * US-058 storage uniqueness checks against a REAL Shopify store.
 *
 * Run only with explicit authorization, on staging, after the Shopify setup in
 * docs/architecture.md. Not part of `npm test` or CI:
 *
 *   npx vitest run --config vitest.staging.config.ts
 *
 * Environment (shell variables; nothing is read from .env automatically):
 * - PUBLIC_STORE_DOMAIN: the staging `*.myshopify.com` domain;
 * - PRIVATE_ADMIN_API_CLIENT_ID + PRIVATE_ADMIN_API_CLIENT_SECRET, or
 *   PRIVATE_ADMIN_API_TOKEN;
 * - RATINGS_STAGING_CONFIRM_WRITES: must equal PUBLIC_STORE_DOMAIN, or the
 *   write checks are skipped;
 * - RATINGS_STAGING_INSPECT (optional, read-only): `customerGid|orderGid|productGid`
 *   of a rating made through the storefront, to count its records.
 *
 * Write checks only create `product_rating` entries with synthetic IDs
 * (customer and order `.../0`) and delete exactly those entries afterwards.
 */
import {afterAll, describe, expect, it, vi} from 'vitest';
import {
  ADMIN_RATING_CREATE_MUTATION,
  ADMIN_RATING_DELETE_MUTATION,
} from '~/graphql/admin/RatingMetaobjects';
import {createAccessTokenProvider} from '~/lib/ratings/admin-token.server';
import {ratingHandle, type RatingKey} from '~/lib/ratings/rating';
import {
  createRatingStore,
  RATING_METAOBJECT_TYPE,
  readAdminConfig,
} from '~/lib/ratings/rating-store.server';

const env = process.env;
const config = readAdminConfig(env);
const writesConfirmed =
  config !== null && env.RATINGS_STAGING_CONFIRM_WRITES === config.domain;

const PROBE_CUSTOMER = 'gid://shopify/Customer/0';
const PROBE_ORDER = 'gid://shopify/Order/0';
// Unique per run, so this run only ever deletes its own probe records.
const RUN = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
const PROBE_PRODUCTS = [`gid://shopify/Product/${RUN}1`, `gid://shopify/Product/${RUN}2`];

type Node = {id: string; handle: string; fields: Array<{key: string; value: string | null}>};

const LIST_QUERY = `query RatingStagingList($type: String!, $after: String) {
  metaobjects(type: $type, first: 250, after: $after) {
    nodes { id handle fields { key value } }
    pageInfo { hasNextPage endCursor }
  }
}`;

async function admin<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!config) throw new Error('Admin API is not configured');
  const tokens = createAccessTokenProvider({
    domain: config.domain,
    credentials: config.credentials,
    fetchImpl: fetch,
  });
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': await tokens.get(),
    },
    body: JSON.stringify({query, variables}),
  });
  const body = (await response.json()) as {data?: T; errors?: unknown};
  if (!response.ok || body.errors || !body.data) {
    throw new Error(`Admin API ${response.status}: ${JSON.stringify(body.errors)}`);
  }
  return body.data;
}

/** Every `product_rating` entry whose fields match `match`, any handle. */
async function recordsMatching(match: Partial<Record<string, string>>) {
  const found: Array<{id: string; handle: string; fields: Record<string, string | null>}> = [];
  let after: string | null = null;
  do {
    const data: {
      metaobjects: {nodes: Node[]; pageInfo: {hasNextPage: boolean; endCursor: string | null}};
    } = await admin(LIST_QUERY, {type: RATING_METAOBJECT_TYPE, after});
    for (const node of data.metaobjects.nodes) {
      const fields = Object.fromEntries(node.fields.map((f) => [f.key, f.value]));
      if (Object.entries(match).every(([key, value]) => fields[key] === value)) {
        found.push({id: node.id, handle: node.handle, fields});
      }
    }
    after = data.metaobjects.pageInfo.hasNextPage ? data.metaobjects.pageInfo.endCursor : null;
  } while (after);
  return found;
}

function rawCreate(handle: string, key: RatingKey, rating: number) {
  return admin<{
    metaobjectCreate: {
      metaobject: {id: string; handle: string} | null;
      userErrors: Array<{code: string | null; message: string; field: string[] | null}>;
    };
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
}

describe.skipIf(!writesConfirmed)('live storage uniqueness (writes synthetic probe records)', () => {
  afterAll(async () => {
    // Delete only this run's synthetic entries (customer and order `/0`, and a
    // product ID unique to this run), never another run's probes.
    let deleted = 0;
    for (const productId of PROBE_PRODUCTS) {
      const probes = await recordsMatching({
        customer_id: PROBE_CUSTOMER,
        order_id: PROBE_ORDER,
        product_id: productId,
      });
      for (const probe of probes) {
        await admin(ADMIN_RATING_DELETE_MUTATION, {id: probe.id});
        deleted += 1;
      }
    }
    console.warn(`[staging] deleted ${deleted} probe record(s) of run ${RUN}`);
  });

  it('1. a direct create with an existing explicit handle does not add a record', async () => {
    const key = {customerId: PROBE_CUSTOMER, orderId: PROBE_ORDER, productId: PROBE_PRODUCTS[0]};
    const handle = `rating-probe-${RUN}`;

    const first = await rawCreate(handle, key, 1);
    const second = await rawCreate(handle, key, 5);
    console.warn('[staging] first create', JSON.stringify(first.metaobjectCreate));
    console.warn('[staging] second create (same handle)', JSON.stringify(second.metaobjectCreate));

    expect(first.metaobjectCreate.metaobject?.handle).toBe(handle);
    // Shopify's answer to the collision: no record (rejected) is what the
    // uniqueness rule needs; a record under another handle means it is NOT met.
    expect(second.metaobjectCreate.metaobject).toBeNull();
    expect(second.metaobjectCreate.userErrors.length).toBeGreaterThan(0);

    const records = await recordsMatching({product_id: key.productId});
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({handle, fields: {rating: '1'}});
  });

  it('2–4. concurrent submissions with different values persist one unchanged record', async () => {
    const violations = vi.spyOn(console, 'error');
    const store = createRatingStore(env);
    if (!store) throw new Error('Admin API is not configured');
    const key = {customerId: PROBE_CUSTOMER, orderId: PROBE_ORDER, productId: PROBE_PRODUCTS[1]};

    const results = await Promise.allSettled([1, 2, 3, 4, 5].map((value) => store.createRating(key, value)));
    console.warn('[staging] concurrent results', JSON.stringify(results));

    // A rejected create (network, HTTP or GraphQL error) leaves Shopify's answer
    // unknown: the run is inconclusive, never a pass on partial evidence.
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(rejected, `inconclusive: ${rejected.length} of 5 creates failed`).toHaveLength(0);
    const fulfilled = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const created = fulfilled.filter((result) => result.status === 'created');
    expect(created).toHaveLength(1);
    const winner = created[0].rating.rating;
    expect(fulfilled.every((result) => result.rating.rating === winner)).toBe(true);
    // The adapter never had to delete a renamed duplicate.
    expect(violations).not.toHaveBeenCalledWith(expect.stringContaining('uniqueness violation'));

    // Final persistent state, read again after a pause.
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const records = await recordsMatching({product_id: key.productId});
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({handle: await ratingHandle(key), fields: {rating: String(winner)}});
    expect(await store.findRatings([key])).toEqual([{...key, rating: winner}]);

    // A later retry with another value leaves it unchanged.
    expect(await store.createRating(key, winner === 5 ? 1 : 5)).toEqual({status: 'exists', rating: {...key, rating: winner}});
    expect(await recordsMatching({product_id: key.productId})).toHaveLength(1);
  });
});

const inspect = env.RATINGS_STAGING_INSPECT?.split('|');

describe.skipIf(!config || inspect?.length !== 3)('inspect a storefront rating (read-only)', () => {
  it('has exactly one record for the customer, order and product', async () => {
    const [customerId, orderId, productId] = inspect ?? [];
    const records = await recordsMatching({customer_id: customerId, order_id: orderId, product_id: productId});
    // Counts only: these records hold real customer and order IDs.
    console.warn(`[staging] records for the key: ${records.length}`);
    expect(records).toHaveLength(1);
    expect(records[0].handle).toBe(await ratingHandle({customerId, orderId, productId}));
  });
});
