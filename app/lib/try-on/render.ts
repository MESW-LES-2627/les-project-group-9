import type {OverlayTransform, Point} from './anchors';

export type FrameOverlay = {
  transform: OverlayTransform;
  /** Clip the overlay behind the face (necklaces). */
  masked: boolean;
};

export type DrawOverlaysOptions = {
  /** The piece drawn on top of the preview. */
  overlay: CanvasImageSource;
  overlays: FrameOverlay[];
  /** Head polygon from `headMaskPolygon`, in pixel space. */
  headMask: Point[] | null;
  /** The preview is mirrored (front camera); uploaded photos are not. */
  mirror: boolean;
  sourceWidth: number;
  sourceHeight: number;
  /** Set to `false` when the source was drawn just before. */
  clear?: boolean;
};

/**
 * Draws the piece(s) on a transparent canvas. The camera preview is a real
 * `<video>` element, so only the overlay is painted here.
 */
export function drawOverlays(
  context: CanvasRenderingContext2D,
  options: DrawOverlaysOptions,
): void {
  const {sourceWidth: width, sourceHeight: height, mirror} = options;

  context.save();

  if (options.clear !== false) {
    context.clearRect(0, 0, width, height);
  }

  for (const {transform, masked} of options.overlays) {
    context.save();

    if (masked && options.headMask) {
      context.beginPath();
      context.rect(0, 0, width, height);
      tracePolygon(context, options.headMask, mirror, width);
      context.clip('evenodd');
    }

    context.translate(
      mirror ? width - transform.x : transform.x,
      transform.y,
    );
    context.rotate(mirror ? -transform.rotation : transform.rotation);

    if (mirror ? !transform.mirrored : transform.mirrored) {
      context.scale(-1, 1);
    }

    context.drawImage(
      options.overlay,
      -transform.width / 2,
      0,
      transform.width,
      transform.height,
    );
    context.restore();
  }

  context.restore();
}

export type DrawFrameOptions = DrawOverlaysOptions & {
  /** Video frame or decoded photo, drawn under the overlays. */
  source: CanvasImageSource;
};

/**
 * Draws a still frame (photo): the source first, then the overlays.
 */
export function drawTryOnFrame(
  context: CanvasRenderingContext2D,
  options: DrawFrameOptions,
): void {
  const {source, sourceWidth: width, sourceHeight: height, mirror} = options;

  context.save();
  context.clearRect(0, 0, width, height);

  if (mirror) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(source, 0, 0, width, height);
  context.restore();

  drawOverlays(context, {...options, clear: false});
}

function tracePolygon(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  mirror: boolean,
  width: number,
): void {
  points.forEach((point, index) => {
    const x = mirror ? width - point.x : point.x;

    if (index === 0) context.moveTo(x, point.y);
    else context.lineTo(x, point.y);
  });

  context.closePath();
}
