'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Error boundary for render/data failures on the company profile.
 *
 * Next App Router requires this file to be a Client Component. Sentry
 * (wired in Phase 1 instrumentation) captures the error automatically —
 * we just render user-friendly copy here and offer a retry.
 *
 * UI-SPEC §Copywriting: profile.error.heading + body + retryCta.
 */
export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('profile.error');
  useEffect(() => {
    // Surface to console in dev; Sentry picks up in prod via instrumentation
    // eslint-disable-next-line no-console
    console.error('[profile.error]', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold leading-tight">{t('heading')}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{t('body')}</p>
      <div className="mt-8">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded border px-4 py-2 text-sm hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t('retryCta')}
        </button>
      </div>
    </main>
  );
}
