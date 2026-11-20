import {useId, useState, type FormEvent} from 'react';
import {useFetcher} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {StarRatingInput, StarRatingValue} from './StarRating';
import {RatingComment} from './RatingComment';
import {accountButton} from '~/lib/account-ui';
import {useTranslation, type MessageKey} from '~/lib/i18n';
import type {
  OrderRatingsView,
  ProductRatingView,
  RatingErrorCode,
} from '~/lib/ratings/ratings.server';
import type {RatingActionData} from '~/routes/api.order-ratings';

/** Endpoint that saves a rating (app/routes/api.order-ratings.tsx). */
export const RATING_ENDPOINT = '/api/order-ratings';

/** Ratings section of the order page (US-058). */
export function OrderRatings({view}: {view: OrderRatingsView}) {
  const t = useTranslation();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId}>{t('rating.heading')}</h3>
      <OrderRatingsBody view={view} />
    </section>
  );
}

/** Shown while the order's delivery and saved ratings are being checked. */
export function OrderRatingsLoading() {
  const t = useTranslation();
  return (
    <p role="status" className="text-sm text-primary">
      {t('rating.loading')}
    </p>
  );
}

const STATUS_MESSAGES = {
  unavailable: 'rating.unavailable',
  verification_error: 'rating.verificationError',
  load_error: 'rating.loadError',
} as const satisfies Record<string, MessageKey>;

function OrderRatingsBody({view}: {view: OrderRatingsView}) {
  const t = useTranslation();
  if (view.status !== 'ready') {
    return (
      <p role="status" className="text-sm text-primary">
        {t(STATUS_MESSAGES[view.status])}
      </p>
    );
  }
  if (view.products.length === 0) {
    return <p className="text-sm text-primary">{t('rating.noProducts')}</p>;
  }

  const canRate =
    view.delivered && view.products.some((product) => product.rating === null);
  return (
    <div className="space-y-4">
      <p className="text-sm text-primary">
        {view.delivered ? t('rating.intro') : t('rating.notDelivered')}
      </p>
      <ul className="divide-y divide-line border-y border-line">
        {view.products.map((product) => (
          <li
            key={product.productId}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:gap-5"
          >
            <ProductSummary product={product} />
            <div className="min-w-0 flex-1">
              {product.rating !== null ? (
                <>
                  <StarRatingValue value={product.rating} />
                  <RatingComment
                    orderId={view.orderId}
                    productId={product.productId}
                    productTitle={product.title}
                    comment={product.comment}
                  />
                </>
              ) : canRate ? (
                <ProductRatingForm orderId={view.orderId} product={product} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductSummary({product}: {product: ProductRatingView}) {
  return (
    <div className="flex items-center gap-3 sm:w-64">
      {product.image && (
        <Image
          data={product.image}
          width={56}
          height={56}
          className="size-14 shrink-0 object-cover"
        />
      )}
      <p className="text-sm text-ink">{product.title}</p>
    </div>
  );
}

const ERROR_MESSAGES: Partial<Record<RatingErrorCode, MessageKey>> = {
  already_rated: 'rating.error.alreadyRated',
  unauthenticated: 'rating.error.signIn',
  not_delivered: 'rating.notDelivered',
  verification_unavailable: 'rating.verificationError',
  ratings_unavailable: 'rating.unavailable',
};

/** Message key for a failed save; unknown or technical errors share one text. */
export function ratingErrorMessage(error: RatingErrorCode): MessageKey {
  return ERROR_MESSAGES[error] ?? 'rating.error.save';
}

/**
 * Star picker and submit button for one product. Once saved (or if the server
 * reports an existing rating) it is replaced by the read-only value.
 */
export function ProductRatingForm({
  orderId,
  product,
}: {
  orderId: string;
  product: ProductRatingView;
}) {
  const t = useTranslation();
  const finalNoteId = useId();
  const fetcher = useFetcher<RatingActionData>();
  const [value, setValue] = useState<number | null>(null);
  const pending = fetcher.state !== 'idle';
  const result = fetcher.data;

  if (result && !('error' in result)) {
    return (
      <div className="space-y-1">
        <StarRatingValue value={result.rating} />
        <p role="status" className="text-sm text-primary">
          {t('rating.saved')}
        </p>
        <RatingComment
          orderId={orderId}
          productId={product.productId}
          productTitle={product.title}
          comment={null}
        />
      </div>
    );
  }
  if (result?.error === 'already_rated' && result.rating !== undefined) {
    return (
      <div className="space-y-1">
        <StarRatingValue value={result.rating} />
        <p role="status" className="text-sm text-primary">
          {t('rating.error.alreadyRated')}
        </p>
      </div>
    );
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value === null || pending) return;
    void fetcher.submit(
      {orderId, productId: product.productId, rating: value},
      {method: 'POST', action: RATING_ENDPOINT, encType: 'application/json'},
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2" aria-busy={pending}>
      <StarRatingInput
        name={`rating-${product.productId}`}
        legend={t('rating.legend', {product: product.title})}
        describedBy={finalNoteId}
        value={value}
        onChange={setValue}
        disabled={pending}
      />
      <p id={finalNoteId} className="text-xs text-primary">
        {t('rating.final')}
      </p>
      <button
        type="submit"
        className={accountButton}
        disabled={value === null || pending}
      >
        {pending ? t('rating.submitting') : t('rating.submit')}
      </button>
      <p role="status" className="text-sm text-red-800">
        {result && 'error' in result ? t(ratingErrorMessage(result.error)) : null}
      </p>
    </form>
  );
}
