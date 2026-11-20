/**
 * Deterministic stand-ins for the two Shopify APIs used by US-058 ratings.
 * They never touch a real shop.
 *
 * - `fakeCustomerAccount`: Customer Account API `query()` serving orders that
 *   belong to one customer, with real cursor pagination and small page sizes
 *   so pagination paths run.
 * - `fakeAdminApi`: Admin GraphQL `fetch` for `product_rating` metaobjects with
 *   Shopify's documented rule that handles are unique per type. What Shopify
 *   does with a create for a taken handle is not documented, so both a
 *   rejection (`taken`) and a renamed record (`suffix`) are modelled.
 */

export type LineFixture = {
  id: string;
  productId: string | null;
  quantity: number;
  title: string;
};

export type FulfillmentFixture = {
  id: string;
  status: string | null;
  latestShipmentStatus: string | null;
  items: Array<{lineItemId: string; quantity: number | null}>;
};

export type OrderFixture = {
  id: string;
  customerId: string;
  fulfillmentStatus: string;
  lines: LineFixture[];
  fulfillments: FulfillmentFixture[];
};

export const CUSTOMER_A = 'gid://shopify/Customer/1001';
export const CUSTOMER_B = 'gid://shopify/Customer/2002';
export const PRODUCT_A = 'gid://shopify/Product/11';
export const PRODUCT_B = 'gid://shopify/Product/22';
export const PRODUCT_C = 'gid://shopify/Product/33';

let sequence = 0;

/** A fully delivered order with one line per product (quantity 1 each). */
export function deliveredOrder(
  id: string,
  customerId: string,
  products: string[],
): OrderFixture {
  const lines = products.map((productId) => ({
    id: `gid://shopify/LineItem/${++sequence}`,
    productId,
    quantity: 1,
    title: `Piece ${productId.split('/').pop()}`,
  }));
  return {
    id,
    customerId,
    fulfillmentStatus: 'FULFILLED',
    lines,
    fulfillments: [
      {
        id: `gid://shopify/Fulfillment/${++sequence}`,
        status: 'SUCCESS',
        latestShipmentStatus: 'DELIVERED',
        items: lines.map((line) => ({lineItemId: line.id, quantity: 1})),
      },
    ],
  };
}

type QueryOptions = {variables?: Record<string, unknown>};

export type FakeCustomerAccountOptions = {
  customerId: string | null;
  orders: OrderFixture[];
  loggedIn?: boolean;
  /** Page sizes the fake server uses (smaller than what the app asks for). */
  linePageSize?: number;
  fulfillmentPageSize?: number;
  itemPageSize?: number;
  /** Make the matching operations fail: `errors` response or a thrown error. */
  failOn?: {operation: 'OrderRatingLines' | 'OrderRatingFulfillments'; mode: 'errors' | 'throw'};
};

