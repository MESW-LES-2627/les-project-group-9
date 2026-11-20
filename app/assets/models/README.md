# MediaPipe models

`face_landmarker.task` is the MediaPipe Face Landmarker (float16, version 1) model used by the
front-camera try-on. It runs entirely in the browser.

- Source: <https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task>
- Licence: Apache License 2.0 (MediaPipe, Google LLC)
- Size: 3,758,596 bytes (md5 `b0e7274907a1644404fef66b28dd6d85`)

Do not edit or re-encode the file. If it is replaced, update the checksum here and re-verify the
try-on on a phone.

The file is imported with Vite's `?url` from `app/lib/try-on/assets.ts`, so it is emitted as a
hashed client asset under `/assets/`. The WASM runtime is imported the same way from
`node_modules/@mediapipe/tasks-vision`; nothing is copied into `public/` at build time.
