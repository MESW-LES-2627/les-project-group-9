import {useState, type MouseEvent, type ReactNode} from 'react';
import {ConfirmDialog} from '~/components/shared/ConfirmDialog';
import {ALLERGY_LABELS} from '~/lib/profile/preferences';
import {useAllergenMatches} from '~/lib/profile/useAllergenMatches';

type AddToBagGuardProps = {
  allergens?: {value: string} | null;
  onProceed?: () => void;
  children: (props: {
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    loading: boolean;
  }) => ReactNode;
};

/**
 * Wraps an add-to-bag submit button and asks the shopper to confirm when the
 * product matches one of their allergies.
 *
 * `loading` must disable the wrapped button until the profile has loaded, so a
 * fast click cannot bypass the warning.
 */
export function AddToBagGuard({
  allergens,
  onProceed,
  children,
}: AddToBagGuardProps) {
  const {matches, loading} = useAllergenMatches(allergens);
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<HTMLFormElement | null>(null);

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (matches.length === 0) {
      onProceed?.();
      return;
    }

    event.preventDefault();
    setPendingForm(event.currentTarget.form);
    setWarningOpen(true);
  };

  const confirm = () => {
    const form = pendingForm;
    setPendingForm(null);
    setWarningOpen(false);
    onProceed?.();
    form?.requestSubmit();
  };

  const cancel = () => {
    setPendingForm(null);
    setWarningOpen(false);
  };

  const names = matches.map((allergen) => ALLERGY_LABELS[allergen]).join(', ');

  return (
    <>
      {children({onClick, loading})}
      <ConfirmDialog
        confirmLabel="Yes, add to bag"
        onCancel={cancel}
        onConfirm={confirm}
        open={warningOpen}
        title="Allergy warning"
      >
        This piece contains {names}, which matches your allergy profile. Do you
        want to add it to your bag anyway?
      </ConfirmDialog>
    </>
  );
}
