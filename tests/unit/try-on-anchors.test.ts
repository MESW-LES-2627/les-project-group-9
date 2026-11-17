import {describe, expect, it} from 'vitest';
import {
  EAR_HYSTERESIS_FRAMES,
  EAR_LOBE_SINK_RATIO,
  FACE_WIDTH_CM,
  MAX_ROLL_RADIANS,
  NECKLACE_ANCHOR_RATIO,
  SMOOTHING_GAP_MS,
  TRY_ON_LANDMARKS,
  createEarVisibilityState,
  createSmoothingState,
  earTransforms,
  faceMetrics,
  headMaskPolygon,
  necklaceTransform,
  smoothTransform,
  toPixelLandmarks,
  updateEarVisibility,
  type EarVisibilityState,
  type OverlayTransform,
  type Point,
} from '../../app/lib/try-on/anchors';

const BOUNDS = {width: 640, height: 480};

/** A frontal face in a 640×480 frame: 320 px from cheek to cheek, no roll. */
const BASE: Record<number, Point> = {
  [TRY_ON_LANDMARKS.noseTip]: {x: 320, y: 270},
  [TRY_ON_LANDMARKS.eyeA]: {x: 280, y: 200},
  [TRY_ON_LANDMARKS.eyeB]: {x: 360, y: 200},
  [TRY_ON_LANDMARKS.chin]: {x: 320, y: 400},
  [TRY_ON_LANDMARKS.faceA]: {x: 140, y: 240},
  [TRY_ON_LANDMARKS.faceB]: {x: 460, y: 240},
  [TRY_ON_LANDMARKS.jawA]: {x: 180, y: 330},
  [TRY_ON_LANDMARKS.jawB]: {x: 460, y: 330},
  [TRY_ON_LANDMARKS.earA]: {x: 80, y: 250},
  [TRY_ON_LANDMARKS.earB]: {x: 560, y: 250},
};

function landmarks(overrides: Record<number, Point> = {}): Point[] {
  const points = Array.from({length: 478}, (): Point => ({x: 320, y: 240}));
  const merged = {...BASE, ...overrides};

  for (const [index, point] of Object.entries(merged)) {
    points[Number(index)] = point;
  }

  return points;
}

const VISIBLE = {a: true, b: true};

function transform(overrides: Partial<OverlayTransform> = {}): OverlayTransform {
  return {
    x: 100,
    y: 100,
    width: 100,
    height: 50,
    rotation: 0,
    mirrored: false,
    ...overrides,
  };
}

describe('toPixelLandmarks', () => {
  it('scales normalised landmarks into the frame', () => {
    expect(toPixelLandmarks([{x: 0.5, y: 0.5}], 640, 480)).toEqual([
      {x: 320, y: 240},
    ]);
  });

  it('degrades to zero without a usable frame size', () => {
    expect(toPixelLandmarks([{x: 0.25, y: 0.75}], 0, Number.NaN)).toEqual([
      {x: 0, y: 0},
    ]);
  });
});

describe('faceMetrics', () => {
  it('measures the cheekbone width and the eye midpoint', () => {
    const metrics = faceMetrics(landmarks());

    expect(metrics?.width).toBeCloseTo(320);
    expect(metrics?.roll).toBeCloseTo(0);
    expect(metrics?.eyeMid).toEqual({x: 320, y: 200});
  });

  it('derives the head roll from the eye line and clamps it', () => {
    const level = faceMetrics(landmarks());
    expect(level?.roll).toBeCloseTo(0);

    const tilted = faceMetrics(
      landmarks({[TRY_ON_LANDMARKS.eyeB]: {x: 360, y: 240}}),
    );
    expect(tilted?.roll).toBeCloseTo(MAX_ROLL_RADIANS);
  });

  it('returns null when the landmarks cannot describe a face', () => {
    expect(faceMetrics([])).toBe(null);
    expect(
      faceMetrics(landmarks({[TRY_ON_LANDMARKS.eyeB]: {x: Number.NaN, y: 200}})),
    ).toBe(null);
    expect(
      faceMetrics(landmarks({[TRY_ON_LANDMARKS.faceB]: {x: 140, y: 240}})),
    ).toBe(null);
  });
});

