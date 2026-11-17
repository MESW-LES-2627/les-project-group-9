/**
 * Pure geometry for the front-camera try-on.
 *
 * Everything works in **pixel space** (convert landmarks once with
 * `toPixelLandmarks`) so the video's aspect ratio cannot skew angles or
 * scales. Transforms assume a **top-centre anchor**; the renderer draws with:
 *
 * ```ts
 * ctx.translate(t.x, t.y);
 * ctx.rotate(t.rotation);
 * if (t.mirrored) ctx.scale(-1, 1);
 * ctx.drawImage(overlay, -t.width / 2, 0, t.width, t.height);
 * ```
 */

export type Point = {x: number; y: number};
export type Landmark = Point & {z?: number};

/**
 * MediaPipe FaceLandmarker indices used by the try-on.
 *
 * The mesh has no earlobe vertex; `earA`/`earB` are the cheek/ear-edge points
 * nearest each lobe. They are deliberately unnamed as left/right: which one is
 * far from the shopper's nose is decided per frame (see
 * `updateEarVisibility`).
 */
export const TRY_ON_LANDMARKS = {
  noseTip: 1,
  eyeA: 33,
  eyeB: 263,
  chin: 152,
  faceA: 234,
  jawA: 132,
  jawB: 361,
  faceB: 454,
  earA: 177,
  earB: 401,
} as const;

/** Average adult face width at the cheekbones, used to convert cm to pixels. */
export const FACE_WIDTH_CM = 14.5;

/** Fraction of the overlay height sunk below the lobe so the finding covers it. */
export const EAR_LOBE_SINK_RATIO = 0.12;

/** Collarbone projection below the chin, in face widths. */
export const NECKLACE_ANCHOR_RATIO = 0.62;

/** Hide the turned-away ear below this ratio between the two nose distances. */
export const EAR_HIDE_RATIO = 0.55;

/** Consecutive frames needed before an ear is hidden or shown again. */
export const EAR_HYSTERESIS_FRAMES = 3;

export const MAX_ROLL_RADIANS = (25 * Math.PI) / 180;

/**
 * MediaPipe's ordered face-oval contour (forehead, temples, jaw, chin). Used as
 * the necklace mask so the chain stays off the face but can still lie on the
 * neck; masking the whole top band would cut the chain at the jaw line.
 */
export const FACE_OVAL_LANDMARKS = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
] as const;

export const SMOOTHING_TAU_MS = 90;
export const SMOOTHING_GAP_MS = 300;
export const MAX_SCALE_STEP = 0.15;
export const MAX_JUMP_RATIO = 0.15;

/** Fraction of the frame kept free at each edge before an anchor counts as off-screen. */
export const MIN_VISIBLE = 0.02;

export type FaceMetrics = {
  /** Cheekbone-to-cheekbone distance, in pixels. */
  width: number;
  /** Head roll in radians, clamped to ±25°. */
  roll: number;
  eyeMid: Point;
};

export type OverlayTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  mirrored: boolean;
};

export type EarVisibility = {a: boolean; b: boolean};

export type EarVisibilityState = {
  a: {hidden: boolean; streak: number};
  b: {hidden: boolean; streak: number};
};

export type SmoothingState = {
  value: OverlayTransform | null;
  updatedAt: number | null;
};

export type FrameBounds = {width: number; height: number};

/** Converts normalized MediaPipe landmarks into pixel coordinates. */
export function toPixelLandmarks(
  landmarks: readonly Landmark[],
  width: number,
  height: number,
): Point[] {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;

  return landmarks.map((landmark) => ({
    x: landmark.x * safeWidth,
    y: landmark.y * safeHeight,
  }));
}

/** Face width, head roll (clamped) and eye midpoint, or `null` when landmarks are missing. */
export function faceMetrics(points: readonly Point[]): FaceMetrics | null {
  const faceA = pointAt(points, TRY_ON_LANDMARKS.faceA);
  const faceB = pointAt(points, TRY_ON_LANDMARKS.faceB);
  const eyeA = pointAt(points, TRY_ON_LANDMARKS.eyeA);
  const eyeB = pointAt(points, TRY_ON_LANDMARKS.eyeB);

  if (!faceA || !faceB || !eyeA || !eyeB) return null;

  const width = Math.hypot(faceB.x - faceA.x, faceB.y - faceA.y);
  if (!(width > 0)) return null;

  const rawRoll = Math.atan2(eyeB.y - eyeA.y, eyeB.x - eyeA.x);

  return {
    width,
    roll: clamp(rawRoll, -MAX_ROLL_RADIANS, MAX_ROLL_RADIANS),
    eyeMid: {x: (eyeA.x + eyeB.x) / 2, y: (eyeA.y + eyeB.y) / 2},
  };
}

