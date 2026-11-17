import {useEffect, useState} from 'react';
import {useTranslation} from '~/lib/i18n';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {requestCamera, type CameraAttempt} from '~/lib/try-on/camera';
import {prefersMobileUi} from '~/lib/try-on/device';
import {preloadTryOnAssets} from '~/lib/try-on/preload';
import {TryOnDialog} from '~/components/try-on/TryOnDialog';
import {TryOnQrDialog} from '~/components/try-on/TryOnQrDialog';

type Mode = 'camera' | 'photo' | 'qr';

type FittingRoomTryOnProps = {
  piece: TryOnPiece;
  title: string;
  isMobile: boolean;
  /** Absolute product URL with `?tryOn=1`, encoded in the desktop QR code. */
  tryOnLink: string;
};

/**
 * Inline try-on action for a piece in the fitting room. Phones open the camera
 * dialog, computers the QR code, mirroring the product page entry point.
 */
export function FittingRoomTryOn({
  piece,
  title,
  isMobile,
  tryOnLink,
}: FittingRoomTryOnProps) {
  const t = useTranslation();
  const [mode, setMode] = useState<Mode | null>(null);
  const [mobile] = useState(() => prefersMobileUi(isMobile));
  const [camera, setCamera] = useState<Promise<CameraAttempt> | null>(null);

  useEffect(() => {
    if (mobile) preloadTryOnAssets();
  }, [mobile]);

  function openTryOn() {
    if (!mobile) {
      setMode('qr');
      return;
    }

    // Request the camera inside the tap: iOS Safari ties getUserMedia to it.
    setCamera(requestCamera());
    setMode('camera');
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label={t('fittingRoom.tryOnPiece', {title})}
        className="underline underline-offset-4 transition-colors hover:text-ink"
        onClick={openTryOn}
        onFocus={() => preloadTryOnAssets()}
        onPointerEnter={() => preloadTryOnAssets()}
        type="button"
      >
        {t('product.tryOn')}
      </button>

      {mode === 'qr' ? (
        <TryOnQrDialog
          onClose={() => setMode(null)}
          onUpload={() => setMode('photo')}
          tryOnLink={tryOnLink}
        />
      ) : null}

      {mode === 'camera' || mode === 'photo' ? (
        <TryOnDialog
          camera={mode === 'camera' ? camera : null}
          initialMode={mode}
          onClose={() => setMode(null)}
          piece={piece}
          title={title}
        />
      ) : null}
    </>
  );
}
