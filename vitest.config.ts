import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Vitest 4.x config for Phase 2.
 *
 * - `@/*` alias mirrors tsconfig paths so imports like `@/lib/data/_meta`
 *   resolve in tests.
 * - Default environment is `node` for smoke + RLS tests (they run against
 *   HTTP endpoints or Supabase JS — no DOM needed).
 * - Component-rendering tests under `tests/unit/**` opt into `happy-dom`
 *   via a per-file pragma comment at the top of the test file:
 *     // @vitest-environment happy-dom
 *   (Vitest 4 removed `environmentMatchGlobs`; the per-file pragma is the
 *   supported replacement per https://vitest.dev/guide/environment.html.)
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'dist'],
    testTimeout: 10_000,
  },
});
