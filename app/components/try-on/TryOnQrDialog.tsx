import {useTranslation} from '~/lib/i18n';
import {secureTryOnLink} from '~/lib/try-on/url';
import {Dialog, dialogButton} from '~/components/shared/Dialog';
import {QrCode} from '~/components/shared/QrCode';

type TryOnQrDialogProps = {
  onClose: () => void;
  /** Absolute link to this product page with `?tryOn=1`. */
  tryOnLink: string;
  /** Opens the still-photo try-on on this device. */
  onUpload: () => void;
};

/**
 * Desktop affordance: a QR code the shopper scans with their phone, plus a
 * plain link and the still-photo fallback for camera-less desktops.
 */
export function TryOnQrDialog({
  onClose,
  tryOnLink,
  onUpload,
}: TryOnQrDialogProps) {
  const t = useTranslation();
  const link = secureTryOnLink(tryOnLink);

  return (
    <Dialog
      bodyClassName="mt-3 space-y-4"
      className="max-w-sm p-6"
      footer={
        <>
          <button
            className={dialogButton.secondary}
            onClick={onUpload}
            type="button"
          >
            {t('tryOn.upload')}
          </button>
          <button
            className={dialogButton.primary}
            onClick={onClose}
            type="button"
          >
            {t('nav.close')}
          </button>
        </>
      }
      onClose={onClose}
      open
      title={t('tryOn.qrTitle')}
    >
      <p className="text-sm leading-7 text-primary">{t('tryOn.qrHelp')}</p>

      <div className="flex justify-center bg-white p-3">
        <QrCode
          className="h-56 w-56"
          label={t('tryOn.qrTitle')}
          value={link}
        />
      </div>

      <a
        className="inline-block text-xs uppercase tracking-widest text-ink underline underline-offset-4"
        href={link}
      >
        {t('tryOn.openLink')}
      </a>

      <p className="text-xs leading-6 text-primary">{t('tryOn.privacy')}</p>
    </Dialog>
  );
}
