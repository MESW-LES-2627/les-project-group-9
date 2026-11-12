import type {ElementType} from 'react';
import {formatMoney, useLocale} from '~/lib/i18n';

type MoneyProps = {
  /** Shopify `MoneyV2` (optimistic cart data may still be partial). */
  data: {amount?: string | null; currencyCode?: string | null};
  /** Drops ",00" on whole amounts ("€100" instead of "€100.00"). */
  withoutTrailingZeros?: boolean;
  /** Wrapper element; `div` like Hydrogen's `<Money>`, so layouts keep their flow. */
  as?: ElementType;
  className?: string;
};

/**
 * A price formatted for the active language. Replaces Hydrogen's `<Money>`,
 * whose locale comes from a `<ShopifyProvider>` this app does not render, so
 * it always formatted as en-US. The currency always comes from Shopify.
 */
export function Money({
  data,
  withoutTrailingZeros = false,
  as: Wrapper = 'div',
  className,
}: MoneyProps) {
  const {tag} = useLocale();
  if (!data.amount || !data.currencyCode) return null;

  return (
    <Wrapper className={className}>
      {formatMoney(
        {amount: data.amount, currencyCode: data.currencyCode},
        tag,
        {withoutTrailingZeros},
      )}
    </Wrapper>
  );
}
