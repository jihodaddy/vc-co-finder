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
      <p className="text-xl font-semibold">
        {t('results.count', { count: total })}
      </p>
      <div className="flex items-center gap-2">
        <SortTrigger />
        <ViewToggle />
      </div>
    </div>
  );
}
