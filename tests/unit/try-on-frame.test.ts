import {describe, expect, it} from 'vitest';
import {
  TRY_ON_LANDMARKS,
  createEarVisibilityState,
  shoulderWidthPx,
  type Point,
} from '../../app/lib/try-on/anchors';
import {planFrame, type PlanFramePiece} from '../../app/lib/try-on/frame';

const BOUNDS = {width: 640, height: 480};

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

const EARRING: PlanFramePiece = {
  id: 'gid://shopify/ProductVariant/1',
  kind: 'earring',
  sizeCm: 2,
  overlayAspect: 1,
};

const NECKLACE: PlanFramePiece = {
  id: 'gid://shopify/ProductVariant/2',
  kind: 'necklace',
  sizeCm: 16,
  overlayAspect: 1,
};

function landmarks(overrides: Record<number, Point> = {}): Point[] {
  const points = Array.from({length: 478}, (): Point => ({x: 320, y: 240}));

  for (const [index, point] of Object.entries({...BASE, ...overrides})) {
    points[Number(index)] = point;
  }

  return points;
}

function plan(options: {
  pieces?: PlanFramePiece[];
  points?: Point[];
  earState?: ReturnType<typeof createEarVisibilityState>;
  instant?: boolean;
}) {
  return planFrame({
    points: options.points ?? landmarks(),
    pieces: options.pieces ?? [EARRING],
    bounds: BOUNDS,
    earState: options.earState ?? createEarVisibilityState(),
    instant: options.instant,
  });
}

describe('planFrame', () => {
  it('plans both ears on a frontal face', () => {
    const frame = plan({});

    expect(frame?.overlays.map((overlay) => overlay.slot)).toEqual([
      'earA',
      'earB',
    ]);
    expect(
      frame?.overlays.every(
        (overlay) => overlay.masked === false && overlay.id === EARRING.id,
      ),
    ).toBe(true);
    expect(frame?.headMask).toBe(null);
    expect(frame?.overlays[0].referenceWidth).toBeCloseTo(320);
  });

  it('hides the far earring after the hysteresis window', () => {
    const turned = landmarks({
      [TRY_ON_LANDMARKS.earA]: {x: 250, y: 250},
    });
    let earState = createEarVisibilityState();

    for (let call = 0; call < 2; call += 1) {
      const frame = plan({points: turned, earState});
      expect(frame?.overlays).toHaveLength(2);
      earState = frame!.earState;
    }

    const last = plan({points: turned, earState});
    expect(last?.overlays.map((overlay) => overlay.slot)).toEqual(['earB']);
  });

  it('applies the ear hysteresis immediately for photos', () => {
    const frame = plan({
      points: landmarks({[TRY_ON_LANDMARKS.earA]: {x: 250, y: 250}}),
      instant: true,
    });

    expect(frame?.overlays.map((overlay) => overlay.slot)).toEqual(['earB']);
  });

  it('plans a masked necklace with a head polygon', () => {
    const frame = plan({pieces: [NECKLACE]});

    expect(frame?.overlays).toHaveLength(1);
    expect(frame?.overlays[0]).toMatchObject({
      id: NECKLACE.id,
      slot: 'necklace',
      masked: true,
    });
    expect(frame?.overlays[0].referenceWidth).toBeCloseTo(shoulderWidthPx(320));
    expect(frame?.headMask).toHaveLength(36);
    expect(frame?.earState).toBeDefined();
  });

  it('draws a set: necklaces first, then both ears', () => {
    const frame = plan({pieces: [EARRING, NECKLACE]});

    expect(frame?.overlays.map((overlay) => overlay.slot)).toEqual([
      'necklace',
      'earA',
      'earB',
    ]);
    expect(frame?.headMask).toHaveLength(36);
  });

  it('stacks multiple earrings upwards in selection order', () => {
    const second = {...EARRING, id: 'gid://shopify/ProductVariant/3'};
    const frame = plan({pieces: [EARRING, second]});

    const lobeA = frame!.overlays.find(
      (overlay) => overlay.id === EARRING.id && overlay.slot === 'earA',
    )!;
    const upperA = frame!.overlays.find(
      (overlay) => overlay.id === second.id && overlay.slot === 'earA',
    )!;

    expect(frame?.overlays).toHaveLength(4);
    expect(lobeA.transform.y).toBeGreaterThan(upperA.transform.y);
    expect(lobeA.transform.x).toBeCloseTo(upperA.transform.x);
  });

  it('draws longer necklaces behind shorter ones', () => {
    const choker = {...NECKLACE, id: 'short', sizeCm: 14};
    const long = {...NECKLACE, id: 'long', sizeCm: 40};
    const frame = plan({pieces: [choker, long]});

    expect(frame?.overlays.map((overlay) => overlay.id)).toEqual([
      'long',
      'short',
    ]);
    expect(frame?.overlays.every((overlay) => overlay.masked)).toBe(true);
  });

  it('returns null when there is no face', () => {
    expect(plan({points: []})).toBe(null);
  });
});
