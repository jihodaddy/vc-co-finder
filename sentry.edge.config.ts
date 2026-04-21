import * as Sentry from '@sentry/nextjs';

// Edge runtime is used by middleware. Keep the config minimal — Edge can't
// run heavy scrubbers, and middleware paths shouldn't be carrying PII.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
});
