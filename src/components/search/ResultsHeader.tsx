'use client';

import { useTranslations } from 'next-intl';
import { SortTrigger } from './SortTrigger';
import { ViewToggle } from './ViewToggle';

/**
 * UI-SPEC §D-06/D-07/D-08 results header — row above the results body
 * that carries the live count (Heading size/weight), sort selector, and
 * view toggle.
 *
 * Accessibility: the count is rendered via `search.results.count` ICU
 * (number-formatted in ko-KR); aria-live is not attached here because
 * D-09's live region (Plan 06 scope) handles count announcements.
 */
type Props = { total: number };

export function ResultsHeader({ total }: Props) {
  const t = useTranslations('search');
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span aria-hidden className="relative inline-flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--primary)] opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--primary)]" />
        </span>
        <span className="font-mono uppercase text-[11px] tracking-[0.3em] text-muted-foreground">
          {t('results.liveLabel')}
        </span>
        <p className="text-xl font-semibold tabular-nums">
          {t('results.count', { count: total })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <SortTrigger />
        <ViewToggle />
      </div>
    </div>
  );
}