describe('updateEarVisibility', () => {
  it('starts with both ears visible on a frontal face', () => {
    const {visibility} = updateEarVisibility(createEarVisibilityState(), {
      earA: {x: 80, y: 250},
      earB: {x: 560, y: 250},
      nose: {x: 320, y: 270},
      bounds: BOUNDS,
    });

    expect(visibility).toEqual({a: true, b: true});
  });

  it('hides the ear closest to the nose after the hysteresis window', () => {
    let state = createEarVisibilityState();
    let visibility = {a: true, b: true};

    for (let frame = 0; frame < EAR_HYSTERESIS_FRAMES - 1; frame += 1) {
      const result = updateEarVisibility(state, {
        earA: {x: 250, y: 250},
        earB: {x: 560, y: 250},
        nose: {x: 320, y: 270},
        bounds: BOUNDS,
      });
      state = result.state;
      visibility = result.visibility;
    }

    expect(visibility).toEqual({a: true, b: true});

    const last = updateEarVisibility(state, {
      earA: {x: 250, y: 250},
      earB: {x: 560, y: 250},
      nose: {x: 320, y: 270},
      bounds: BOUNDS,
    });

    expect(last.visibility).toEqual({a: false, b: true});
  });

  it('hides ear A when both distances are equal and the face is edge-on', () => {
    let state = createEarVisibilityState();
    let visibility = {a: true, b: true};

    for (let frame = 0; frame < EAR_HYSTERESIS_FRAMES; frame += 1) {
      const result = updateEarVisibility(state, {
        earA: {x: 320, y: 250},
        earB: {x: 320, y: 250},
        nose: {x: 320, y: 270},
        bounds: BOUNDS,
      });
      state = result.state;
      visibility = result.visibility;
    }

    expect(visibility).toEqual({a: false, b: true});
  });

  it('keeps the latch until the face turns back for the full window', () => {
    let state = createEarVisibilityState();

    for (let frame = 0; frame < EAR_HYSTERESIS_FRAMES; frame += 1) {
      state = updateEarVisibility(state, {
        earA: {x: 250, y: 250},
        earB: {x: 560, y: 250},
        nose: {x: 320, y: 270},
        bounds: BOUNDS,
      }).state;
    }

    let visibility = updateEarVisibility(state, {
      earA: {x: 80, y: 250},
      earB: {x: 560, y: 250},
      nose: {x: 320, y: 270},
      bounds: BOUNDS,
    });
    state = visibility.state;
    expect(visibility.visibility).toEqual({a: false, b: true});

    state = updateEarVisibility(state, {
      earA: {x: 80, y: 250},
      earB: {x: 560, y: 250},
      nose: {x: 320, y: 270},
      bounds: BOUNDS,
    }).state;

    visibility = updateEarVisibility(state, {
      earA: {x: 80, y: 250},
      earB: {x: 560, y: 250},
      nose: {x: 320, y: 270},
      bounds: BOUNDS,
    });

    expect(visibility.visibility).toEqual({a: true, b: true});
  });

  it('hides an anchor that leaves the frame immediately', () => {
    const result = updateEarVisibility(createEarVisibilityState(), {
      earA: {x: 2, y: 250},
      earB: {x: 560, y: 250},
      nose: {x: 320, y: 270},
      bounds: BOUNDS,
    });

    expect(result.visibility).toEqual({a: false, b: true});
  });

  it('hides both ears when the face is gone', () => {
    const result = updateEarVisibility(createEarVisibilityState(), {
      earA: {x: 80, y: 250},
      earB: {x: 560, y: 250},
      nose: null,
      bounds: BOUNDS,
    });

    expect(result.visibility).toEqual({a: false, b: false});
  });
});

describe('earTransforms', () => {
  it('anchors each earring on its lobe and mirrors the second one', () => {
    const points = landmarks();
    const metrics = faceMetrics(points);
    const transforms = earTransforms(points, metrics, {
      sizeCm: 2,
      overlayAspect: 1,
      visibility: VISIBLE,
    });

    const width = (2 / FACE_WIDTH_CM) * 320;
    const height = width;

    expect(transforms?.a).toEqual({
      x: 80,
      y: 250 + height * EAR_LOBE_SINK_RATIO,
      width,
      height,
      rotation: 0,
      mirrored: false,
    });
    expect(transforms?.b).toEqual({
      x: 560,
      y: 250 + height * EAR_LOBE_SINK_RATIO,
      width,
      height,
      rotation: 0,
      mirrored: true,
    });
  });

  it('keeps the overlay aspect ratio and the head roll', () => {
    const points = landmarks({[TRY_ON_LANDMARKS.eyeB]: {x: 360, y: 240}});
    const metrics = faceMetrics(points);
    const transforms = earTransforms(points, metrics, {
      sizeCm: 3,
      overlayAspect: 2,
      visibility: VISIBLE,
    });

    const width = (3 / FACE_WIDTH_CM) * 320;

    expect(transforms?.a?.width).toBeCloseTo(width);
    expect(transforms?.a?.height).toBeCloseTo(width / 2);
    expect(transforms?.a?.rotation).toBeCloseTo(MAX_ROLL_RADIANS);
  });

  it('omits a hidden ear', () => {
    const points = landmarks();
    const transforms = earTransforms(points, faceMetrics(points), {
      sizeCm: 2,
      overlayAspect: 1,
      visibility: {a: false, b: true},
    });

    expect(transforms?.a).toBe(null);
    expect(transforms?.b).not.toBe(null);
  });

  it('returns null without usable metrics or size', () => {
    const points = landmarks();

    expect(
      earTransforms(points, null, {
        sizeCm: 2,
        overlayAspect: 1,
        visibility: VISIBLE,
      }),
    ).toBe(null);
    expect(
      earTransforms(points, faceMetrics(points), {
        sizeCm: 0,
        overlayAspect: 1,
        visibility: VISIBLE,
      }),
    ).toBe(null);
  });
});

