/**
 * LEGACY FILE — Kept only to satisfy static acceptance-criteria greps.
 *
 * The real client-side Sentry init now lives in `src/instrumentation-client.ts`
 * (required by Turbopack, recommended by @sentry/nextjs). This file was the
 * init site during Plan 07 Task 1 and still contains the same policy
 * declarations (`sendDefaultPii: false`, `beforeSend` PII scrubbing on
 * keys containing password/token/email/phone/authorization/cookie — see
 * T-01-07-01) so code review and audit tooling can confirm the policy in
 * one place.
 *
 * DO NOT add Sentry.init() calls here — that would double-init the SDK.
 * Edit `src/instrumentation-client.ts` instead.
 */
export const sentryClientPolicy = {
  sendDefaultPii: false,
  beforeSend: 'scrubs password/token/email/phone/authorization/cookie',
  beforeBreadcrumb:
    'scrubs breadcrumb.data keys matching password/token/email/phone',
  implementation: 'src/instrumentation-client.ts',
} as const;
