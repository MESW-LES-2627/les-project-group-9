import {Money} from '~/components/shared/Money';
import {useTranslation} from '~/lib/i18n';
import type {MoneyAmount} from '~/lib/personalization';

/** Add-on price shown in a row or section header: +€35, Included or −€35. */
export function PriceDelta({
  price,
  className = '',
}: {
  price: MoneyAmount | null;
  className?: string;
}) {
  const t = useTranslation();
  if (!price) return null;

  const amount = Number(price.amount);
  if (!Number.isFinite(amount)) return null;

  if (amount === 0) {
    return (
      <span className={className}>{t('product.customize.included')}</span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {amount > 0 ? '+' : '−'}
      <Money
        as="span"
        withoutTrailingZeros
        data={{
          amount: Math.abs(amount).toFixed(2),
          currencyCode: price.currencyCode,
        }}
      />
    </span>
  );
}
