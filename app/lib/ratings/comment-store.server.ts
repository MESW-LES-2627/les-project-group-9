import {
  ADMIN_COMMENT_UPSERT_MUTATION,
  ADMIN_PRODUCT_COMMENTS_QUERY,
  adminCommentsByHandleQuery,
} from '~/graphql/admin/ReviewComments';
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
import {
  commentError,
  type CommentStatus,
} from './comment';
import {commentHandle, isRatingValue, type RatingKey} from './rating';
import {fieldsMatchKey, readByHandles} from './rating-store.server';

/** Metaobject definition type that holds comments (docs/architecture.md → Rating comments). */
export const COMMENT_METAOBJECT_TYPE = 'product_review_comment';

/** Pages of comments read for a product page before giving up. */
const MAX_COMMENT_PAGES = 4;

/** The signed-in customer's own comment, as the order page shows it. */
export type StoredComment = {
  text: string;
  status: CommentStatus;
};

/** A published comment as shown to every shopper: no customer or order IDs. */
export type PublicComment = {
  rating: number;
  text: string;
  /** ISO date of the last edit (the version that was published). */
  date: string;
};

/** Persistence boundary for rating comments. */
export interface CommentStore {
  /** Reads the customer's comment for each key, in order (`null` when none). */
  findComments(keys: RatingKey[]): Promise<Array<StoredComment | null>>;
  /**
   * Creates or replaces the comment for a rating and sends it (back) to
   * review: it is saved as a draft until the team publishes it.
   */
  saveComment(key: RatingKey, rating: number, text: string): Promise<StoredComment>;
  /** A product's published comments, newest first, at most `limit`. */
  listPublished(productId: string, limit: number): Promise<PublicComment[]>;
}

/** Creates the Shopify-backed comment store, or `null` when it is not configured. */
export function createCommentStore(
  env: RatingStoreEnv,
  fetchImpl: typeof fetch = fetch,
  tokenCache?: AccessTokenCache,
): CommentStore | null {
  const client = createAdminClient(env, fetchImpl, tokenCache);
  return client ? new ShopifyCommentStore(client) : null;
}

/**
 * Comments as private `product_review_comment` metaobjects with Shopify's
 * active/draft status as the review state: every save writes DRAFT, the team
 * sets ACTIVE in the Shopify admin, and only ACTIVE comments are public.
 */
export class ShopifyCommentStore implements CommentStore {
  constructor(private readonly client: AdminClient) {}

  async findComments(keys: RatingKey[]): Promise<Array<StoredComment | null>> {
    const handles = await Promise.all(keys.map(commentHandle));
    const nodes = await readByHandles(
      this.client,
      COMMENT_METAOBJECT_TYPE,
      handles,
      adminCommentsByHandleQuery,
    );
    return nodes.map((node, index) =>
      node ? toStoredComment(node, handles[index], keys[index]) : null,
    );
  }

  async saveComment(
    key: RatingKey,
    rating: number,
    text: string,
  ): Promise<StoredComment> {
    if (!isRatingValue(rating) || commentError(text)) {
      throw new RatingStoreError('invalid_comment');
    }
    const handle = await commentHandle(key);
    const data = await this.client.request<{
      metaobjectUpsert: {
        metaobject: MetaobjectNode | null;
        userErrors: AdminUserError[];
      } | null;
    }>(ADMIN_COMMENT_UPSERT_MUTATION, {
      handle: {type: COMMENT_METAOBJECT_TYPE, handle},
      metaobject: {
        fields: [
          {key: 'customer_id', value: key.customerId},
          {key: 'order_id', value: key.orderId},
          {key: 'product_id', value: key.productId},
          {key: 'rating', value: String(rating)},
          {key: 'comment', value: text},
        ],
        capabilities: {publishable: {status: 'DRAFT'}},
      },
    });

    logUserErrors('metaobjectUpsert', data.metaobjectUpsert?.userErrors ?? []);
    const saved = data.metaobjectUpsert?.metaobject;
    if (!saved) throw new RatingStoreError('save_rejected');
    const comment = toStoredComment(saved, handle, key);
    // An edit must never stay public before the team reviews it again.
    if (comment.status !== 'in_review' || comment.text !== text) {
      throw new RatingStoreError('save_mismatch');
    }
    return comment;
  }

  async listPublished(productId: string, limit: number): Promise<PublicComment[]> {
    const comments: PublicComment[] = [];
    let after: string | null = null;
    for (let page = 0; page < MAX_COMMENT_PAGES; page++) {
      const data: {
        metaobjects: {
          nodes: MetaobjectNode[];
          pageInfo: {hasNextPage: boolean; endCursor: string | null};
        };
      } = await this.client.request(ADMIN_PRODUCT_COMMENTS_QUERY, {
        type: COMMENT_METAOBJECT_TYPE,
        query: productFieldQuery(productId),
        after,
      });
      for (const node of data.metaobjects.nodes) {
        const comment = toPublicComment(node, productId);
        if (comment) comments.push(comment);
        if (comments.length >= limit) return comments;
      }
      const {hasNextPage, endCursor} = data.metaobjects.pageInfo;
      if (!hasNextPage || !endCursor) return comments;
      after = endCursor;
    }
    // Older published comments beyond these pages are simply not shown.
    return comments;
  }
}

function statusOf(node: MetaobjectNode): CommentStatus {
  return node.capabilities?.publishable?.status === 'ACTIVE'
    ? 'published'
    : 'in_review';
}

function toStoredComment(
  node: MetaobjectNode,
  handle: string,
  key: RatingKey,
): StoredComment {
  const fields = fieldMap(node);
  const text = fields.get('comment');
  if (node.handle !== handle || !fieldsMatchKey(fields, key) || !text) {
    throw new RatingStoreError('record_mismatch');
  }
  return {text, status: statusOf(node)};
}

/**
 * A published comment for the product page, or `null` for drafts and for
 * records that do not belong to the product or are incomplete (skipped, so
 * one bad entry does not hide the others).
 */
function toPublicComment(
  node: MetaobjectNode,
  productId: string,
): PublicComment | null {
  if (statusOf(node) !== 'published') return null;
  const fields = fieldMap(node);
  const rating = Number(fields.get('rating'));
  const text = fields.get('comment');
  if (
    fields.get('product_id') !== productId ||
    !isRatingValue(rating) ||
    !text ||
    !node.updatedAt
  ) {
    return null;
  }
  return {rating, text, date: node.updatedAt};
}
