import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const baseConfig: NextConfig = {
  typedRoutes: true,
};

const sentryOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Stay quiet locally / in CI when no auth token is provided.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Skip sourcemap upload unless prod/preview supplied SENTRY_AUTH_TOKEN.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Tunnel Sentry events through our origin to bypass ad-blockers.
  tunnelRoute: '/monitoring',
  // Don't expose source mapping URLs publicly (T-01-07-07).
  hideSourceMaps: true,
  disableLogger: true,
};

export default withSentryConfig(withNextIntl(baseConfig), sentryOptions);
