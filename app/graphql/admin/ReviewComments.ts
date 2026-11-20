// Shopify Admin API documents for US-059/US-060 rating comments
// (`product_review_comment` metaobjects, publishable: DRAFT until the team
// publishes them in the Shopify admin). No Admin codegen project exists, so
// response shapes are typed and validated by hand in
// app/lib/ratings/comment-store.server.ts.
//
// Unlike ratings, comments are editable: they are written with
// `metaobjectUpsert`, always back to DRAFT.

const COMMENT_FIELDS = `
  id
  handle
  updatedAt
  capabilities {
    publishable {
      status
    }
  }
  fields {
    key
    value
  }
`;

/** Requires `write_metaobjects`. Creates or replaces the comment under one handle. */
export const ADMIN_COMMENT_UPSERT_MUTATION = `
  mutation ReviewCommentUpsert(
    $handle: MetaobjectHandleInput!
    $metaobject: MetaobjectUpsertInput!
  ) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject {
        ${COMMENT_FIELDS}
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

/** Requires `read_metaobjects`. One aliased `metaobjectByHandle` per handle. */
export function adminCommentsByHandleQuery(count: number): string {
  const variables = Array.from(
    {length: count},
    (_, index) => `$h${index}: MetaobjectHandleInput!`,
  ).join(', ');
  const selections = Array.from(
    {length: count},
    (_, index) =>
      `r${index}: metaobjectByHandle(handle: $h${index}) {${COMMENT_FIELDS}}`,
  ).join('\n');
  return `query ReviewCommentsByHandle(${variables}) {\n${selections}\n}`;
}

/**
 * Requires `read_metaobjects`. A product's comments, newest first. `$query`
 * filters on `fields.product_id`, which must be marked filterable in the
 * definition (docs/architecture.md → Shopify setup).
 */
export const ADMIN_PRODUCT_COMMENTS_QUERY = `
  query ProductReviewComments($type: String!, $query: String!, $after: String) {
    metaobjects(
      type: $type
      query: $query
      first: 250
      after: $after
      sortKey: "updated_at"
      reverse: true
    ) {
      nodes {
        ${COMMENT_FIELDS}
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
