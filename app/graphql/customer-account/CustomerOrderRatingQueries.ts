// Order data for US-058 ratings: line items (grouped by product) and the
// fulfilment evidence used to decide whether the whole order was delivered.
// Both connections are paginated by app/lib/ratings/order-eligibility.server.ts.
// https://shopify.dev/docs/api/customer/latest/objects/Order

export const CUSTOMER_ORDER_RATING_LINES_QUERY = `#graphql
  query OrderRatingLines(
    $orderId: ID!
    $after: String
    $language: LanguageCode
  ) @inContext(language: $language) {
    customer {
      id
    }
    order(id: $orderId) {
      id
      fulfillmentStatus
      lineItems(first: 100, after: $after) {
        nodes {
          id
          productId
          quantity
          title
          image {
            url
            altText
            width
            height
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
` as const;

export const CUSTOMER_ORDER_RATING_FULFILLMENTS_QUERY = `#graphql
  query OrderRatingFulfillments(
    $orderId: ID!
    $first: Int!
    $after: String
    $itemsAfter: String
    $language: LanguageCode
  ) @inContext(language: $language) {
    order(id: $orderId) {
      id
      fulfillments(first: $first, after: $after) {
        edges {
          cursor
          node {
            id
            status
            latestShipmentStatus
            fulfillmentLineItems(first: 100, after: $itemsAfter) {
              nodes {
                quantity
                lineItem {
                  id
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
` as const;
