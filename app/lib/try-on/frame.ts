import type {TryOnKind} from './catalog';
import {
  EAR_HYSTERESIS_FRAMES,
  TRY_ON_LANDMARKS,
  earTransforms,
  faceMetrics,
  headMaskPolygon,
  necklaceTransform,
  updateEarVisibility,
  type EarVisibilityState,
  type FrameBounds,
  type Point,
} from './anchors';
import type {FrameOverlay} from './render';

export type FrameOverlayId = 'earA' | 'earB' | 'necklace';

export type PlannedOverlay = FrameOverlay & {id: FrameOverlayId};

export type TryOnFramePlan = {
  overlays: PlannedOverlay[];
  /** Head polygon for masked overlays, in pixel space. */
  headMask: Point[] | null;
  /** Cheekbone width in pixels, used to size the smoothing jump threshold. */
  faceWidth: number;
  earState: EarVisibilityState;
};

export type PlanFrameInput = {
  /** Pixel-space landmarks from FaceLandmarker. */
  points: readonly Point[];
  kind: TryOnKind;
  sizeCm: number;
  /** Overlay natural width / height. */
  overlayAspect: number;
  bounds: FrameBounds;
  earState: EarVisibilityState;
  /** Photos have no next frame: apply the ear hysteresis immediately. */
  instant?: boolean;
};

/**
 * Turns one set of landmarks into overlays. Returns `null` when no face (or no
 * usable chin/ear points) is available, so the caller keeps drawing the bare
 * camera frame.
 */
export function planFrame(input: PlanFrameInput): TryOnFramePlan | null {
  const metrics = faceMetrics(input.points);
  if (!metrics) return null;

  if (input.kind === 'necklace') {
    const transform = necklaceTransform(input.points, metrics, {
      sizeCm: input.sizeCm,
      overlayAspect: input.overlayAspect,
    });

    if (!transform) return null;

    return {
      overlays: [{id: 'necklace', transform, masked: true}],
      headMask: headMaskPolygon(input.points),
      faceWidth: metrics.width,
      earState: input.earState,
    };
  }

  const earA = pointOrNull(input.points, TRY_ON_LANDMARKS.earA);
  const earB = pointOrNull(input.points, TRY_ON_LANDMARKS.earB);
  const nose = pointOrNull(input.points, TRY_ON_LANDMARKS.noseTip);

  const visibility = earVisibilityFor(input, earA, earB, nose);
  const transforms = earTransforms(input.points, metrics, {
    sizeCm: input.sizeCm,
    overlayAspect: input.overlayAspect,
    visibility: visibility.visibility,
  });

  if (!transforms) return null;

  const overlays: PlannedOverlay[] = [];

  if (transforms.a) {
    overlays.push({id: 'earA', transform: transforms.a, masked: false});
  }
  if (transforms.b) {
    overlays.push({id: 'earB', transform: transforms.b, masked: false});
  }

  return {
    overlays,
    headMask: null,
    faceWidth: metrics.width,
    earState: visibility.earState,
  };
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
