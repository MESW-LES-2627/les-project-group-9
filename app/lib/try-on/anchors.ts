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

/**
 * Average adult shoulder (biacromial) width. MediaPipe's FaceLandmarker has no
 * shoulder landmarks, so shoulder width is estimated from the face
 * (`SHOULDER_TO_FACE_RATIO`); the ratio keeps the scale identical to a
 * face-width calculation while letting the necklace be sized against shoulders.
 */
export const SHOULDER_WIDTH_CM = 38;
export const SHOULDER_TO_FACE_RATIO = SHOULDER_WIDTH_CM / FACE_WIDTH_CM;

/**
 * Extra outward push from the cheek edge (landmarks 177/401) to the actual
 * earlobe, in face widths. The mesh has no lobe vertex, so the anchors sit a
 * little inside the ear; this scales the correction with each shopper's face.
 */
export const EAR_OUTWARD_RATIO = 0.04;

/**
 * Upward lift from the cheek/ear-edge vertex to the lobe, in face widths, along
 * the face's vertical axis. The mesh has no lobe vertex and the cheek point sits
 * below it, so this raises the earring independently of its size or aspect.
 */
export const EAR_LOBE_LIFT_RATIO = 0.03;

/**
 * Neck-base drop below the chin, in face widths. The necklace's **top centre**
 * is anchored there (midpoint of the neck/collarbone), so the chain arcs around
 * the neck instead of hanging from the chest.
 */
export const NECK_BASE_DROP_RATIO = 0.18;

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

/** How long the last overlay is kept when the face is briefly lost. */
export const TRACKING_GRACE_MS = 250;

/** Newest-first weights for the short position buffer (3 samples ≈ 66 ms). */
export const ANCHOR_BUFFER_WEIGHTS = [0.5, 0.3, 0.2] as const;

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

export type AnchorBuffer = {
  size: number;
  /** Oldest first. */
  samples: OverlayTransform[];
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

  const earA = earAnchor(points, TRY_ON_LANDMARKS.earA, metrics);
  const earB = earAnchor(points, TRY_ON_LANDMARKS.earB, metrics);

  return {
    a:
      options.visibility.a && earA
        ? {
            x: earA.x,
            y: earA.y,
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
            y: earB.y,
            width: size.width,
            height: size.height,
            rotation: metrics.roll,
            mirrored: true,
          }
        : null,
  };
}

/**
 * Necklace transform: the overlay's **top centre** sits on the estimated neck
 * base (below the chin), and its size is derived from the shopper's estimated
 * shoulder width, so it stays correct near/far and when turning.
 */
