import {ProductBadge} from '~/components/product/ProductBadge';
import {useAllergenMatches} from '~/lib/profile/useAllergenMatches';
import {useTranslation} from '~/lib/i18n';

type AllergenBadgeProps = {
  allergens?: {value: string} | null;
  className?: string;
};

/** Yellow warning badge shown when a product matches the shopper's allergies. */
export function AllergenBadge({allergens, className}: AllergenBadgeProps) {
  const {matches} = useAllergenMatches(allergens);
  const t = useTranslation();

  if (!matches.length) return null;

  return (
    <ProductBadge
      className={className}
      tone="warning"
      value={t('product.allergenBadge')}
    />
  );
}
