import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
import {
  CUSTOMER_ORDER_RATING_FULFILLMENTS_QUERY,
  CUSTOMER_ORDER_RATING_LINES_QUERY,
} from '~/graphql/customer-account/CustomerOrderRatingQueries';
import type {OrderRatingFulfillmentsQuery} from 'customer-accountapi.generated';
import type {DeliveryEvidence} from './delivery';
import type {OrderLineForRating} from './rating';

type FulfillmentConnection = NonNullable<
  OrderRatingFulfillmentsQuery['order']
>['fulfillments'];

type CustomerAccount = Pick<
  HydrogenRouterContextProvider['customerAccount'],
  'query' | 'i18n'
>;

/** Pages fetched per connection before giving up (fails closed). */
export const MAX_PAGES = 20;
const FULFILLMENTS_PER_PAGE = 20;

/**
 * Shopify could not be asked, or answered incompletely. This is a temporary
 * verification failure, never evidence that the order was not delivered.
 */
export class RatingVerificationError extends Error {
  constructor(readonly code: string) {
    super(`Order verification failed: ${code}`);
    this.name = 'RatingVerificationError';
  }
}

/** The signed-in customer's order with everything the rating rules need. */
export type OrderForRating = {
  customerId: string;
  orderId: string;
  fulfillmentStatus: string | null;
  lines: OrderLineForRating[];
  fulfillments: DeliveryEvidence['fulfillments'];
};

/**
 * Loads an order through the Customer Account API with the shopper's own
 * session, following every page of line items, fulfillments and fulfillment
 * line items. Shopify only returns orders that belong to the signed-in
 * customer, so another customer's order ID yields `null`, the same as an
 * unknown one.
 *
 * @throws RatingVerificationError when Shopify fails or the history is
 *   larger than {@link MAX_PAGES} pages.
 */
export async function loadOrderForRating(
  customerAccount: CustomerAccount,
  orderId: string,
): Promise<OrderForRating | null> {
  const firstPage = await queryLines(customerAccount, orderId, null);
  const customerId = firstPage.customer?.id;
  if (!customerId) throw new RatingVerificationError('no_customer');
  const order = firstPage.order;
  if (!order) return null;

  const lines = [...order.lineItems.nodes];
  let pageInfo = order.lineItems.pageInfo;
  for (let page = 1; pageInfo.hasNextPage; page++) {
    if (page >= MAX_PAGES || !pageInfo.endCursor) {
      throw new RatingVerificationError('too_many_line_items');
    }
    const next = await queryLines(customerAccount, orderId, pageInfo.endCursor);
    if (!next.order) throw new RatingVerificationError('order_vanished');
    lines.push(...next.order.lineItems.nodes);
    pageInfo = next.order.lineItems.pageInfo;
  }

  return {
    customerId,
    orderId: order.id,
    fulfillmentStatus: order.fulfillmentStatus ?? null,
    lines: lines.map((line) => ({
      id: line.id,
      productId: line.productId ?? null,
      quantity: line.quantity,
      title: line.title,
      image: line.image ?? null,
    })),
    fulfillments: await loadFulfillments(customerAccount, order.id),
  };
}

async function loadFulfillments(
  customerAccount: CustomerAccount,
  orderId: string,
): Promise<DeliveryEvidence['fulfillments']> {
  const fulfillments: DeliveryEvidence['fulfillments'] = [];
  let after: string | null = null;

  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) {
      throw new RatingVerificationError('too_many_fulfillments');
    }
    const connection: FulfillmentConnection = (
      await queryFulfillments(customerAccount, {
        orderId,
        first: FULFILLMENTS_PER_PAGE,
        after,
      })
    ).fulfillments;

    for (const [index, edge] of connection.edges.entries()) {
      const items = edge.node.fulfillmentLineItems.nodes.map((item) => ({
        lineItemId: item.lineItem.id,
        quantity: item.quantity ?? null,
      }));
      // A fulfillment with many line items: page through its items by
      // re-selecting just this fulfillment (cursor of the edge before it).
      const cursorBefore = index === 0 ? after : connection.edges[index - 1].cursor;
      let itemsPage = edge.node.fulfillmentLineItems.pageInfo;
      for (let itemPage = 1; itemsPage.hasNextPage; itemPage++) {
        if (itemPage >= MAX_PAGES || !itemsPage.endCursor) {
          throw new RatingVerificationError('too_many_fulfillment_items');
        }
        const node = (
          await queryFulfillments(customerAccount, {
            orderId,
            first: 1,
            after: cursorBefore,
            itemsAfter: itemsPage.endCursor,
          })
        ).fulfillments.edges[0]?.node;
        if (node?.id !== edge.node.id) {
          throw new RatingVerificationError('fulfillments_changed');
        }
        items.push(
          ...node.fulfillmentLineItems.nodes.map((item) => ({
            lineItemId: item.lineItem.id,
            quantity: item.quantity ?? null,
          })),
        );
        itemsPage = node.fulfillmentLineItems.pageInfo;
      }

      fulfillments.push({
        status: edge.node.status ?? null,
        latestShipmentStatus: edge.node.latestShipmentStatus ?? null,
        items,
      });
    }

    if (!connection.pageInfo.hasNextPage) return fulfillments;
    if (!connection.pageInfo.endCursor) {
      throw new RatingVerificationError('missing_cursor');
    }
    after = connection.pageInfo.endCursor;
  }
}

async function queryLines(
  customerAccount: CustomerAccount,
  orderId: string,
  after: string | null,
) {
  let result;
  try {
    result = await customerAccount.query(CUSTOMER_ORDER_RATING_LINES_QUERY, {
      variables: {orderId, after, language: customerAccount.i18n.language},
    });
  } catch {
    throw new RatingVerificationError('customer_api');
  }
  if (result.errors?.length || !result.data) {
    throw new RatingVerificationError('customer_api');
  }
  return result.data;
}

async function queryFulfillments(
  customerAccount: CustomerAccount,
  variables: {
    orderId: string;
    first: number;
    after: string | null;
    itemsAfter?: string | null;
  },
) {
  let result;
  try {
    result = await customerAccount.query(
      CUSTOMER_ORDER_RATING_FULFILLMENTS_QUERY,
      {variables: {...variables, language: customerAccount.i18n.language}},
    );
  } catch {
    throw new RatingVerificationError('customer_api');
  }
  const order = result.data?.order;
  if (result.errors?.length || !order) {
    throw new RatingVerificationError('customer_api');
  }
  return order;
}
