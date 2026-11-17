/**
 * Copies the MediaPipe vision WASM runtime into `public/` so the try-on dialog
 * can load it from our own origin (no third-party CDN at runtime).
 *
 * Only the ES module variant is copied: `FilesetResolver.forVisionTasks` is
 * called with `useModule: true`, which loads `wasm_module_internal.*`.
 * Runs from `postinstall`, `predev`, `prebuild` and `prepreview`.
 */
import {cpSync, existsSync, mkdirSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const FILES = [
  'vision_wasm_module_internal.js',
  'vision_wasm_module_internal.wasm',
];

const root = fileURLToPath(new URL('..', import.meta.url));
const source = path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const target = path.join(root, 'public/mediapipe/wasm');

if (!existsSync(source)) {
  console.warn(
    '[mediapipe] @mediapipe/tasks-vision is not installed yet; skipping asset copy',
  );
  process.exit(0);
}

let copied = 0;

for (const file of FILES) {
  const from = path.join(source, file);
  const to = path.join(target, file);

  if (!existsSync(from)) {
    console.error(`[mediapipe] missing ${file} in ${source}`);
    process.exit(1);
  }

  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;

  mkdirSync(target, {recursive: true});
  cpSync(from, to);
  copied += 1;
}

if (copied > 0) {
  process.stdout.write(
    `[mediapipe] copied ${copied} runtime file(s) to public/mediapipe/wasm\n`,
  );
}
