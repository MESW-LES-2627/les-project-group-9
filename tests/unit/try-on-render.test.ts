import {describe, expect, it} from 'vitest';
import type {OverlayTransform} from '../../app/lib/try-on/anchors';
import {
  drawOverlays,
  drawTryOnFrame,
  type FrameOverlay,
} from '../../app/lib/try-on/render';

type Recorded = [string, ...unknown[]];

function recorder() {
  const calls: Recorded[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
    };

  const context = {
    save: record('save'),
    restore: record('restore'),
    clearRect: record('clearRect'),
    translate: record('translate'),
    scale: record('scale'),
    rotate: record('rotate'),
    beginPath: record('beginPath'),
    rect: record('rect'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    closePath: record('closePath'),
    clip: record('clip'),
    drawImage: record('drawImage'),
  } as unknown as CanvasRenderingContext2D;

  return {context, calls};
}

const source = {label: 'video'} as unknown as CanvasImageSource;
const overlay = {label: 'overlay'} as unknown as CanvasImageSource;

const transform: OverlayTransform = {
  x: 100,
  y: 50,
  width: 40,
  height: 20,
  rotation: 0.5,
  mirrored: false,
};

function draw(options: {
  mirror: boolean;
  overlays?: FrameOverlay[];
  headMask?: Array<{x: number; y: number}> | null;
}) {
  const {context, calls} = recorder();

  drawTryOnFrame(context, {
    source,
    sourceWidth: 640,
    sourceHeight: 480,
    overlay,
    overlays: options.overlays ?? [{transform, masked: false}],
    headMask: options.headMask ?? null,
    mirror: options.mirror,
  });

  return calls;
}

describe('drawTryOnFrame', () => {
  it('draws the mirrored front-camera preview and the mirrored overlay', () => {
    const calls = draw({mirror: true});

    expect(calls).toContainEqual(['translate', 640, 0]);
    expect(calls).toContainEqual(['scale', -1, 1]);
    expect(calls).toContainEqual(['translate', 540, 50]);
    expect(calls).toContainEqual(['rotate', -0.5]);
    expect(calls).toContainEqual(['drawImage', source, 0, 0, 640, 480]);
    expect(calls).toContainEqual(['drawImage', overlay, -20, 0, 40, 20]);
  });

  it('leaves uploaded photos unmirrored', () => {
    const calls = draw({mirror: false});

    expect(calls).not.toContainEqual(['translate', 640, 0]);
    expect(calls).toContainEqual(['translate', 100, 50]);
    expect(calls).toContainEqual(['rotate', 0.5]);
  });

  it('flips the overlay side when the preview is mirrored', () => {
    const mirrored = draw({
      mirror: true,
      overlays: [{transform: {...transform, mirrored: true}, masked: false}],
    });

    // The video mirror is one flip; a mirrored overlay in a mirrored preview
    // is drawn unflipped, so only the video scale remains.
    expect(mirrored.filter(([name]) => name === 'scale')).toHaveLength(1);

    const direct = draw({
      mirror: false,
      overlays: [{transform: {...transform, mirrored: true}, masked: false}],
    });

    expect(direct.filter(([name]) => name === 'scale')).toHaveLength(1);
  });

  it('clips masked overlays with the mirrored head polygon', () => {
    const calls = draw({
      mirror: true,
      overlays: [{transform, masked: true}],
      headMask: [
        {x: 140, y: 240},
        {x: 320, y: 400},
        {x: 460, y: 240},
      ],
    });

    expect(calls).toContainEqual(['beginPath']);
    expect(calls).toContainEqual(['rect', 0, 0, 640, 480]);
    expect(calls).toContainEqual(['moveTo', 500, 240]);
    expect(calls).toContainEqual(['lineTo', 320, 400]);
    expect(calls).toContainEqual(['lineTo', 180, 240]);
    expect(calls).toContainEqual(['closePath']);
    expect(calls).toContainEqual(['clip', 'evenodd']);
  });

  it('draws the source before the overlays', () => {
    const calls = draw({mirror: false});
    const drawings = calls
      .filter(([name]) => name === 'drawImage')
      .map(([, image]) => image);

    expect(drawings).toEqual([source, overlay]);
  });

  it('skips the clip when there is no head polygon', () => {
    const calls = draw({
      mirror: false,
      overlays: [{transform, masked: true}],
      headMask: null,
    });

    expect(calls).not.toContainEqual(['clip', 'evenodd']);
  });
});

describe('drawOverlays', () => {
  it('clears the canvas and draws only the piece', () => {
    const {context, calls} = recorder();

    drawOverlays(context, {
      overlay,
      overlays: [{transform, masked: false}],
      headMask: null,
      mirror: false,
      sourceWidth: 640,
      sourceHeight: 480,
    });

    expect(calls).toContainEqual(['clearRect', 0, 0, 640, 480]);
    expect(calls.filter(([name]) => name === 'drawImage')).toHaveLength(1);
    expect(calls).toContainEqual(['drawImage', overlay, -20, 0, 40, 20]);
  });

  it('mirrors the piece when the preview is mirrored', () => {
    const {context, calls} = recorder();

    drawOverlays(context, {
      overlay,
      overlays: [{transform, masked: false}],
      headMask: null,
      mirror: true,
      sourceWidth: 640,
      sourceHeight: 480,
    });

    expect(calls).toContainEqual(['translate', 540, 50]);
    expect(calls).toContainEqual(['rotate', -0.5]);
  });

  it('keeps the canvas transparent when the source was drawn before', () => {
    const {context, calls} = recorder();

    drawOverlays(context, {
      overlay,
      overlays: [],
      headMask: null,
      mirror: false,
      sourceWidth: 640,
      sourceHeight: 480,
      clear: false,
    });

    expect(calls).not.toContainEqual(['clearRect', 0, 0, 640, 480]);
  });
});
