import type {TryOnKind} from './catalog';
import {
  EAR_HYSTERESIS_FRAMES,
  TRY_ON_LANDMARKS,
  earTransforms,
  faceMetrics,
  headMaskPolygon,
  necklaceTransform,
  shoulderWidthPx,
  updateEarVisibility,
  type EarVisibilityState,
  type FrameBounds,
  type Point,
} from './anchors';
import type {FrameOverlay} from './render';

export type FrameSlot = 'earA' | 'earB' | 'necklace';

/** The necklace anchor needs a longer filter than an earlobe. */
export const NECKLACE_SMOOTHING_TAU_MS = 130;

export type PlannedOverlay = FrameOverlay & {
  /** Piece id (variant GID). */
  id: string;
  slot: FrameSlot;
  /**
   * Reference width in pixels for the smoothing jump threshold: the face width
   * for earrings, the estimated shoulder width for the necklace.
   */
  referenceWidth: number;
};

export type TryOnFramePlan = {
  overlays: PlannedOverlay[];
  /** Head polygon for masked overlays, in pixel space. */
  headMask: Point[] | null;
  earState: EarVisibilityState;
};

/** One piece of the look, with the overlay's decoded aspect ratio. */
export type PlanFramePiece = {
  id: string;
  kind: TryOnKind;
  sizeCm: number;
  /** Overlay natural width / height. */
  overlayAspect: number;
};

export type PlanFrameInput = {
  /** Pixel-space landmarks from FaceLandmarker. */
  points: readonly Point[];
  pieces: readonly PlanFramePiece[];
  bounds: FrameBounds;
  earState: EarVisibilityState;
  /** Photos have no next frame: apply the ear hysteresis immediately. */
  instant?: boolean;
};

/**
 * Turns one set of landmarks into the overlays of a whole look. Returns `null`
 * when no face (or no usable chin/ear points) is available, so the caller keeps
 * drawing the bare camera frame.
 *
 * Necklaces are planned first (longest first, so shorter chains sit on top) and
 * earrings last. Multiple earrings of the same ear are stacked upwards in the
 * order the shopper selected them.
 */
export function planFrame(input: PlanFrameInput): TryOnFramePlan | null {
  const metrics = faceMetrics(input.points);
  if (!metrics) return null;

  const necklaces = input.pieces
    .filter((piece) => piece.kind === 'necklace')
    .sort((a, b) => b.sizeCm - a.sizeCm);
  const earrings = input.pieces.filter((piece) => piece.kind === 'earring');
  const overlays: PlannedOverlay[] = [];

  const headMask = necklaces.length ? headMaskPolygon(input.points) : null;
  const shoulderReference = shoulderWidthPx(metrics.width);

  for (const piece of necklaces) {
    const transform = necklaceTransform(input.points, metrics, {
      sizeCm: piece.sizeCm,
      overlayAspect: piece.overlayAspect,
    });

    if (transform) {
      overlays.push({
        id: piece.id,
        slot: 'necklace',
        transform,
        masked: true,
        referenceWidth: shoulderReference,
      });
    }
  }

  if (!earrings.length) {
    return {overlays, headMask, earState: input.earState};
  }

  const earA = pointOrNull(input.points, TRY_ON_LANDMARKS.earA);
  const earB = pointOrNull(input.points, TRY_ON_LANDMARKS.earB);
  const nose = pointOrNull(input.points, TRY_ON_LANDMARKS.noseTip);
  const visibility = earVisibilityFor(input, earA, earB, nose);

  earrings.forEach((piece, stackIndex) => {
    const transforms = earTransforms(input.points, metrics, {
      sizeCm: piece.sizeCm,
      overlayAspect: piece.overlayAspect,
      visibility: visibility.visibility,
      stackIndex,
    });

    if (!transforms) return;

    if (transforms.a) {
      overlays.push({
        id: piece.id,
        slot: 'earA',
        transform: transforms.a,
        masked: false,
        referenceWidth: metrics.width,
      });
    }
    if (transforms.b) {
      overlays.push({
        id: piece.id,
        slot: 'earB',
        transform: transforms.b,
        masked: false,
        referenceWidth: metrics.width,
      });
    }
  });

  return {overlays, headMask, earState: visibility.earState};
}

function earVisibilityFor(
  input: PlanFrameInput,
  earA: Point | null,
  earB: Point | null,
  nose: Point | null,
): {earState: EarVisibilityState; visibility: {a: boolean; b: boolean}} {
  const frames = input.instant ? EAR_HYSTERESIS_FRAMES : 1;
  let state = input.earState;
  let visibility = {a: !state.a.hidden, b: !state.b.hidden};

  for (let frame = 0; frame < frames; frame += 1) {
    const result = updateEarVisibility(state, {
      earA,
      earB,
      nose,
      bounds: input.bounds,
    });
    state = result.state;
    visibility = result.visibility;
  }

  return {earState: state, visibility};
}

function pointOrNull(points: readonly Point[], index: number): Point | null {
  const point = points[index];

  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }

  return point;
}
