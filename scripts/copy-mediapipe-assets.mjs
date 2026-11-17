/**
 * Copies the MediaPipe vision WASM runtime into `public/` so the try-on dialog
 * can load it from our own origin (no third-party CDN at runtime).
 *
 * The classic loader (`vision_wasm_internal.*`) is used: the ES-module variant
 * (`*_module_internal.*`) fails at runtime with "ModuleFactory not set."
 * because the loader is evaluated as a classic script (`import.meta` is not
 * available there). `FilesetResolver.forVisionTasks` is called with
 * `useModule: false`.
 *
 * Runs from `postinstall`, `predev`, `prebuild` and `prepreview`.
 */
import {cpSync, existsSync, mkdirSync, rmSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm'];

/** Files copied by an earlier version of this script. */
const OBSOLETE_FILES = [
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

for (const file of OBSOLETE_FILES) {
  const stale = path.join(target, file);
  if (existsSync(stale)) rmSync(stale);
}

if (copied > 0) {
  process.stdout.write(
    `[mediapipe] copied ${copied} runtime file(s) to public/mediapipe/wasm\n`,
  );
}
