import {describe, expect, it} from 'vitest';
import {
  EAR_HYSTERESIS_FRAMES,
  EAR_LOBE_LIFT_RATIO,
  EAR_OUTWARD_RATIO,
  EAR_STACK_GAP_RATIO,
  FACE_WIDTH_CM,
  MAX_JUMP_RATIO,
  MAX_ROLL_RADIANS,
  NECK_BASE_DROP_RATIO,
  SHOULDER_WIDTH_CM,
  SMOOTHING_GAP_MS,
  SMOOTHING_TAU_MS,
  TRY_ON_LANDMARKS,
  bufferTransform,
  createAnchorBuffer,
  createEarVisibilityState,
  createSmoothingState,
  earTransforms,
  faceMetrics,
  headMaskPolygon,
  necklaceTransform,
  shoulderWidthPx,
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

function transform(
  overrides: Partial<OverlayTransform> = {},
): OverlayTransform {
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
      faceMetrics(
        landmarks({[TRY_ON_LANDMARKS.eyeB]: {x: Number.NaN, y: 200}}),
      ),
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
    const outward = 320 * EAR_OUTWARD_RATIO;
    const lift = 320 * EAR_LOBE_LIFT_RATIO;

    expect(transforms?.a).toEqual({
      x: 80 - outward,
      y: 250 - lift,
      width,
      height,
      rotation: 0,
      mirrored: false,
    });
    expect(transforms?.b).toEqual({
      x: 560 + outward,
      y: 250 - lift,
      width,
      height,
      rotation: 0,
      mirrored: true,
    });
  });

  it('pushes the anchors outward by a fraction of the face width', () => {
    const points = landmarks({
      [TRY_ON_LANDMARKS.faceA]: {x: 200, y: 240},
      [TRY_ON_LANDMARKS.faceB]: {x: 400, y: 240},
      [TRY_ON_LANDMARKS.earA]: {x: 120, y: 250},
      [TRY_ON_LANDMARKS.earB]: {x: 480, y: 250},
    });
    const transforms = earTransforms(points, faceMetrics(points), {
      sizeCm: 2,
      overlayAspect: 1,
      visibility: VISIBLE,
    });

    const outward = 200 * EAR_OUTWARD_RATIO;
    const lift = 200 * EAR_LOBE_LIFT_RATIO;

    expect(transforms?.a?.x).toBeCloseTo(120 - outward);
    expect(transforms?.a?.y).toBeCloseTo(250 - lift);
    expect(transforms?.b?.x).toBeCloseTo(480 + outward);
    expect(transforms?.b?.y).toBeCloseTo(250 - lift);
  });

  it('follows the face lateral axis when the head rolls', () => {
    const points = landmarks({
      [TRY_ON_LANDMARKS.faceA]: {x: 140, y: 220},
      [TRY_ON_LANDMARKS.faceB]: {x: 460, y: 260},
    });
    const metrics = faceMetrics(points)!;
    const transforms = earTransforms(points, metrics, {
      sizeCm: 2,
      overlayAspect: 1,
      visibility: VISIBLE,
    });

    const lateral = {x: 320 / 322.49, y: 40 / 322.49};
    const offset = metrics.width * EAR_OUTWARD_RATIO;
    const lift = metrics.width * EAR_LOBE_LIFT_RATIO;

    expect(transforms?.a?.x).toBeCloseTo(80 - lateral.x * offset);
    expect(transforms?.a?.y).toBeCloseTo(250 - lateral.y * offset - lift);
    expect(transforms?.b?.x).toBeCloseTo(560 + lateral.x * offset);
    expect(transforms?.b?.y).toBeCloseTo(250 + lateral.y * offset - lift);
  });

  it('lifts the earrings along the face vertical axis', () => {
    const points = landmarks({
      [TRY_ON_LANDMARKS.chin]: {x: 340, y: 400},
    });
    const metrics = faceMetrics(points)!;
    const transforms = earTransforms(points, metrics, {
      sizeCm: 2,
      overlayAspect: 1,
      visibility: VISIBLE,
    });

    const length = Math.hypot(20, 200);
    const vertical = {x: 20 / length, y: 200 / length};
    const lift = metrics.width * EAR_LOBE_LIFT_RATIO;
    const outward = metrics.width * EAR_OUTWARD_RATIO;

    expect(transforms?.a?.x).toBeCloseTo(80 - outward - vertical.x * lift);
    expect(transforms?.a?.y).toBeCloseTo(250 - vertical.y * lift);
  });

  it('stacks an extra earring above the lobe', () => {
    const points = landmarks();
    const metrics = faceMetrics(points)!;
    const lobe = earTransforms(points, metrics, {
      sizeCm: 2,
      overlayAspect: 1,
      visibility: VISIBLE,
      stackIndex: 0,
    });
    const second = earTransforms(points, metrics, {
      sizeCm: 2,
      overlayAspect: 1,
      visibility: VISIBLE,
      stackIndex: 1,
    });

    const gap = metrics.width * EAR_STACK_GAP_RATIO;

    expect(lobe?.a?.y).toBeGreaterThan(second!.a!.y);
    expect(lobe?.a?.y! - second!.a!.y!).toBeCloseTo(gap);
    expect(lobe?.b?.y! - second!.b!.y!).toBeCloseTo(gap);
    // Stacking only lifts the piece; its size and lateral placement stay put.
    expect(second?.a?.x).toBeCloseTo(lobe!.a!.x);
    expect(second?.a?.width).toBeCloseTo(lobe!.a!.width);
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

    const drop = 320 * NECK_BASE_DROP_RATIO;
    const height = ((16 / SHOULDER_WIDTH_CM) * shoulderWidthPx(320)) / 2;

    expect(transform?.x).toBeCloseTo(320);
    // Top-centre sits on the neck base, so the chain arcs around the neck.
    expect(transform?.y).toBeCloseTo(400 + drop);
    expect(transform?.width).toBeCloseTo((16 / FACE_WIDTH_CM) * 320);
    expect(transform?.height).toBeCloseTo(height);
    expect(transform?.rotation).toBeCloseTo(0);
  });

  it('returns null without a chin or metrics', () => {
    const points = landmarks({
      [TRY_ON_LANDMARKS.chin]: {x: Number.NaN, y: 400},
    });

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

describe('bufferTransform', () => {
  it('weights the newest sample and absorbs a one-frame spike', () => {
    let buffer = createAnchorBuffer();
    let value = transform({x: 100});

    for (let frame = 0; frame < 3; frame += 1) {
      const result = bufferTransform(buffer, transform({x: 100}));
      buffer = result.buffer;
      value = result.transform;
    }

    expect(value.x).toBeCloseTo(100);

    const spike = bufferTransform(buffer, transform({x: 200}));

    // 0.5 × 200 + 0.3 × 100 + 0.2 × 100
    expect(spike.transform.x).toBeCloseTo(150);

    const settled = bufferTransform(spike.buffer, transform({x: 200}));

    expect(settled.transform.x).toBeGreaterThan(150);
    expect(settled.transform.x).toBeLessThan(200);
  });

  it('averages rotation around the shortest arc', () => {
    let buffer = createAnchorBuffer();

    buffer = bufferTransform(buffer, transform({rotation: 3})).buffer;
    const result = bufferTransform(buffer, transform({rotation: -3}));

    expect(Math.abs(result.transform.rotation)).toBeCloseTo(Math.PI, 1);
  });

  it('takes the mirrored side from the newest sample', () => {
    const buffer = createAnchorBuffer();

    const result = bufferTransform(buffer, transform({mirrored: true}));

    expect(result.transform.mirrored).toBe(true);
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

  it('snaps after a tracking gap and clamps a large jump instead', () => {
    const first = smoothTransform(createSmoothingState(), transform(), {
      now: 0,
      faceWidth: 320,
    });

    const afterGap = smoothTransform(first.state, transform({x: 120}), {
      now: SMOOTHING_GAP_MS + 10,
      faceWidth: 320,
    });
    expect(afterGap.value?.x).toBe(120);

    // A one-frame spike is clamped to MAX_JUMP_RATIO of the face width, then
    // eased: no teleport, no visible snap.
    const afterJump = smoothTransform(first.state, transform({x: 300}), {
      now: 30,
      faceWidth: 320,
    });
    expect(afterJump.value?.x).toBeCloseTo(
      100 + 320 * MAX_JUMP_RATIO * (1 - Math.exp(-30 / SMOOTHING_TAU_MS)),
    );
  });

  it('applies the per-overlay time constant', () => {
    const start = smoothTransform(createSmoothingState(), transform(), {
      now: 0,
      faceWidth: 2000,
    });
    const fast = smoothTransform(start.state, transform({x: 140}), {
      now: 40,
      faceWidth: 2000,
      tauMs: 60,
    });
    const slow = smoothTransform(start.state, transform({x: 140}), {
      now: 40,
      faceWidth: 2000,
      tauMs: 130,
    });

    expect(fast.value?.x).toBeGreaterThan(slow.value?.x ?? 0);
  });

  it('takes the shortest path when the angle wraps', () => {
    const first = smoothTransform(
      createSmoothingState(),
      transform({rotation: 3}),
      {now: 0, faceWidth: 320},
    );
    const next = smoothTransform(first.state, transform({rotation: -3}), {
      now: 90,
      faceWidth: 320,
    });

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
    const next = smoothTransform(first.state, transform({mirrored: true}), {
      now: 30,
      faceWidth: 320,
    });

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
