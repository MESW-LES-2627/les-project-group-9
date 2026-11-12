import {useState, type MouseEvent, type ReactNode} from 'react';
import {ConfirmDialog} from '~/components/shared/ConfirmDialog';
import {formatList, useLocale, useTranslation} from '~/lib/i18n';
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
  const t = useTranslation();
  const {tag} = useLocale();
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

  const names = formatList(
    matches.map((allergen) => t(`allergen.${allergen}`)),
    tag,
  );

  return (
    <>
      {children({onClick, loading})}
      <ConfirmDialog
        confirmLabel={t('allergy.confirm')}
        onCancel={cancel}
        onConfirm={confirm}
        open={warningOpen}
        title={t('allergy.title')}
      >
        {t('allergy.message', {allergens: names})}
      </ConfirmDialog>
    </>
  );
}
