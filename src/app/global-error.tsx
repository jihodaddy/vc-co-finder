'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Global error boundary. Required by @sentry/nextjs so React rendering
 * errors at the root also funnel into Sentry (not just runtime thrown
 * errors inside event handlers).
 *
 * Styled minimally — the layout chain above this boundary may itself be
 * broken, so we keep dependencies to zero: no i18n, no NextIntlProvider,
 * no globals.css (those might be the thing that's broken).
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main
          style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            padding: '2rem',
          }}
        >
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              예기치 못한 오류가 발생했습니다.
            </h1>
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
              문제가 계속되면 잠시 후 다시 시도해 주세요.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
