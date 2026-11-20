import {useId} from 'react';
import {Link} from 'react-router';
import {StarRatingValue} from '~/components/account/StarRating';
import {formatDate, formatNumber, useLocale, useTranslation} from '~/lib/i18n';
import type {PublicComment} from '~/lib/ratings/comment-store.server';
import type {ProductReviewsView} from '~/lib/ratings/product-reviews.server';
import {filledStars, type RatingSummary} from '~/lib/ratings/reviews';

const SECTION = 'mt-20 border-t border-line pt-10';

/** Reviews section of the product page (US-060). */
export function ProductReviews({view}: {view: ProductReviewsView}) {
  const t = useTranslation();
  const headingId = useId();
  return (
    <section className={SECTION} aria-labelledby={headingId}>
      <h2 id={headingId} className="font-display text-2xl">
        {t('reviews.heading')}
      </h2>
      <div className="mt-6">
        <ReviewsBody view={view} />
      </div>
    </section>
  );
}

/** Shown while the product's reviews load. */
export function ProductReviewsLoading() {
  const t = useTranslation();
  return (
    <section className={SECTION}>
      <p role="status" className="text-sm text-primary">
        {t('reviews.loading')}
      </p>
    </section>
  );
}

function ReviewsBody({view}: {view: ProductReviewsView}) {
  const t = useTranslation();
  if (view.status === 'unavailable' || view.status === 'error') {
    return (
      <p role="status" className="text-sm text-primary">
        {t(view.status === 'error' ? 'reviews.error' : 'reviews.unavailable')}
      </p>
    );
  }
  if (view.summary.count === 0) return <EmptyReviews />;
  return (
    <div className="space-y-8">
      <ReviewSummary summary={view.summary} />
      <ReviewComments comments={view.comments} />
    </div>
  );
}

function EmptyReviews() {
  const t = useTranslation();
  return (
    <div className="space-y-3 text-sm text-primary">
      <p>{t('reviews.empty')}</p>
      <Link
        to="/account/orders"
        className="inline-flex min-h-[44px] items-center underline underline-offset-4 hover:text-bark"
      >
        {t('reviews.emptyLink')}
      </Link>
    </div>
  );
}

function ReviewSummary({summary}: {summary: RatingSummary}) {
  const t = useTranslation();
  const {tag} = useLocale();
  if (summary.average === null) return null;
  const average = formatNumber(summary.average, tag);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <StarRatingValue
        value={filledStars(summary.average)}
        label={t('reviews.average', {average})}
      />
      <p className="text-sm text-primary">
        {t('reviews.count', {count: summary.count})}
      </p>
    </div>
  );
}

function ReviewComments({comments}: {comments: PublicComment[]}) {
  const t = useTranslation();
  const {tag} = useLocale();
  const headingId = useId();
  if (comments.length === 0) {
    return <p className="text-sm text-primary">{t('reviews.noComments')}</p>;
  }
  return (
    <div>
      <h3 id={headingId} className="font-display text-xl">
        {t('reviews.commentsHeading')}
      </h3>
      <ul aria-labelledby={headingId} className="mt-4 divide-y divide-line border-y border-line">
        {comments.map((comment, index) => (
          // Comments have no public ID (it would identify the record), and the
          // list is rendered once per load, so the position is a stable key.
          // eslint-disable-next-line react/no-array-index-key
          <li key={index} className="space-y-2 py-5">
            <StarRatingValue
              value={comment.rating}
              label={t('reviews.commentRating', {value: comment.rating})}
            />
            <p className="whitespace-pre-line break-words text-sm leading-7 text-ink">
              {comment.text}
            </p>
            <p className="text-xs uppercase tracking-wider text-primary">
              {t('reviews.verifiedBuyer')}
              {' · '}
              <time dateTime={comment.date}>{formatDate(comment.date, tag)}</time>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
