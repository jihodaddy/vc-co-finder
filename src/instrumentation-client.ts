// Next.js 15 client-instrumentation entry. Loaded automatically by Next.js
// before any client React code runs. Per @sentry/nextjs guidance the SDK
// init MUST live here (not `sentry.client.config.ts`) for Turbopack support.
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: isProd
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE_PROD ?? 0.01)
    : Number(process.env.SENTRY_TRACES_SAMPLE_RATE_DEV ?? 0.1),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // PII scrubbing — per threat_model_requirement Plan 07 T-01-07-01
  sendDefaultPii: false,
  beforeSend(event) {
    return scrubPii(event);
  },
  beforeBreadcrumb(breadcrumb) {
    return scrubBreadcrumb(breadcrumb);
  },
});

// Tracks navigation transitions for App Router so RSC payload requests get
// linked to the correct page span. Required by @sentry/nextjs >= 9.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

function scrubPii(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const sensitive = [
    'password',
    'token',
    'email',
    'phone',
    'authorization',
    'cookie',
  ];
  const scrubObject = (obj: unknown): void => {
    if (!obj || typeof obj !== 'object') return;
    const target = obj as Record<string, unknown>;
    for (const key of Object.keys(target)) {
      if (sensitive.some((s) => key.toLowerCase().includes(s))) {
        target[key] = '[scrubbed]';
      } else if (typeof target[key] === 'object') {
        scrubObject(target[key]);
      }
    }
  };
  if (event.request) {
    // Nuke headers entirely to avoid cookie/authorization leak.
    delete (event.request as Record<string, unknown>).headers;
    scrubObject((event.request as Record<string, unknown>).data);
    scrubObject((event.request as Record<string, unknown>).query_string);
  }
  scrubObject(event.extra as unknown);
  scrubObject(event.contexts as unknown);
  return event;
}

function scrubBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  if (breadcrumb?.data) {
    const sensitive = ['password', 'token', 'email', 'phone'];
    const data = breadcrumb.data as Record<string, unknown>;
    for (const key of Object.keys(data)) {
      if (sensitive.some((s) => key.toLowerCase().includes(s))) {
        data[key] = '[scrubbed]';
      }
    }
  }
  return breadcrumb;
}