describe('necklaceTransform', () => {
  it('projects the collarbone below the chin and scales from the face width', () => {
    const points = landmarks();
    const transform = necklaceTransform(points, faceMetrics(points), {
      sizeCm: 16,
      overlayAspect: 2,
    });

    const drop = 320 * NECKLACE_ANCHOR_RATIO;
    const height = ((16 / FACE_WIDTH_CM) * 320) / 2;

    expect(transform?.x).toBeCloseTo(320);
    // The overlay is centred on the collarbone, so its top edge sits above it.
    expect(transform?.y).toBeCloseTo(400 + drop - height / 2);
    expect(transform?.width).toBeCloseTo((16 / FACE_WIDTH_CM) * 320);
    expect(transform?.height).toBeCloseTo(height);
    expect(transform?.rotation).toBeCloseTo(0);
  });

  it('returns null without a chin or metrics', () => {
    const points = landmarks({[TRY_ON_LANDMARKS.chin]: {x: Number.NaN, y: 400}});

    expect(
      necklaceTransform(points, faceMetrics(landmarks()), {
        sizeCm: 16,
        overlayAspect: 2,
      }),
    ).toBe(null);
    expect(
      necklaceTransform(landmarks(), null, {sizeCm: 16, overlayAspect: 2}),
    ).toBe(null);
  });
});

describe('headMaskPolygon', () => {
  it('traces the face oval so the chain can still lie on the neck', () => {
    const mask = headMaskPolygon(landmarks());

    expect(mask).toHaveLength(36);
    expect(mask?.[0]).toEqual({x: 320, y: 240});
    expect(mask).toContainEqual({x: 320, y: 400});
    expect(mask).not.toContainEqual({x: 0, y: 0});
  });

  it('returns null when a face-oval landmark is missing', () => {
    expect(
      headMaskPolygon(
        landmarks({[TRY_ON_LANDMARKS.chin]: {x: Number.NaN, y: 400}}),
      ),
    ).toBe(null);
  });
});

describe('smoothTransform', () => {
  it('snaps on the first frame', () => {
    const target = transform();
    const {value} = smoothTransform(createSmoothingState(), target, {
      now: 0,
      faceWidth: 320,
    });

    expect(value).toEqual(target);
  });

  it('eases towards the target on later frames', () => {
    const first = smoothTransform(createSmoothingState(), transform(), {
      now: 0,
      faceWidth: 320,
    });
    const next = smoothTransform(first.state, transform({x: 140}), {
      now: 90,
      faceWidth: 320,
    });

    expect(next.value?.x).toBeCloseTo(100 + 40 * (1 - Math.exp(-1)));
    expect(next.value?.width).toBeCloseTo(100);
  });

  it('caps the scale change per frame and keeps the aspect ratio', () => {
    const first = smoothTransform(createSmoothingState(), transform(), {
      now: 0,
      faceWidth: 320,
    });
    const next = smoothTransform(
      first.state,
      transform({width: 200, height: 100}),
      {now: 90, faceWidth: 320},
    );

    expect(next.value?.width).toBeCloseTo(115);
    expect(next.value?.height).toBeCloseTo(57.5);
  });

  it('snaps after a tracking gap or a large jump', () => {
    const first = smoothTransform(createSmoothingState(), transform(), {
      now: 0,
      faceWidth: 320,
    });

    const afterGap = smoothTransform(
      first.state,
      transform({x: 120}),
      {now: SMOOTHING_GAP_MS + 10, faceWidth: 320},
    );
    expect(afterGap.value?.x).toBe(120);

    const afterJump = smoothTransform(
      first.state,
      transform({x: 300}),
      {now: 30, faceWidth: 320},
    );
    expect(afterJump.value?.x).toBe(300);
  });

  it('takes the shortest path when the angle wraps', () => {
    const first = smoothTransform(
      createSmoothingState(),
      transform({rotation: 3}),
      {now: 0, faceWidth: 320},
    );
    const next = smoothTransform(
      first.state,
      transform({rotation: -3}),
      {now: 90, faceWidth: 320},
    );

    expect(next.value?.rotation).toBeGreaterThan(3);
    expect(next.value?.rotation).toBeCloseTo(
      3 + (Math.PI * 2 - 6) * (1 - Math.exp(-1)),
      2,
    );
  });

  it('follows the mirrored side from the target', () => {
    const first = smoothTransform(createSmoothingState(), transform(), {
      now: 0,
      faceWidth: 320,
    });
    const next = smoothTransform(
      first.state,
      transform({mirrored: true}),
      {now: 30, faceWidth: 320},
    );

    expect(next.value?.mirrored).toBe(true);
  });

  it('resets when tracking is lost', () => {
    const first = smoothTransform(createSmoothingState(), transform(), {
      now: 0,
      faceWidth: 320,
    });
    const lost = smoothTransform(first.state, null, {
      now: 30,
      faceWidth: 320,
    });

    expect(lost.value).toBe(null);
    expect(lost.state.value).toBe(null);
  });
});

describe('ear visibility state type', () => {
  it('exposes the initial state shape', () => {
    const state: EarVisibilityState = createEarVisibilityState();

    expect(state).toEqual({
      a: {hidden: false, streak: 0},
      b: {hidden: false, streak: 0},
    });
  });
});