export function createEarVisibilityState(): EarVisibilityState {
  return {
    a: {hidden: false, streak: 0},
    b: {hidden: false, streak: 0},
  };
}

/**
 * Decides which earlobe overlays to draw for one frame.
 *
 * The ear with the smaller `|earX - noseX|` is the one turned away, so it is
 * hidden once the two distances differ by more than `EAR_HIDE_RATIO`. The
 * choice is latched for `EAR_HYSTERESIS_FRAMES` frames to stop flicker, while
 * anchors that leave the frame are hidden immediately.
 */
export function updateEarVisibility(
  state: EarVisibilityState,
  input: {
    earA: Point | null;
    earB: Point | null;
    nose: Point | null;
    bounds: FrameBounds;
  },
): {state: EarVisibilityState; visibility: EarVisibility} {
  const {earA, earB, nose, bounds} = input;

  if (!nose || !earA || !earB) {
    const hidden = {hidden: true, streak: 0};
    return {
      state: {a: hidden, b: {...hidden}},
      visibility: {a: false, b: false},
    };
  }

  const visibleA = isInside(earA, bounds);
  const visibleB = isInside(earB, bounds);

  const distanceA = Math.abs(earA.x - nose.x);
  const distanceB = Math.abs(earB.x - nose.x);
  const farthest = Math.max(distanceA, distanceB);
  const ratio = farthest > 0 ? Math.min(distanceA, distanceB) / farthest : 0;
  const turned = ratio < EAR_HIDE_RATIO;

  // Tie-break towards `a`, so a fully symmetric face has a deterministic result.
  const hideA = !visibleA || (turned && distanceA <= distanceB);
  const hideB = !visibleB || (turned && distanceB < distanceA);

  const nextA = stepEar(state.a, hideA, visibleA);
  const nextB = stepEar(state.b, hideB, visibleB);

  return {
    state: {a: nextA, b: nextB},
    visibility: {a: !nextA.hidden, b: !nextB.hidden},
  };
}

/** Earring transforms for both earlobes, or `null` without usable face metrics. */
export function earTransforms(
  points: readonly Point[],
  metrics: FaceMetrics | null,
  options: {
    sizeCm: number;
    overlayAspect: number;
    visibility: EarVisibility;
  },
): {a: OverlayTransform | null; b: OverlayTransform | null} | null {
  if (!metrics) return null;

  const size = overlaySize(metrics, options.sizeCm, options.overlayAspect);
  if (!size) return null;

  const earA = pointAt(points, TRY_ON_LANDMARKS.earA);
  const earB = pointAt(points, TRY_ON_LANDMARKS.earB);
  const sink = size.height * EAR_LOBE_SINK_RATIO;

  return {
    a:
      options.visibility.a && earA
        ? {
            x: earA.x,
            y: earA.y + sink,
            width: size.width,
            height: size.height,
            rotation: metrics.roll,
            mirrored: false,
          }
        : null,
    b:
      options.visibility.b && earB
        ? {
            x: earB.x,
            y: earB.y + sink,
            width: size.width,
            height: size.height,
            rotation: metrics.roll,
            mirrored: true,
          }
        : null,
  };
}

/** Necklace transform: the overlay's centre sits on the projected collarbone. */
export function necklaceTransform(
  points: readonly Point[],
  metrics: FaceMetrics | null,
  options: {sizeCm: number; overlayAspect: number},
): OverlayTransform | null {
  if (!metrics) return null;

  const chin = pointAt(points, TRY_ON_LANDMARKS.chin);
  const size = overlaySize(metrics, options.sizeCm, options.overlayAspect);

  if (!chin || !size) return null;

  const direction = downwardDirection(metrics.eyeMid, chin);
  const drop = metrics.width * NECKLACE_ANCHOR_RATIO;

  return {
    x: chin.x + direction.x * drop,
    y: chin.y + direction.y * drop - size.height / 2,
    width: size.width,
    height: size.height,
    rotation: metrics.roll,
    mirrored: false,
  };
}

