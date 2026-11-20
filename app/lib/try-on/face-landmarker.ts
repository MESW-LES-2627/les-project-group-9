import type {FaceLandmarker} from '@mediapipe/tasks-vision';
import type {Point} from './anchors';
import {
  TRY_ON_ASSETS,
  TryOnAssetError,
  describeAssetProbes,
  diagnoseTryOnAssets,
} from './assets';

type DetectorMode = 'VIDEO' | 'IMAGE';

export type FaceDetector = {
  /** Landmarks from the current video frame, or `null` when no face is found. */
  detectVideo(video: HTMLVideoElement, timestamp: number): Point[] | null;
  /** Landmarks from a still photo (switches the landmarker to image mode). */
  detectImage(
    image: ImageBitmap | HTMLImageElement | HTMLCanvasElement,
  ): Promise<Point[] | null>;
  close(): void;
};

let sharedDetector: Promise<FaceDetector> | null = null;

/**
 * Shared landmarker for the page session. Creating it costs ~18 MB of downloads
 * plus WASM compilation, so it is created once (optionally warmed on idle) and
 * reused by every try-on dialog. A failed creation is not cached, so a retry
 * starts clean.
 */
export function getFaceDetector(
  create: () => Promise<FaceDetector> = createFaceDetector,
): Promise<FaceDetector> {
  if (!sharedDetector) {
    sharedDetector = create().catch((error: unknown) => {
      sharedDetector = null;
      throw error;
    });
  }

  return sharedDetector;
}

/** Closes and forgets the shared landmarker (call on pagehide). */
export function releaseFaceDetector(): void {
  const pending = sharedDetector;
  sharedDetector = null;
  void pending
    ?.then((detector) => detector.close())
    .catch(() => undefined);
}

/** Fire-and-forget warm-up used by the idle preloader. */
export function warmFaceDetector(): void {
  void getFaceDetector().catch(() => undefined);
}

/**
 * Loads the MediaPipe FaceLandmarker lazily (14 MB WASM + 3.8 MB model, both
 * emitted as hashed client assets). Tries the GPU delegate first and falls back
 * to CPU, which is slower but works where WebGL is unavailable.
 *
 * An instance is created per try-on session and closed when the dialog closes.
 * On failure the asset URLs are probed and logged, so a deployment that serves
 * the wrong file (for example an HTML 404 page instead of the WASM) is obvious
 * from the console and from the banner.
 */
export async function createFaceDetector(): Promise<FaceDetector> {
  let landmarker: FaceLandmarker;

  try {
    landmarker = await createLandmarker();
  } catch (error) {
    const probes = await diagnoseTryOnAssets();
    console.error('[try-on] MediaPipe could not start', error, probes);

    throw new TryOnAssetError(
      `MediaPipe assets: ${describeAssetProbes(probes)}`,
      {cause: error},
    );
  }

  let mode: DetectorMode = 'VIDEO';

  async function switchMode(next: DetectorMode) {
    if (mode === next) return;
    await landmarker.setOptions({runningMode: next});
    mode = next;
  }

  return {
    detectVideo(video, timestamp) {
      if (mode !== 'VIDEO') return null;

      const result = landmarker.detectForVideo(video, timestamp);
      return toPoints(result.faceLandmarks[0]);
    },
    async detectImage(image) {
      await switchMode('IMAGE');
      const result = landmarker.detect(image);
      return toPoints(result.faceLandmarks[0]);
    },
    close() {
      landmarker.close();
    },
  };
}

/**
 * Creates the landmarker from the explicit fileset: the classic loader maps
 * every `.wasm` request to `wasmBinaryPath`, so both the script and the binary
 * can carry Vite's content hash. No `FilesetResolver` base path can drift.
 */
async function createLandmarker(): Promise<FaceLandmarker> {
  const {FaceLandmarker} = await import('@mediapipe/tasks-vision');

  const fileset = {
    wasmLoaderPath: TRY_ON_ASSETS.loaderUrl,
    wasmBinaryPath: TRY_ON_ASSETS.wasmUrl,
  };

  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: {modelAssetPath: TRY_ON_ASSETS.modelUrl, delegate},
    runningMode: 'VIDEO' as const,
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });

  try {
    return await FaceLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    return await FaceLandmarker.createFromOptions(fileset, options('CPU'));
  }
}

function toPoints(
  landmarks: Array<{x: number; y: number}> | undefined,
): Point[] | null {
  if (!landmarks?.length) return null;

  return landmarks.map(({x, y}) => ({x, y}));
}
