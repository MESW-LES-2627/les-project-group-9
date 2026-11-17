import type {FaceLandmarker} from '@mediapipe/tasks-vision';
import type {Point} from './anchors';

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

const WASM_BASE = '/mediapipe/wasm';
const MODEL_URL = '/models/face_landmarker.task';

/**
 * Loads the MediaPipe FaceLandmarker lazily (14 MB WASM + 3.8 MB model, both
 * self-hosted). Tries the GPU delegate first and falls back to CPU, which is
 * slower but works where WebGL is unavailable.
 *
 * An instance is created per try-on session and closed when the dialog closes.
 */
export async function createFaceDetector(): Promise<FaceDetector> {
  const {FilesetResolver, FaceLandmarker} = await import(
    '@mediapipe/tasks-vision'
  );

  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE, false);
  const create = (delegate: 'GPU' | 'CPU') =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {modelAssetPath: MODEL_URL, delegate},
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

  let landmarker: FaceLandmarker;

  try {
    landmarker = await create('GPU');
  } catch {
    landmarker = await create('CPU');
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

function toPoints(
  landmarks: Array<{x: number; y: number}> | undefined,
): Point[] | null {
  if (!landmarks?.length) return null;

  return landmarks.map(({x, y}) => ({x, y}));
}