/**
 * Mask polygon for the face (MediaPipe's face oval), in pixel space. The
 * renderer subtracts it with `evenodd`, so the chain cannot paint over the
 * face while it still shows on the neck.
 */
export function headMaskPolygon(points: readonly Point[]): Point[] | null {
  const oval: Point[] = [];

  for (const index of FACE_OVAL_LANDMARKS) {
    const point = pointAt(points, index);
    if (!point) return null;
    oval.push(point);
  }

  return oval;
}

export function createSmoothingState(): SmoothingState {
  return {value: null, updatedAt: null};
}

/**
 * Exponential smoothing of an overlay transform.
 *
 * Snaps (instead of easing) on the first frame, after a >`SMOOTHING_GAP_MS`
 * pause, or when the anchor jumps by more than `MAX_JUMP_RATIO` of the face
 * width. Width changes are capped at `MAX_SCALE_STEP` per frame; the height
 * follows the target aspect ratio so the piece never stretches.
 */
export function smoothTransform(
  state: SmoothingState,
  target: OverlayTransform | null,
  options: {now: number; faceWidth: number},
): {state: SmoothingState; value: OverlayTransform | null} {
  if (!target) return {state: {value: null, updatedAt: null}, value: null};

  const previous = state.value;
  const elapsed =
    state.updatedAt === null ? Number.POSITIVE_INFINITY : options.now - state.updatedAt;
  const jump = previous
    ? Math.hypot(target.x - previous.x, target.y - previous.y)
    : Number.POSITIVE_INFINITY;
  const maxJump =
    Number.isFinite(options.faceWidth) && options.faceWidth > 0
      ? options.faceWidth * MAX_JUMP_RATIO
      : 0;

  const reset =
    !previous ||
    !Number.isFinite(elapsed) ||
    elapsed < 0 ||
    elapsed > SMOOTHING_GAP_MS ||
    jump > maxJump;

  if (reset) {
    return {state: {value: target, updatedAt: options.now}, value: target};
  }

  const alpha = 1 - Math.exp(-elapsed / SMOOTHING_TAU_MS);
  const smoothedWidth = clamp(
    previous.width + (target.width - previous.width) * alpha,
    previous.width * (1 - MAX_SCALE_STEP),
    previous.width * (1 + MAX_SCALE_STEP),
  );
  const aspect =
    target.width > 0 && target.height > 0 ? target.width / target.height : 1;

  const value: OverlayTransform = {
    x: previous.x + (target.x - previous.x) * alpha,
    y: previous.y + (target.y - previous.y) * alpha,
    width: smoothedWidth,
    height: smoothedWidth / aspect,
    rotation: lerpAngle(previous.rotation, target.rotation, alpha),
    mirrored: target.mirrored,
  };

  return {state: {value, updatedAt: options.now}, value};
}

function pointAt(points: readonly Point[], index: number): Point | null {
  const point = points[index];

  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }

  return point;
}

function stepEar(
  side: {hidden: boolean; streak: number},
  shouldHide: boolean,
  visible: boolean,
): {hidden: boolean; streak: number} {
  if (!visible) return {hidden: true, streak: 0};
  if (shouldHide === side.hidden) return {hidden: side.hidden, streak: 0};

  const streak = side.streak + 1;

  if (streak >= EAR_HYSTERESIS_FRAMES) return {hidden: shouldHide, streak: 0};

  return {hidden: side.hidden, streak};
}

function isInside(point: Point, bounds: FrameBounds): boolean {
  const minX = bounds.width * MIN_VISIBLE;
  const maxX = bounds.width * (1 - MIN_VISIBLE);
  const minY = bounds.height * MIN_VISIBLE;
  const maxY = bounds.height * (1 - MIN_VISIBLE);

  return point.x > minX && point.x < maxX && point.y > minY && point.y < maxY;
}

function overlaySize(
  metrics: FaceMetrics | null,
  sizeCm: number,
  aspect: number,
): {width: number; height: number} | null {
  if (!metrics || !(metrics.width > 0)) return null;
  if (!Number.isFinite(sizeCm) || sizeCm <= 0) return null;

  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const width = (sizeCm / FACE_WIDTH_CM) * metrics.width;

  return {width, height: width / safeAspect};
}

function downwardDirection(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (!(length > 0)) return {x: 0, y: 1};

  return {x: dx / length, y: dy / length};
}

function lerpAngle(from: number, to: number, alpha: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));

  return from + delta * alpha;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
