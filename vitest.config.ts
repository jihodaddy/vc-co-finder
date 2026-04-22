import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
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
 * - `@vitejs/plugin-react` handles TSX transform so Next.js's
 *   `jsx: preserve` tsconfig doesn't break `.tsx` imports inside vitest
 *   (Plan 02-03 Task 2 deviation — shadcn/profile components are TSX).
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Stub `server-only` in tests — the real package throws when imported
      // outside an RSC context, which is correct for production but blocks
      // unit tests of server-side helpers (e.g. freshnessLevel).
      'server-only': path.resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'dist'],
    testTimeout: 10_000,
  },
});
