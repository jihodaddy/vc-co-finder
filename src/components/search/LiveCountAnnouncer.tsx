'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { searchParsers } from '@/lib/search/query-params';

/**
 * Screen-reader-only live region that announces result-count changes
 * 300ms after URL state settles (UI-SPEC §Accessibility Contract
 * + §Interaction Timing).
 *
 * Why debounce: rapid checkbox toggles can commit the URL several
 * times per second; `aria-live="polite"` would otherwise fire a
 * cascade of announcements. The debounce coalesces them into one
 * user-audible message.
 *
 * Why depend on individual URL params (not a stable stringified
 * snapshot): `useQueryStates` returns a fresh object each render so
 * the reference identity changes even when values don't — keying on
 * individual params keeps the dependency list stable and predictable.
 *
 * First-render caveat: the initial announced count equals `count`,
 * so the first paint does NOT emit a screen-reader announcement.
 * Only CHANGES trigger the debounced message — this mirrors how
 * assistive technologies expect polite live regions to behave and
 * avoids spamming users who've just navigated to the page.
 */
export function LiveCountAnnouncer({ count }: { count: number }) {
  const t = useTranslations('search');
  const [query] = useQueryStates(searchParsers, { shallow: false });
  const [announced, setAnnounced] = useState(count);

  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(count), 300);
    return () => clearTimeout(timer);
  }, [
    count,
    query.q,
    query.sectors,
    query.stage,
    query.region,
    query.employees,
    query.funding,
    query.founded,
  ]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {t('results.liveRegion', { count: announced })}
    </div>
  );
}