export function necklaceTransform(
  points: readonly Point[],
  metrics: FaceMetrics | null,
  options: {sizeCm: number; overlayAspect: number},
): OverlayTransform | null {
  if (!metrics) return null;

  const chin = pointAt(points, TRY_ON_LANDMARKS.chin);
  const size = overlaySize(
    metrics,
    options.sizeCm,
    options.overlayAspect,
    {width: shoulderWidthPx(metrics.width), cm: SHOULDER_WIDTH_CM},
  );

  if (!chin || !size) return null;

  const direction = downwardDirection(metrics.eyeMid, chin);
  const drop = metrics.width * NECK_BASE_DROP_RATIO;

  return {
    x: chin.x + direction.x * drop,
    y: chin.y + direction.y * drop,
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

/** Estimated shoulder width in pixels (see `SHOULDER_TO_FACE_RATIO`). */
export function shoulderWidthPx(faceWidth: number): number {
  return faceWidth * SHOULDER_TO_FACE_RATIO;
}

export function createSmoothingState(): SmoothingState {
  return {value: null, updatedAt: null};
}

export function createAnchorBuffer(size = ANCHOR_BUFFER_WEIGHTS.length): AnchorBuffer {
  return {size, samples: []};
}

/**
 * Short weighted buffer for the anchor (x, y, size, rotation). Single-frame
 * landmark spikes are averaged out while the newest sample still dominates, so
 * the necklace does not lag behind the head.
 */
export function bufferTransform(
  buffer: AnchorBuffer,
  transform: OverlayTransform,
): {buffer: AnchorBuffer; transform: OverlayTransform} {
  const samples = [...buffer.samples, transform].slice(-buffer.size);
  const next: AnchorBuffer = {size: buffer.size, samples};

  if (samples.length === 1) return {buffer: next, transform};

  const newestFirst = [...samples].reverse();
  const weights = ANCHOR_BUFFER_WEIGHTS.slice(0, newestFirst.length);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const weighted = (pick: (sample: OverlayTransform) => number) =>
    newestFirst.reduce(
      (sum, sample, index) => sum + pick(sample) * weights[index],
      0,
    ) / total;
  const sin = weighted((sample) => Math.sin(sample.rotation));
  const cos = weighted((sample) => Math.cos(sample.rotation));

  return {
    buffer: next,
    transform: {
      x: weighted((sample) => sample.x),
      y: weighted((sample) => sample.y),
      width: weighted((sample) => sample.width),
      height: weighted((sample) => sample.height),
      rotation: Math.atan2(sin, cos),
      mirrored: transform.mirrored,
    },
  };
}

/**
 * Exponential smoothing of an overlay transform.
 *
 * Snaps on the first frame or after a >`SMOOTHING_GAP_MS` pause (tracking was
 * lost). A large jump within the stream is **clamped** instead of snapping, so
 * a one-frame landmark spike makes the piece catch up smoothly rather than
 * teleport. Width changes are capped at `MAX_SCALE_STEP` per frame.
 */
export function smoothTransform(
  state: SmoothingState,
  target: OverlayTransform | null,
  options: {now: number; faceWidth: number; tauMs?: number},
): {state: SmoothingState; value: OverlayTransform | null} {
  if (!target) return {state: {value: null, updatedAt: null}, value: null};

  const previous = state.value;
  const elapsed =
    state.updatedAt === null
      ? Number.POSITIVE_INFINITY
      : options.now - state.updatedAt;

  const reset =
    !previous ||
    !Number.isFinite(elapsed) ||
    elapsed < 0 ||
    elapsed > SMOOTHING_GAP_MS;

  if (reset) {
    return {state: {value: target, updatedAt: options.now}, value: target};
  }

  const maxJump =
    Number.isFinite(options.faceWidth) && options.faceWidth > 0
      ? options.faceWidth * MAX_JUMP_RATIO
      : 0;
  const jump = Math.hypot(target.x - previous.x, target.y - previous.y);
  const limited =
    maxJump > 0 && jump > maxJump
      ? {
          ...target,
          x: previous.x + ((target.x - previous.x) / jump) * maxJump,
          y: previous.y + ((target.y - previous.y) / jump) * maxJump,
        }
      : target;

  const alpha =
    1 - Math.exp(-elapsed / (options.tauMs ?? SMOOTHING_TAU_MS));
  const smoothedWidth = clamp(
    previous.width + (limited.width - previous.width) * alpha,
    previous.width * (1 - MAX_SCALE_STEP),
    previous.width * (1 + MAX_SCALE_STEP),
  );
  const aspect =
    limited.width > 0 && limited.height > 0
      ? limited.width / limited.height
      : 1;

  const value: OverlayTransform = {
    x: previous.x + (limited.x - previous.x) * alpha,
    y: previous.y + (limited.y - previous.y) * alpha,
    width: smoothedWidth,
    height: smoothedWidth / aspect,
    rotation: lerpAngle(previous.rotation, limited.rotation, alpha),
    mirrored: limited.mirrored,
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

/**
 * Earlobe anchor: the cheek/ear-edge vertex pushed slightly outwards along the
 * face's lateral axis and lifted along its vertical axis, both by a fraction of
 * the shopper's face width. Using the face axes (not the centre-to-ear vector)
 * keeps the correction anatomical, and the face width makes it scale with
 * distance and head turn.
 */
function earAnchor(
  points: readonly Point[],
  earIndex: number,
  metrics: FaceMetrics,
): Point | null {
  const ear = pointAt(points, earIndex);
  const faceA = pointAt(points, TRY_ON_LANDMARKS.faceA);
  const faceB = pointAt(points, TRY_ON_LANDMARKS.faceB);
  const chin = pointAt(points, TRY_ON_LANDMARKS.chin);

  if (!ear) return null;
  if (!faceA || !faceB || !(metrics.width > 0)) return ear;

  const dx = faceB.x - faceA.x;
  const dy = faceB.y - faceA.y;
  const length = Math.hypot(dx, dy);

  if (!(length > 0)) return ear;

  const lateral = {x: dx / length, y: dy / length};
  const centre = {x: (faceA.x + faceB.x) / 2, y: (faceA.y + faceB.y) / 2};
  const side =
    Math.sign(
      (ear.x - centre.x) * lateral.x + (ear.y - centre.y) * lateral.y,
    ) || 1;
  const offset = metrics.width * EAR_OUTWARD_RATIO * side;

  const vertical = chin
    ? unitVector(metrics.eyeMid, chin)
    : {x: 0, y: 1};
  const lift = metrics.width * EAR_LOBE_LIFT_RATIO;

  return {
    x: ear.x + lateral.x * offset - vertical.x * lift,
    y: ear.y + lateral.y * offset - vertical.y * lift,
  };
}

/** Unit vector from `from` to `to`, pointing down the face (eye midpoint → chin). */
function unitVector(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (!(length > 0)) return {x: 0, y: 1};

  return {x: dx / length, y: dy / length};
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
  reference?: {width: number; cm: number},
): {width: number; height: number} | null {
  if (!metrics || !(metrics.width > 0)) return null;
  if (!Number.isFinite(sizeCm) || sizeCm <= 0) return null;

  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const referenceWidth = reference?.width ?? metrics.width;
  const referenceCm = reference?.cm ?? FACE_WIDTH_CM;
  const width = (sizeCm / referenceCm) * referenceWidth;

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
