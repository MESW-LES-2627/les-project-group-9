import {isRatingValue} from './rating';

/** Public summary of a product's verified ratings (US-060). */
export type RatingSummary = {
  /** Mean of all ratings rounded to one decimal; `null` when there are none. */
  average: number | null;
  count: number;
};

/**
 * Summarises star values for the product page. Values outside 1–5 are
 * ignored, so one malformed record cannot skew the average.
 */
export function summarizeRatings(values: readonly number[]): RatingSummary {
  const valid = values.filter(isRatingValue);
  if (valid.length === 0) return {average: null, count: 0};
  const total = valid.reduce((sum, value) => sum + value, 0);
  return {
    average: Math.round((total / valid.length) * 10) / 10,
    count: valid.length,
  };
}

/** Whole stars to fill when showing an average (4.3 → 4, 4.5 → 5). */
export function filledStars(average: number): number {
  return Math.min(5, Math.max(0, Math.round(average)));
}
