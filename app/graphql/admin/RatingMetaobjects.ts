// Shopify Admin API documents for US-058 rating records (`product_rating`
// metaobjects). There is no Admin codegen project in .graphqlrc.ts, so these
// strings carry no `#graphql` tag and their response shapes are typed and
// validated by hand in app/lib/ratings/rating-store.server.ts.
//
// Only create, read-by-handle, delete-of-a-just-created-duplicate and the
// per-product star listing (US-060) are used.
// `metaobjectUpsert` and `metaobjectUpdate` are deliberately absent: a saved
// rating is immutable.

const RATING_FIELDS = `
  id
  handle
  fields {
    key
    value
  }
`;

/** Requires `write_metaobjects`. */
export const ADMIN_RATING_CREATE_MUTATION = `
  mutation RatingCreate($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        ${RATING_FIELDS}
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

/**
 * Requires `write_metaobjects`. Only used to remove a record this request just
 * created under a different handle than the one it asked for.
 */
export const ADMIN_RATING_DELETE_MUTATION = `
  mutation RatingDuplicateDelete($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
        code
      }
    }
  }
`;

/**
 * Requires `read_metaobjects`. Every rating of one product, for the public
 * average (US-060). Only the product and star fields are selected: customer
 * and order IDs never leave Shopify on this path. `$query` filters on
 * `fields.product_id`, which must be marked filterable in the definition.
 */
export const ADMIN_PRODUCT_RATINGS_QUERY = `
  query ProductRatings($type: String!, $query: String!, $after: String) {
    metaobjects(type: $type, query: $query, first: 250, after: $after) {
      nodes {
        productId: field(key: "product_id") {
          value
        }
        rating: field(key: "rating") {
          value
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Requires `read_metaobjects`. One aliased `metaobjectByHandle` per handle, so
 * a page reads exactly the records it is entitled to and nothing else.
 */
export function adminRatingsByHandleQuery(count: number): string {
  const variables = Array.from(
    {length: count},
    (_, index) => `$h${index}: MetaobjectHandleInput!`,
  ).join(', ');
  const selections = Array.from(
    {length: count},
    (_, index) =>
      `r${index}: metaobjectByHandle(handle: $h${index}) {${RATING_FIELDS}}`,
  ).join('\n');
  return `query RatingsByHandle(${variables}) {\n${selections}\n}`;
}
