import {useEffect, useRef, useState, type ReactNode} from 'react';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {requestCamera, type CameraAttempt} from '~/lib/try-on/camera';
import {prefersMobileUi} from '~/lib/try-on/device';
import {preloadOverlayImage} from '~/lib/try-on/overlay';
import {preloadTryOnAssets} from '~/lib/try-on/preload';
import {currentTryOnLink} from '~/lib/try-on/url';
import {TryOnDialog} from './TryOnDialog';
import {TryOnQrDialog} from './TryOnQrDialog';

type Mode = 'camera' | 'photo' | 'qr';

type TryOnLauncherProps = {
  /** One piece on a product page, or every selected piece of a look. */
  pieces: TryOnPiece[];
  /** Product title for a single piece; omitted for a fitting-room look. */
  title?: string;
  /** Phone/tablet request, detected on the server. */
  isMobile: boolean;
  label: string;
  icon?: ReactNode;
  className: string;
  /** Open the dialog when the page is loaded with `?tryOn=1` (QR links). */
  deepLink?: boolean;
  /** Builds the absolute link encoded in the desktop QR code. */
  getTryOnLink?: (pageUrl: string) => string;
};

/**
 * Shared try-on entry point: the product page (one piece) and the fitting room
 * (a whole look) both use it. Phones open the camera dialog, computers the QR
 * dialog (with the photo fallback), and `?tryOn=1` links open the dialog after a
 * QR scan.
 */
export function TryOnLauncher({
  pieces,
  title,
  isMobile,
  label,
  icon,
  className,
  deepLink = false,
  getTryOnLink = currentTryOnLink,
}: TryOnLauncherProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [mobile] = useState(() => prefersMobileUi(isMobile));
  const [camera, setCamera] = useState<Promise<CameraAttempt> | null>(null);
  const [autoStart, setAutoStart] = useState(true);
  const [tryOnLink, setTryOnLink] = useState<string | null>(null);
  const handledDeepLink = useRef(false);
  const preloadKey = pieces.map((piece) => piece.overlayUrl).join('|');

  function preload() {
    preloadTryOnAssets();
    for (const piece of pieces) preloadOverlayImage(piece.overlayUrl);
  }

  useEffect(() => {
    if (mobile) preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, preloadKey]);

  useEffect(() => {
    if (!deepLink || handledDeepLink.current || pieces.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('tryOn') !== '1') return;

    handledDeepLink.current = true;
    // A page-load cannot use the tap gesture, so ask for a start tap instead.
    setAutoStart(false);
    setCamera(null);
    setTryOnLink(getTryOnLink(window.location.href));
    setMode(mobile ? 'camera' : 'qr');

    params.delete('tryOn');
    const query = params.toString();

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
    );
  }, [deepLink, getTryOnLink, mobile, pieces.length]);

  function openTryOn() {
    setTryOnLink(getTryOnLink(window.location.href));

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
        className={className}
        onClick={openTryOn}
        onFocus={preload}
        onPointerEnter={preload}
        type="button"
      >
        {icon}
        {label}
      </button>

      {mode === 'qr' && tryOnLink ? (
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
          pieces={pieces}
          title={title}
        />
      ) : null}
    </>
  );
}
