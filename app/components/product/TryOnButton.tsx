import {useTranslation} from '~/lib/i18n';
import {Icon} from '~/components/shared/Icon';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {TryOnLauncher} from '~/components/try-on/TryOnLauncher';

type TryOnButtonProps = {
  piece: TryOnPiece;
  title: string;
  /** Phone/tablet request, detected on the server from the user agent. */
  isMobile: boolean;
};

/**
 * Product-page entry point for the front-camera try-on. Phones open the camera
 * dialog, computers show a QR code (and can upload a photo instead), and a
 * `?tryOn=1` link opens the same dialog after a QR scan.
 */
export function TryOnButton({piece, title, isMobile}: TryOnButtonProps) {
  const t = useTranslation();

  return (
    <TryOnLauncher
      className="flex min-h-[44px] w-full items-center justify-center gap-2 border border-line px-6 text-xs font-medium uppercase tracking-widest text-ink transition-colors hover:border-bark hover:bg-bark hover:text-paper"
      deepLink
      icon={<Icon name="camera" size={18} />}
      isMobile={isMobile}
      label={t('product.tryOn')}
      pieces={[piece]}
      title={title}
    />
  );
}
