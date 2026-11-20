import {describe, expect, it} from 'vitest';
import {
  commentLength,
  MAX_COMMENT_LENGTH,
  normalizeComment,
  parseCommentSubmission,
} from '~/lib/ratings/comment';
import {commentHandle, ratingHandle} from '~/lib/ratings/rating';

const ORDER = 'gid://shopify/Order/500';
const PRODUCT = 'gid://shopify/Product/11';
const submit = (comment: unknown) =>
  parseCommentSubmission({orderId: ORDER, productId: PRODUCT, comment});

describe('stored handles', () => {
  // Known SHA-256 of `customerId|orderId|productId`. If this changes, every
  // saved rating and comment becomes unreachable, so it must never change.
  const key = {
    customerId: 'gid://shopify/Customer/1',
    orderId: ORDER,
    productId: PRODUCT,
  };
  const DIGEST = '9e87eac9fea06da157a268c8fde8a45d5fa316deb8258ebc926f247b618af72b';

  it('keeps the rating handle of US-058', async () => {
    expect(await ratingHandle(key)).toBe(`rating-${DIGEST}`);
  });

  it('gives each rating exactly one comment handle', async () => {
    expect(await commentHandle(key)).toBe(`comment-${DIGEST}`);
  });
});

describe('parseCommentSubmission', () => {
  it('accepts a comment and trims it', () => {
    expect(submit('  Lovely ring, true to size.  ')).toEqual({
      submission: {orderId: ORDER, productId: PRODUCT, comment: 'Lovely ring, true to size.'},
    });
  });

  it.each([
    ['empty', ''],
    ['only spaces and line breaks', ' \n\t \r\n '],
    ['only control characters', '\u0000\u0007\u001B'],
    ['missing', undefined],
    ['null', null],
  ])('rejects an %s comment as empty', (_name, comment) => {
    expect(submit(comment)).toEqual({error: 'empty_comment'});
  });

  it('accepts exactly the maximum length and rejects one more character', () => {
    const longest = 'a'.repeat(MAX_COMMENT_LENGTH);
    expect(submit(longest)).toEqual({
      submission: {orderId: ORDER, productId: PRODUCT, comment: longest},
    });
    expect(submit(`${longest}a`)).toEqual({error: 'comment_too_long'});
  });

  it('counts an emoji as one character', () => {
    const emoji = '💎'; // two UTF-16 units, one character
    expect(commentLength(emoji)).toBe(1);
    expect(submit(emoji.repeat(MAX_COMMENT_LENGTH))).toMatchObject({submission: {}});
    expect(submit(emoji.repeat(MAX_COMMENT_LENGTH + 1))).toEqual({error: 'comment_too_long'});
  });

  it('measures the length after trimming', () => {
    expect(submit(`   ${'a'.repeat(MAX_COMMENT_LENGTH)}   `)).toMatchObject({submission: {}});
  });

  it('normalises line breaks and removes control characters but keeps tabs', () => {
    expect(normalizeComment('Line one\r\nLine two\rLine\u0000 three\tend')).toBe(
      'Line one\nLine two\nLine three\tend',
    );
  });

  it.each([42, true, ['text'], {text: 'x'}])('rejects a non-text comment (%j)', (comment) => {
    expect(submit(comment)).toEqual({error: 'invalid_payload'});
  });

  it.each([null, 'comment=hi', [1]])('rejects a malformed body (%j)', (body) => {
    expect(parseCommentSubmission(body)).toEqual({error: 'invalid_payload'});
  });

  it('rejects IDs that are not order and product GIDs', () => {
    expect(
      parseCommentSubmission({orderId: '500', productId: PRODUCT, comment: 'Hi'}),
    ).toEqual({error: 'invalid_order'});
    expect(
      parseCommentSubmission({orderId: ORDER, productId: 'gid://shopify/ProductVariant/1', comment: 'Hi'}),
    ).toEqual({error: 'invalid_product'});
  });

  it('ignores customer IDs, ratings and status sent by the browser', () => {
    expect(
      parseCommentSubmission({
        orderId: ORDER,
        productId: PRODUCT,
        comment: 'Great',
        customerId: 'gid://shopify/Customer/999',
        rating: 5,
        status: 'ACTIVE',
      }),
    ).toEqual({submission: {orderId: ORDER, productId: PRODUCT, comment: 'Great'}});
  });
});
