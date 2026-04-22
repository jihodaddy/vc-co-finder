'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

/**
 * Error boundary for `/search`. Next App Router mandates this file be
 * a Client Component.
 *
 * Sentry forwarding (Plan 06 — Phase 3 Wave 5 polish, carry-forward of
 * Phase 1 FOUND-13): `Sentry.captureException` is called explicitly from
 * a useEffect so the error boundary participates in observability rather
 * than relying on Next's auto-capture. Tags are an explicit allowlist
 * (`route`, `phase`) — no query params, no user data, so T-03-06-01
 * (Information Disclosure via Sentry leak) stays mitigated. The
 * instrumentation-client `beforeSend` hook scrubs PII from
 * `error.message` as a second line of defense.
 *
 * We render neutral copy (no `error.message` / `error.stack` leak per
 * T-03-05-02 / T-03-06-04) and offer a "다시 시도" retry CTA.
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
    Sentry.captureException(error, {
      tags: { route: '/search', phase: '3' },
    });
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
