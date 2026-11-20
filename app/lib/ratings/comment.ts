import {isProductGid} from '~/lib/profile/list-schema';
import {isOrderGid} from './rating';

/** Longest comment a shopper can save, in characters (Unicode code points). */
export const MAX_COMMENT_LENGTH = 1000;

/** Moderation state of a saved comment (Shopify publishable status). */
export type CommentStatus = 'in_review' | 'published';

export type CommentSubmission = {
  orderId: string;
  productId: string;
  comment: string;
};

export type CommentSubmissionError =
  | 'invalid_payload'
  | 'invalid_order'
  | 'invalid_product'
  | 'empty_comment'
  | 'comment_too_long';

// C0/C1 control characters except tab and line feed.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

/**
 * Normalises comment text the same way on the client and the server: line
 * breaks become `\n`, control characters are removed and surrounding
 * whitespace is trimmed.
 */
export function normalizeComment(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(CONTROL_CHARACTERS, '').trim();
}

/** Length as the shopper sees it: an emoji counts as one character. */
export function commentLength(text: string): number {
  return [...text].length;
}

/** Validation code for normalised comment text, or `null` when it can be saved. */
export function commentError(
  text: string,
): 'empty_comment' | 'comment_too_long' | null {
  if (text === '') return 'empty_comment';
  if (commentLength(text) > MAX_COMMENT_LENGTH) return 'comment_too_long';
  return null;
}

/**
 * Validates the JSON body of a comment submission (US-059). Only the order,
 * product and text are read; identity and the right to comment are resolved
 * on the server.
 */
export function parseCommentSubmission(
  body: unknown,
): {submission: CommentSubmission} | {error: CommentSubmissionError} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {error: 'invalid_payload'};
  }
  const {orderId, productId, comment} = body as Record<string, unknown>;
  if (!isOrderGid(orderId)) return {error: 'invalid_order'};
  if (!isProductGid(productId)) return {error: 'invalid_product'};
  if (comment !== undefined && comment !== null && typeof comment !== 'string') {
    return {error: 'invalid_payload'};
  }
  const text = normalizeComment(comment ?? '');
  const error = commentError(text);
  if (error) return {error};
  return {submission: {orderId, productId, comment: text}};
}
