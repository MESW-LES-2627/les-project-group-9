import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

/**
 * Opt-in checks against a REAL Shopify store (US-058 rating storage). Never
 * part of `npm test` or CI. Writes only run when RATINGS_STAGING_CONFIRM_WRITES
 * equals the store domain. See docs/architecture.md → Staging verification.
 */
export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    name: 'staging',
    environment: 'node',
    include: ['tests/staging/**/*.staging.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Live checks must run one at a time and report every result.
    fileParallelism: false,
    bail: 0,
  },
});
