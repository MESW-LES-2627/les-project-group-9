import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type {TryOnPiece} from '~/lib/try-on/catalog';
import type {LoadedTryOnPiece} from '~/lib/try-on/overlay';

const mocks = vi.hoisted(() => ({
  decodePhoto: vi.fn(),
  drawTryOnFrame: vi.fn(),
}));

vi.mock('~/lib/try-on/upload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/try-on/upload')>();
  return {...actual, decodePhoto: mocks.decodePhoto};
});

vi.mock('~/lib/try-on/render', () => ({
  drawTryOnFrame: mocks.drawTryOnFrame,
}));

import {PhotoFallback} from '~/components/try-on/PhotoFallback';

const LANDMARKS = [1, 33, 263, 152, 234, 454, 132, 361, 177, 401];

function faceLandmarks() {
  const points = Array.from({length: 478}, () => ({x: 0.5, y: 0.5}));
  const overrides: Record<number, {x: number; y: number}> = {
    1: {x: 0.5, y: 0.55},
    33: {x: 0.44, y: 0.4},
    263: {x: 0.56, y: 0.4},
    152: {x: 0.5, y: 0.8},
    234: {x: 0.22, y: 0.5},
    454: {x: 0.72, y: 0.5},
    132: {x: 0.3, y: 0.68},
    361: {x: 0.7, y: 0.68},
    177: {x: 0.12, y: 0.52},
    401: {x: 0.88, y: 0.52},
  };

  for (const index of LANDMARKS) points[index] = overrides[index];

  return points;
}

function fakeBitmap() {
  return {
    width: 800,
    height: 600,
    close: vi.fn(),
  };
}

const detector = {
  detectVideo: vi.fn(),
  detectImage: vi.fn(),
  close: vi.fn(),
};

const overlay = document.createElement('img');
Object.defineProperty(overlay, 'naturalWidth', {value: 200});
Object.defineProperty(overlay, 'naturalHeight', {value: 100});
const necklaceOverlay = document.createElement('img');
Object.defineProperty(necklaceOverlay, 'naturalWidth', {value: 400});
Object.defineProperty(necklaceOverlay, 'naturalHeight', {value: 200});

const EARRING: TryOnPiece = {
  id: 'gid://shopify/ProductVariant/1',
  kind: 'earring',
  overlayUrl: 'https://cdn.example/earring.png?cors=1',
  sizeCm: 2,
};
const NECKLACE: TryOnPiece = {
  id: 'gid://shopify/ProductVariant/2',
  kind: 'necklace',
  overlayUrl: 'https://cdn.example/necklace.png?cors=1',
  sizeCm: 16,
};
const LOADED: LoadedTryOnPiece = {piece: EARRING, image: overlay};
const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => ({}) as unknown as CanvasRenderingContext2D,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

beforeEach(() => {
  mocks.decodePhoto.mockReset();
  mocks.drawTryOnFrame.mockReset();
  detector.detectImage.mockReset();
});

function renderFallback(pieces: LoadedTryOnPiece[] = [LOADED]) {
  return render(
    <PhotoFallback
      detector={detector}
      pieces={pieces}
      previewLabel="Preview with Aura Earrings on you"
    />,
  );
}

