import {useTranslation} from '~/lib/i18n';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {lookTryOnLink} from '~/lib/try-on/url';
import {TryOnLauncher} from '~/components/try-on/TryOnLauncher';

type FittingRoomLookTryOnProps = {
  /** Selected pieces that actually have an overlay. */
  pieces: TryOnPiece[];
  /** Their variant ids, encoded in the desktop QR link. */
  ids: string[];
  /** Phone/tablet request, detected on the server. */
  isMobile: boolean;
};

/**
 * Opens the whole selected look in one try-on session. Phones use the camera,
 * computers get the QR code plus the photo fallback.
 */
export function FittingRoomLookTryOn({
  pieces,
  ids,
  isMobile,
}: FittingRoomLookTryOnProps) {
  const t = useTranslation();

  return (
    <TryOnLauncher
      className="inline-flex min-h-11 w-full items-center justify-center bg-primary px-6 text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-bark"
      deepLink
      getTryOnLink={(pageUrl) => lookTryOnLink(pageUrl, ids)}
      isMobile={isMobile}
      label={t('fittingRoom.tryOnLook')}
      pieces={pieces}
    />
  );
}
