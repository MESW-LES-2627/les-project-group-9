import type {ReactNode} from 'react';
import {useTranslation} from '~/lib/i18n';
import {Dialog, dialogButton} from './Dialog';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const t = useTranslation();

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button
            className={dialogButton.secondary}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            className={dialogButton.primary}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
