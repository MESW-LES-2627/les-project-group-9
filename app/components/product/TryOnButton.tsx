import {useEffect, useRef, useState} from 'react';
import {useTranslation} from '~/lib/i18n';
import {Icon} from '~/components/shared/Icon';
import {TryOnDialog} from '~/components/try-on/TryOnDialog';
import {TryOnQrDialog} from '~/components/try-on/TryOnQrDialog';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {requestCamera, type CameraAttempt} from '~/lib/try-on/camera';
import {prefersMobileUi} from '~/lib/try-on/device';
import {preloadTryOnAssets} from '~/lib/try-on/preload';

type Mode = 'camera' | 'photo' | 'qr';

type TryOnButtonProps = {
  piece: TryOnPiece;
  title: string;
  /** Phone/tablet request, detected on the server from the user agent. */
  isMobile: boolean;
  /** Absolute product URL with `?tryOn=1`, encoded in the desktop QR code. */
  tryOnLink: string;
};

/**
 * Product-page entry point for the front-camera try-on. Phones open the camera
 * dialog, computers show a QR code (and can upload a photo instead), and a
 * `?tryOn=1` link opens the same dialog after a QR scan.
 */
export function TryOnButton({
  piece,
  title,
  isMobile,
  tryOnLink,
}: TryOnButtonProps) {
  const t = useTranslation();
  const [mode, setMode] = useState<Mode | null>(null);
  const [mobile] = useState(() => prefersMobileUi(isMobile));
  const [camera, setCamera] = useState<Promise<CameraAttempt> | null>(null);
  const [autoStart, setAutoStart] = useState(true);
  const handledDeepLink = useRef(false);

  useEffect(() => {
    if (mobile) preloadTryOnAssets();
  }, [mobile]);

  useEffect(() => {
    if (handledDeepLink.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('tryOn') !== '1') return;

    handledDeepLink.current = true;
    // A page-load cannot use the tap gesture, so ask for a start tap instead.
    setAutoStart(false);
    setCamera(null);
    setMode(mobile ? 'camera' : 'qr');

    params.delete('tryOn');
    const query = params.toString();

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
    );
  }, [mobile]);

  function openTryOn() {
    if (!mobile) {
      setMode('qr');
      return;
    }

    // Request the camera inside the tap: iOS Safari ties getUserMedia to it.
    setAutoStart(true);
    setCamera(requestCamera());
    setMode('camera');
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="flex min-h-[44px] w-full items-center justify-center gap-2 border border-ink px-6 text-xs font-medium uppercase tracking-widest text-ink transition-colors hover:bg-ink hover:text-white"
        onClick={openTryOn}
        onFocus={() => preloadTryOnAssets()}
        onPointerEnter={() => preloadTryOnAssets()}
        type="button"
      >
        <Icon name="camera" size={18} />
        {t('product.tryOn')}
      </button>
      <p className="mt-2 text-center text-[11px] leading-5 text-primary">
        {t('product.tryOnHint')}
      </p>

      {mode === 'qr' ? (
        <TryOnQrDialog
          onClose={() => setMode(null)}
          onUpload={() => setMode('photo')}
          tryOnLink={tryOnLink}
        />
      ) : null}

      {mode === 'camera' || mode === 'photo' ? (
        <TryOnDialog
          autoStart={autoStart}
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
