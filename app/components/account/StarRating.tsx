import {RATING_VALUES} from '~/lib/ratings/rating';
import {useTranslation} from '~/lib/i18n';

type StarRatingInputProps = {
  /** Radio group name; unique per product on the page. */
  name: string;
  /** Visible group label, e.g. "Your rating for Aurora ring". */
  legend: string;
  /** ID of an element that explains the group (e.g. ratings are final). */
  describedBy?: string;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
};

/**
 * 1–5 star picker built as a native radio group: arrow keys move between
 * stars, each star is a 44px target and the focused star is outlined.
 */
export function StarRatingInput({
  name,
  legend,
  describedBy,
  value,
  onChange,
  disabled = false,
}: StarRatingInputProps) {
  const t = useTranslation();
  return (
    <fieldset aria-describedby={describedBy} disabled={disabled}>
      <legend className="text-sm text-ink">{legend}</legend>
      <div className="mt-1 flex flex-wrap">
        {RATING_VALUES.map((star) => (
          <label
            key={star}
            className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center text-primary has-[:disabled]:cursor-not-allowed has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-primary"
          >
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <StarIcon filled={value !== null && star <= value} />
            <span className="sr-only">{t('rating.star', {count: star})}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Read-only stars plus a visible text that says the same thing (the stars are
 * hidden from screen readers). `value` is the number of filled stars; `label`
 * defaults to the customer's own rating ("Your rating: 4 out of 5").
 */
export function StarRatingValue({value, label}: {value: number; label?: string}) {
  const t = useTranslation();
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
      <span className="inline-flex text-primary" aria-hidden="true">
        {RATING_VALUES.map((star) => (
          <StarIcon key={star} filled={star <= value} />
        ))}
      </span>
      <span>{label ?? t('rating.yours', {value})}</span>
    </p>
  );
}

function StarIcon({filled}: {filled: boolean}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M12 2.8l2.84 5.76 6.36.92-4.6 4.49 1.09 6.33L12 17.31l-5.69 2.99 1.09-6.33-4.6-4.49 6.36-.92z" />
    </svg>
  );
}
