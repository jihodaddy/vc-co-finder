'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/**
 * Error boundary for `/search`. Next App Router mandates this file be
 * a Client Component. Sentry (wired in Phase 1 instrumentation) captures
 * the error automatically — we render neutral copy (no raw error text
 * leaks to the user per T-03-05-02) and offer a "다시 시도" retry CTA.
 *
 * Copy source: UI-SPEC §Copywriting Contract — `search.error.*` keys.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('search');
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[search.error]', error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4 p-8">
      <h2 className="text-xl font-semibold">{t('error.heading')}</h2>
      <p className="text-sm text-muted-foreground">{t('error.body')}</p>
      <Button type="button" onClick={reset} className="self-start">
        {t('error.retryCta')}
      </Button>
    </div>
  );
}