/** Fake `context.customerAccount` limited to what ratings and the order page use. */
export function fakeCustomerAccount(options: FakeCustomerAccountOptions) {
  const {
    customerId,
    orders,
    loggedIn = true,
    linePageSize = 2,
    fulfillmentPageSize = 2,
    itemPageSize = 2,
  } = options;
  const calls: Array<{operation: string; variables: Record<string, unknown>}> = [];

  const visibleOrder = (orderId: unknown) =>
    orders.find((order) => order.id === orderId && order.customerId === customerId);

  const query = async (document: string, queryOptions: QueryOptions = {}) => {
    const variables = queryOptions.variables ?? {};
    const operation = /query (\w+)/.exec(document)?.[1] ?? 'unknown';
    calls.push({operation, variables});

    if (options.failOn?.operation === operation) {
      if (options.failOn.mode === 'throw') throw new Error('network down');
      return {data: null, errors: [{message: 'Internal error'}]};
    }

    if (operation === 'OrderRatingLines') {
      const order = visibleOrder(variables.orderId);
      if (!order) {
        return {data: {customer: customerId ? {id: customerId} : null, order: null}};
      }
      const start = cursorIndex(variables.after) + 1;
      const page = order.lines.slice(start, start + linePageSize);
      const end = start + page.length;
      return {
        data: {
          customer: {id: customerId},
          order: {
            id: order.id,
            fulfillmentStatus: order.fulfillmentStatus,
            lineItems: {
              nodes: page.map((line) => ({...line, image: null})),
              pageInfo: {
                hasNextPage: end < order.lines.length,
                endCursor: page.length ? `c${end - 1}` : null,
              },
            },
          },
        },
      };
    }

    if (operation === 'OrderRatingFulfillments') {
      const order = visibleOrder(variables.orderId);
      if (!order) return {data: {order: null}};
      const start = cursorIndex(variables.after) + 1;
      const size = Math.min(Number(variables.first), fulfillmentPageSize);
      const page = order.fulfillments.slice(start, start + size);
      const end = start + page.length;
      const itemStart = cursorIndex(variables.itemsAfter) + 1;
      return {
        data: {
          order: {
            id: order.id,
            fulfillments: {
              edges: page.map((fulfillment, index) => {
                const items = fulfillment.items.slice(itemStart, itemStart + itemPageSize);
                const itemEnd = itemStart + items.length;
                return {
                  cursor: `c${start + index}`,
                  node: {
                    id: fulfillment.id,
                    status: fulfillment.status,
                    latestShipmentStatus: fulfillment.latestShipmentStatus,
                    fulfillmentLineItems: {
                      nodes: items.map((item) => ({
                        quantity: item.quantity,
                        lineItem: {id: item.lineItemId},
                      })),
                      pageInfo: {
                        hasNextPage: itemEnd < fulfillment.items.length,
                        endCursor: items.length ? `c${itemEnd - 1}` : null,
                      },
                    },
                  },
                };
              }),
              pageInfo: {
                hasNextPage: end < order.fulfillments.length,
                endCursor: page.length ? `c${end - 1}` : null,
              },
            },
          },
        },
      };
    }

    if (operation === 'Order') {
      const order = visibleOrder(variables.orderId);
      if (!order) return {data: {order: null}};
      const money = {amount: '10.0', currencyCode: 'EUR'};
      return {
        data: {
          order: {
            id: order.id,
            name: '#1001',
            confirmationNumber: null,
            statusPageUrl: 'https://example.com/status',
            fulfillmentStatus: order.fulfillmentStatus,
            processedAt: '2026-11-01T10:00:00Z',
            fulfillments: {nodes: []},
            totalTax: money,
            totalPrice: money,
            subtotal: money,
            shippingAddress: null,
            discountApplications: {nodes: []},
            lineItems: {nodes: []},
          },
        },
      };
    }

    throw new Error(`Unexpected Customer Account operation ${operation}`);
  };

  return {
    calls,
    customerAccount: {
      i18n: {language: 'EN', country: 'US'},
      isLoggedIn: async () => loggedIn,
      query,
    },
  };
}

function cursorIndex(cursor: unknown): number {
  return typeof cursor === 'string' ? Number(cursor.slice(1)) : -1;
}

type StoredMetaobject = {
  id: string;
  handle: string;
  type: string;
  fields: Array<{key: string; value: string}>;
};

