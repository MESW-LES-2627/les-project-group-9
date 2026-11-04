import {matchingAllergens, parseProductAllergens} from '~/lib/allergens';
import {ALLERGY_LABELS} from '~/lib/profile/preferences';
import {useProfile} from '~/lib/profile/ProfileProvider';

type AllergenWarningProps = {
  allergens?: {value: string} | null;
  compact?: boolean;
};

/**
 * Warns the logged-in shopper when a piece contains one of their allergens.
 *
 * Renders nothing for guests or products without matching allergens. The
 * shopper's preferences come from the shared profile context, so the warning
 * updates as soon as they save new allergies.
 */
export function AllergenWarning({
  allergens,
  compact = false,
}: AllergenWarningProps) {
  const {preferences} = useProfile();

  const matches = matchingAllergens(
    parseProductAllergens(allergens?.value),
    preferences?.allergies,
  );

  if (!matches.length) return null;

  const names = matches.map((allergen) => ALLERGY_LABELS[allergen]).join(', ');

  return (
    <p
      className={
        compact
          ? 'mt-2 inline-block bg-amber-100 px-2 py-1 text-[10px] uppercase tracking-widest text-amber-900'
          : 'mt-4 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900'
      }
    >
      {compact
        ? `Contains ${names}`
        : `Contains ${names} — matches your allergy profile`}
    </p>
  );
}