describe('PhotoFallback', () => {
  it('detects the face and composes the piece on the photo', async () => {
    const user = userEvent.setup();
    const bitmap = fakeBitmap();
    mocks.decodePhoto.mockResolvedValue(bitmap);
    detector.detectImage.mockResolvedValue(faceLandmarks());

    const {unmount} = renderFallback();

    const file = new File(['photo'], 'selfie.png', {type: 'image/png'});
    await user.upload(screen.getByLabelText('Upload a photo'), file);

    await waitFor(() => expect(mocks.drawTryOnFrame).toHaveBeenCalledTimes(1));

    const options = mocks.drawTryOnFrame.mock.calls[0][1];
    expect(options.mirror).toBe(false);
    expect(options.layers).toHaveLength(2);
    expect(options.sourceWidth).toBe(800);
    expect(options.sourceHeight).toBe(600);
    expect(detector.detectImage).toHaveBeenCalledWith(bitmap);
    // The bitmap is kept so the piece can be dragged or resized, then released.
    expect(bitmap.close).not.toHaveBeenCalled();
    expect(screen.getByText('Choose another photo')).toBeInTheDocument();

    unmount();
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it('composes a whole look on the photo', async () => {
    const user = userEvent.setup();
    mocks.decodePhoto.mockResolvedValue(fakeBitmap());
    detector.detectImage.mockResolvedValue(faceLandmarks());

    renderFallback([LOADED, {piece: NECKLACE, image: necklaceOverlay}]);

    await user.upload(
      screen.getByLabelText('Upload a photo'),
      new File(['photo'], 'selfie.png', {type: 'image/png'}),
    );

    await waitFor(() => expect(mocks.drawTryOnFrame).toHaveBeenCalledTimes(1));

    const options = mocks.drawTryOnFrame.mock.calls[0][1];
    // Two ears for the earring plus one masked necklace.
    expect(options.layers).toHaveLength(3);
    expect(
      options.layers.map((layer: {image: unknown}) => layer.image),
    ).toEqual([necklaceOverlay, overlay, overlay]);
    expect(options.layers[0].masked).toBe(true);
  });

  it('keeps the photo and explains when no face is found', async () => {
    const user = userEvent.setup();
    mocks.decodePhoto.mockResolvedValue(fakeBitmap());
    detector.detectImage.mockResolvedValue(null);

    renderFallback();

    await user.upload(
      screen.getByLabelText('Upload a photo'),
      new File(['photo'], 'selfie.png', {type: 'image/png'}),
    );

    expect(
      await screen.findByText(
        'We couldn’t find a face in that photo. Try another one.',
      ),
    ).toBeInTheDocument();
    const options = mocks.drawTryOnFrame.mock.calls[0][1];
    expect(options.layers).toEqual([]);
  });

  it('rejects files that are not images', async () => {
    renderFallback();

    fireEvent.change(screen.getByLabelText('Upload a photo'), {
      target: {
        files: [new File(['text'], 'notes.txt', {type: 'text/plain'})],
      },
    });

    expect(
      await screen.findByText('Use a JPG, PNG or HEIC image under 12 MB.'),
    ).toBeInTheDocument();
    expect(mocks.decodePhoto).not.toHaveBeenCalled();
  });

  it('explains a failed decode', async () => {
    const user = userEvent.setup();
    mocks.decodePhoto.mockRejectedValue(new Error('decode'));

    renderFallback();

    await user.upload(
      screen.getByLabelText('Upload a photo'),
      new File(['broken'], 'selfie.heic', {type: 'image/heic'}),
    );

    expect(
      await screen.findByText('Use a JPG, PNG or HEIC image under 12 MB.'),
    ).toBeInTheDocument();
  });

  it('lets the shopper resize and reset the piece', async () => {
    const user = userEvent.setup();
    mocks.decodePhoto.mockResolvedValue(fakeBitmap());
    detector.detectImage.mockResolvedValue(faceLandmarks());

    renderFallback();
    await user.upload(
      screen.getByLabelText('Upload a photo'),
      new File(['photo'], 'selfie.png', {type: 'image/png'}),
    );
    await waitFor(() => expect(mocks.drawTryOnFrame).toHaveBeenCalledTimes(1));

    const initialWidth =
      mocks.drawTryOnFrame.mock.calls[0][1].layers[0].transform.width;

    await user.click(screen.getByRole('button', {name: 'Larger'}));
    await waitFor(() => expect(mocks.drawTryOnFrame).toHaveBeenCalledTimes(2));

    const largerWidth =
      mocks.drawTryOnFrame.mock.calls[1][1].layers[0].transform.width;
    expect(largerWidth).toBeGreaterThan(initialWidth);

    await user.click(screen.getByRole('button', {name: 'Smaller'}));
    await user.click(screen.getByRole('button', {name: 'Reset position'}));
    await waitFor(() => expect(mocks.drawTryOnFrame).toHaveBeenCalledTimes(4));

    expect(
      mocks.drawTryOnFrame.mock.calls[3][1].layers[0].transform.width,
    ).toBeCloseTo(initialWidth);
  });

  it('lets the shopper drag the piece', async () => {
    const user = userEvent.setup();
    mocks.decodePhoto.mockResolvedValue(fakeBitmap());
    detector.detectImage.mockResolvedValue(faceLandmarks());

    renderFallback();
    await user.upload(
      screen.getByLabelText('Upload a photo'),
      new File(['photo'], 'selfie.png', {type: 'image/png'}),
    );
    await waitFor(() => expect(mocks.drawTryOnFrame).toHaveBeenCalledTimes(1));

    const canvas = screen.getByRole('img', {name: /Preview with/});
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(canvas, {pointerId: 1, clientX: 100, clientY: 100});
    fireEvent.pointerMove(canvas, {pointerId: 1, clientX: 180, clientY: 100});
    fireEvent.pointerUp(canvas, {pointerId: 1});

    await waitFor(() =>
      expect(mocks.drawTryOnFrame.mock.calls.length).toBeGreaterThan(1),
    );

    const before = mocks.drawTryOnFrame.mock.calls[0][1].layers[0].transform.x;
    const after =
      mocks.drawTryOnFrame.mock.calls.at(-1)![1].layers[0].transform.x;

    expect(after - before).toBeCloseTo(80);
  });
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});
