'use server';

/**
 * Intentional error — fired from `/[locale]/_debug/sentry-test` to verify
 * Sentry captures Server Action errors (Plan 07 phase success criterion #5).
 *
 * The route is in the `(public)` group so unauthenticated probes work, and
 * the page is not linked from anywhere — it stays as a hidden diagnostic
 * utility post Plan 08 smoke test (T-01-07-08 accepted).
 */
export async function throwServerActionError(): Promise<void> {
  throw new Error(
    'Sentry verification: deliberate server-action error (safe to ignore)'
  );
}
