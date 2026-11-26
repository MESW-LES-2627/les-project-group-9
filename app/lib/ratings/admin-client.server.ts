import {isProductGid} from '~/lib/profile/list-schema';
import {
  AdminTokenError,
  createAccessTokenProvider,
  type AccessTokenCache,
  type AccessTokenProvider,
  type AdminCredentials,
} from './admin-token.server';

/** Admin API version used for rating and review records. */
export const ADMIN_API_VERSION = '2026-04';

const REQUEST_TIMEOUT_MS = 10_000;

/** The Admin API could not complete a request; nothing should be reported as saved. */
export class RatingStoreError extends Error {
  constructor(readonly code: string) {
    super(`Rating store error: ${code}`);
    this.name = 'RatingStoreError';
  }
}

export type RatingStoreEnv = {
  PUBLIC_STORE_DOMAIN?: string;
  PRIVATE_ADMIN_API_TOKEN?: string;
  PRIVATE_ADMIN_API_CLIENT_ID?: string;
  PRIVATE_ADMIN_API_CLIENT_SECRET?: string;
};

export type AdminConfig = {
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
export function readAdminConfig(
  env: RatingStoreEnv | null | undefined,
): AdminConfig | null {
  if (!env) return null;
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

/** Server-only Admin GraphQL client shared by the rating and comment stores. */
export interface AdminClient {
  /**
   * Sends one GraphQL request and returns its `data`.
   * @throws RatingStoreError on token, network, HTTP or GraphQL failures.
   */
  request<T>(query: string, variables: Record<string, unknown>): Promise<T>;
}

/** Creates the Admin client, or `null` when the Admin API is not configured. */
export function createAdminClient(
  env: RatingStoreEnv,
  fetchImpl: typeof fetch = fetch,
  tokenCache?: AccessTokenCache,
): AdminClient | null {
  const config = readAdminConfig(env);
  if (!config) return null;
  const tokens = createAccessTokenProvider({
    domain: config.domain,
    credentials: config.credentials,
    fetchImpl,
    cache: tokenCache,
  });
  return new ShopifyAdminClient(config.endpoint, tokens, fetchImpl);
}

class ShopifyAdminClient implements AdminClient {
  constructor(
    private readonly endpoint: string,
    private readonly tokens: AccessTokenProvider,
    private readonly fetchImpl: typeof fetch,
  ) {}

  async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
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
      errors?: Array<{extensions?: {code?: unknown}}>;
    } | null;
    if (!body || body.errors?.length || !body.data) {
      console.error(
        '[ratings] Admin API GraphQL errors:',
        (body?.errors ?? [])
          .map((error) => String(error.extensions?.code ?? 'NO_CODE'))
          .join(', ') || 'no data',
      );
      throw new RatingStoreError('graphql');
    }
    return body.data;
  }
}

/** A metaobject as the rating and comment documents select it. */
export type MetaobjectNode = {
  id: string;
  handle: string;
  updatedAt?: string | null;
  capabilities?: {publishable?: {status?: string | null} | null} | null;
  fields: Array<{key: string; value: string | null}>;
};

/** A `userErrors` entry of an Admin mutation. */
export type AdminUserError = {
  field?: string[] | null;
  message: string;
  code?: string | null;
};

/**
 * Logs mutation `userErrors` as codes and field paths only: messages can echo
 * submitted values (customer IDs, comment text).
 */
export function logUserErrors(operation: string, errors: AdminUserError[]): void {
  if (!errors.length) return;
  console.error(
    `[ratings] ${operation} userErrors:`,
    errors
      .map((error) => `${error.code ?? 'NO_CODE'}@${(error.field ?? []).join('.')}`)
      .join(', '),
  );
}

/** Field values of a metaobject by key. */
export function fieldMap(node: MetaobjectNode): Map<string, string | null> {
  return new Map(node.fields.map((field) => [field.key, field.value]));
}

/**
 * `fields.product_id:"<gid>"` for an Admin `metaobjects` search. Only works
 * when `product_id` is marked filterable in the metaobject definition.
 */
export function productFieldQuery(productId: string): string {
  // A validated GID has no quotes or operators to escape.
  if (!isProductGid(productId)) {
    throw new RatingStoreError('invalid_product');
  }
  return `fields.product_id:"${productId}"`;
}
