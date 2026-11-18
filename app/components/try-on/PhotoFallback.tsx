import {useCallback, useEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import {useTranslation, type MessageKey} from '~/lib/i18n';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import {
  createEarVisibilityState,
  toPixelLandmarks,
} from '~/lib/try-on/anchors';
import type {FaceDetector} from '~/lib/try-on/face-landmarker';
import {planFrame} from '~/lib/try-on/frame';
import {drawTryOnFrame} from '~/lib/try-on/render';
import {decodePhoto, validatePhotoFile} from '~/lib/try-on/upload';
import {StatusMessage} from './StatusMessage';

const MAX_RENDER_WIDTH = 1080;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;

type Adjust = {dx: number; dy: number; scale: number};

const NO_ADJUST: Adjust = {dx: 0, dy: 0, scale: 1};

type PhotoFallbackProps = {
  detector: FaceDetector;
  overlay: HTMLImageElement;
  overlayAspect: number;
  piece: Pick<TryOnPiece, 'kind' | 'sizeCm'>;
  title: string;
};

/**
 * Still-photo try-on for desktops and for shoppers who deny the camera. The
 * photo never leaves the browser. Automatic placement can miss (different
 * pose, crop or necklace length), so the piece can be dragged, resized with
 * the buttons or nudged with the arrow keys; reset returns to the face-based
 * placement.
 */
export function PhotoFallback({
  detector,
  overlay,
  overlayAspect,
  piece,
  title,
}: PhotoFallbackProps) {
  const t = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const planRef = useRef<ReturnType<typeof planFrame>>(null);
  const sizeRef = useRef({width: 0, height: 0});
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [message, setMessage] = useState<MessageKey | null>(null);
  const [adjust, setAdjust] = useState<Adjust>(NO_ADJUST);

  const draw = useCallback(
    (next: Adjust) => {
      const canvas = canvasRef.current;
      const bitmap = bitmapRef.current;
      if (!canvas || !bitmap) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const plan = planRef.current;
      const {width, height} = sizeRef.current;
      const overlays = (plan?.overlays ?? []).map(({transform, masked}) => {
        const scaledWidth = transform.width * next.scale;
        const scaledHeight = transform.height * next.scale;
        // Necklaces are centred on the collarbone; keep that centre fixed while
        // resizing so the piece grows evenly around the anchor.
        const centeringOffset =
          piece.kind === 'necklace'
            ? (scaledHeight - transform.height) / 2
            : 0;

        return {
          masked,
          transform: {
            ...transform,
            x: transform.x + next.dx * width,
            y: transform.y + next.dy * height - centeringOffset,
            width: scaledWidth,
            height: scaledHeight,
          },
        };
      });

      drawTryOnFrame(context, {
        source: bitmap,
        sourceWidth: width,
        sourceHeight: height,
        overlay,
        overlays,
        headMask: plan?.headMask ?? null,
        mirror: false,
      });
    },
    [overlay, piece.kind],
  );

  useEffect(() => {
    draw(adjust);
  }, [adjust, draw]);

  useEffect(
    () => () => {
      bitmapRef.current?.close();
      bitmapRef.current = null;
    },
    [],
  );

  async function handleFile(file: File) {
    if (validatePhotoFile(file)) {
      setMessage('tryOn.uploadError');
      return;
    }

    setBusy(true);
    setMessage(null);

    let bitmap: ImageBitmap | null = null;

    try {
      bitmap = await decodePhoto(file);
      const points = await detector.detectImage(bitmap);
      const width = Math.min(bitmap.width, MAX_RENDER_WIDTH);
      const height = Math.round((bitmap.height / bitmap.width) * width);
      const canvas = canvasRef.current;

      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }

      const plan = points
        ? planFrame({
            points: toPixelLandmarks(points, width, height),
            kind: piece.kind,
            sizeCm: piece.sizeCm,
            overlayAspect,
            bounds: {width, height},
            earState: createEarVisibilityState(),
            instant: true,
          })
        : null;

      bitmapRef.current?.close();
      bitmapRef.current = bitmap;
      planRef.current = plan;
      sizeRef.current = {width, height};

      setHasPhoto(true);
      setAdjust(NO_ADJUST);
      draw(NO_ADJUST);
      setMessage(
        points && (plan?.overlays.length ?? 0) > 0
          ? null
          : 'tryOn.photoNoFace',
      );
    } catch {
      bitmap?.close();
      setMessage('tryOn.uploadError');
    } finally {
      setBusy(false);
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!hasPhoto) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: adjust.dx,
      dy: adjust.dy,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    setAdjust((current) => ({
      ...current,
      dx: drag.dx + (event.clientX - drag.startX) / rect.width,
      dy: drag.dy + (event.clientY - drag.startY) / rect.height,
    }));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function resize(step: number) {
    setAdjust((current) => ({
      ...current,
      scale: clamp(current.scale + step, MIN_SCALE, MAX_SCALE),
    }));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const step = event.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];

    if (!move) return;

    event.preventDefault();
    setAdjust((current) => ({
      ...current,
      dx: current.dx + move[0],
      dy: current.dy + move[1],
    }));
  }

  const interactive = hasPhoto && planRef.current !== null;

  return (
    <div className="space-y-3">
      <canvas
        aria-label={t('tryOn.preview', {title})}
        className={
          hasPhoto
            ? 'block h-auto w-full cursor-grab touch-none bg-secondary'
            : 'hidden h-auto w-full bg-secondary'
        }
        onKeyDown={onKeyDown}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={canvasRef}
        role="img"
        tabIndex={hasPhoto ? 0 : -1}
      />

      {!hasPhoto ? (
        <p className="text-sm leading-7 text-primary">
          {t('tryOn.uploadHint')}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              aria-label={t('tryOn.smaller')}
              className="min-h-[44px] min-w-[44px] border border-line px-3 text-sm text-ink disabled:opacity-40"
              disabled={!interactive}
              onClick={() => resize(-SCALE_STEP)}
              type="button"
            >
              −
            </button>
            <button
              aria-label={t('tryOn.larger')}
              className="min-h-[44px] min-w-[44px] border border-line px-3 text-sm text-ink disabled:opacity-40"
              disabled={!interactive}
              onClick={() => resize(SCALE_STEP)}
              type="button"
            >
              +
            </button>
            <button
              className="min-h-[44px] border border-line px-4 text-[11px] uppercase tracking-widest text-primary hover:border-bark disabled:opacity-40"
              disabled={!interactive}
              onClick={() => setAdjust(NO_ADJUST)}
              type="button"
            >
              {t('tryOn.reset')}
            </button>
          </div>
          <p className="text-xs leading-6 text-primary">
            {t('tryOn.adjustHint')}
          </p>
        </>
      )}

      <label className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center border border-ink px-6 text-xs uppercase tracking-widest text-ink transition-colors hover:bg-bark hover:text-white">
        <input
          accept="image/*"
          capture="user"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void handleFile(file);
          }}
          type="file"
        />
        {hasPhoto ? t('tryOn.replacePhoto') : t('tryOn.upload')}
      </label>

      {busy ? <StatusMessage message={t('tryOn.loading')} /> : null}
      {message ? (
        <StatusMessage message={t(message)} tone="error" />
      ) : (
        <StatusMessage message={null} />
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
