// Test stub for `server-only`. The real package throws when imported outside
// an RSC context (correct for prod — catches accidental client-side imports),
// but that makes pure server-side helpers impossible to unit-test.
// Vitest aliases `server-only` → this file via vitest.config.ts.
export {};