/** Fake Admin GraphQL endpoint for rating metaobjects. */
export function fakeAdminApi({mode = 'taken'}: {mode?: 'taken' | 'suffix'} = {}) {
  const records = new Map<string, StoredMetaobject>();
  const requests: Array<{url: string; headers: Headers; query: string; variables: Record<string, unknown>}> = [];
  let nextId = 1;
  let failure: 'http' | 'graphql' | 'network' | null = null;
  let failOnly: string | null = null;
  const validTokens = new Set([ADMIN_ENV.PRIVATE_ADMIN_API_TOKEN]);
  const tokenExchanges: URLSearchParams[] = [];

  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/admin/oauth/access_token')) {
      const form = new URLSearchParams(String(init?.body));
      tokenExchanges.push(form);
      if (
        form.get('grant_type') !== 'client_credentials' ||
        form.get('client_id') !== CLIENT_ENV.PRIVATE_ADMIN_API_CLIENT_ID ||
        form.get('client_secret') !== CLIENT_ENV.PRIVATE_ADMIN_API_CLIENT_SECRET
      ) {
        return json({error: 'invalid_client'}, 401);
      }
      const token = `exchanged-${tokenExchanges.length}`;
      validTokens.add(token);
      return json({access_token: token, scope: 'read_metaobjects,write_metaobjects', expires_in: 86399});
    }

    const body = JSON.parse(String(init?.body)) as {
      query: string;
      variables: Record<string, unknown>;
    };
    requests.push({
      url: String(input),
      headers: new Headers(init?.headers),
      query: body.query,
      variables: body.variables,
    });

    if (!validTokens.has(new Headers(init?.headers).get('X-Shopify-Access-Token') ?? '')) {
      return json({errors: 'Invalid API key or access token'}, 401);
    }

    if (failure && (!failOnly || body.query.includes(failOnly))) {
      if (failure === 'network') throw new TypeError('fetch failed');
      if (failure === 'http') return new Response('upstream', {status: 502});
      return json({errors: [{message: 'Throttled'}]});
    }

    if (body.query.includes('metaobjectCreate')) {
      const input = body.variables.metaobject as {
        type: string;
        handle: string;
        fields: Array<{key: string; value: string}>;
      };
      // A real create yields to the event loop before committing.
      await Promise.resolve();
      if (records.has(input.handle)) {
        if (mode === 'taken') {
          return json({
            data: {
              metaobjectCreate: {
                metaobject: null,
                userErrors: [{field: ['metaobject', 'handle'], message: 'Handle is taken', code: 'TAKEN'}],
              },
            },
          });
        }
        const renamed = save({...input, handle: `${input.handle}-${nextId}`});
        return json({data: {metaobjectCreate: {metaobject: renamed, userErrors: []}}});
      }
      const created = save(input);
      return json({data: {metaobjectCreate: {metaobject: created, userErrors: []}}});
    }

    if (body.query.includes('metaobjectDelete')) {
      const id = body.variables.id;
      for (const [handle, record] of records) {
        if (record.id === id) records.delete(handle);
      }
      return json({data: {metaobjectDelete: {deletedId: id, userErrors: []}}});
    }

    if (body.query.includes('metaobjectByHandle')) {
      const data: Record<string, unknown> = {};
      for (const [name, value] of Object.entries(body.variables)) {
        const {type, handle} = value as {type: string; handle: string};
        const record = records.get(handle);
        data[`r${name.slice(1)}`] = record && record.type === type ? record : null;
      }
      return json({data});
    }

    return json({errors: [{message: 'Unknown operation'}]});
  };

  function save(input: {type: string; handle: string; fields: Array<{key: string; value: string}>}) {
    const record = {id: `gid://shopify/Metaobject/${nextId++}`, ...input};
    records.set(record.handle, record);
    return {id: record.id, handle: record.handle, fields: record.fields};
  }

  return {
    fetch: fetch as typeof globalThis.fetch,
    records,
    requests,
    tokenExchanges,
    /** Simulates Shopify expiring or revoking every issued token. */
    revokeTokens() {
      validTokens.clear();
    },
    /** Makes every later request (or only those containing `only`) fail. */
    fail(kind: 'http' | 'graphql' | 'network' | null, only: string | null = null) {
      failure = kind;
      failOnly = only;
    },
    /** Saved ratings as plain values, for assertions. */
    ratings() {
      return [...records.values()].map((record) => {
        const fields = Object.fromEntries(record.fields.map((f) => [f.key, f.value]));
        return {handle: record.handle, ...fields};
      });
    },
  };
}

export function workersStrictFetch(inner: typeof fetch): typeof fetch {
  return function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
    if (this !== undefined && this !== globalThis) {
      throw new TypeError('Illegal invocation: function called with incorrect `this` reference');
    }
    return inner(input, init);
  } as typeof fetch;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });
}

export const ADMIN_ENV = {
  PUBLIC_STORE_DOMAIN: 'jeweliette-test.myshopify.com',
  PRIVATE_ADMIN_API_TOKEN: 'shpat_test_placeholder',
};

export const CLIENT_ENV = {
  PUBLIC_STORE_DOMAIN: 'jeweliette-test.myshopify.com',
  PRIVATE_ADMIN_API_CLIENT_ID: 'client-id-placeholder',
  PRIVATE_ADMIN_API_CLIENT_SECRET: 'client-secret-placeholder',
};
