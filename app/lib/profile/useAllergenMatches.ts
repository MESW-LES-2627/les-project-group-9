import {useMemo} from 'react';
import {
  matchingAllergens,
  parseProductAllergens,
  type Allergen,
} from '~/lib/allergens';
import {useProfile} from './ProfileProvider';

/**
 * Allergens shared by a product and the logged-in shopper's profile.
 *
 * `loading` is exposed so buyers cannot add an item before the profile request
 * finishes and silently skip the warning.
 */
export function useAllergenMatches(allergens?: {value: string} | null): {
  matches: Allergen[];
  loading: boolean;
} {
  const {preferences, status} = useProfile();

  const matches = useMemo(
    () =>
      matchingAllergens(
        parseProductAllergens(allergens?.value),
        preferences?.allergies,
      ),
    [allergens?.value, preferences?.allergies],
  );

  return {matches, loading: status === 'loading'};
}
