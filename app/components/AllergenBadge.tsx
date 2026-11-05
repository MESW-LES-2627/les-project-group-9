import {ProductBadge} from '~/components/ProductBadge';
import {useAllergenMatches} from '~/lib/profile/useAllergenMatches';

type AllergenBadgeProps = {
  allergens?: {value: string} | null;
  className?: string;
};

/** Yellow warning badge shown when a product matches the shopper's allergies. */
export function AllergenBadge({allergens, className}: AllergenBadgeProps) {
  const {matches} = useAllergenMatches(allergens);

  if (!matches.length) return null;

  return <ProductBadge className={className} tone="warning" value="Allergen" />;
}
