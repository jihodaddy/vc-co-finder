import { Skeleton } from '@/components/ui/skeleton';
import { getTranslations } from 'next-intl/server';
import type { ViewKey } from '@/lib/search/types';

/**
 * Loading skeleton for the results area (UI-SPEC §Loading state).
 *
 * Shape parity with the final view:
 *   - view=table → 10 table-row skeletons with cell widths matching
 *     ResultsTable column widths (UI-SPEC §Table view contract).
 *   - view=card  → 10 card-shaped skeletons in the same
 *     `@container`-driven grid used by ResultsCards.
 *
 * `aria-busy='true'` marks the region as in-flight; a visually-hidden
 * accompanying `<span class='sr-only'>` announces the loading state
 * via `search.loading.srLabel` → "검색 결과를 불러오는 중".
 *
 * This file is an RSC (runs on the server) — it reaches for
 * `next-intl/server` `getTranslations` rather than `useTranslations`,
 * which lets `loading.tsx` (a reserved Next.js RSC file) reuse it
 * directly without needing to be converted to a client component.
 *
 * Implementation of UI-SPEC `view` prop union with default `'table'`.
 */
type Props = {
  view?: ViewKey;
  rows?: number;
};

export async function ResultsSkeleton({ view = 'table', rows = 10 }: Props) {
  const t = await getTranslations('search');
  const srLabel = t('loading.srLabel');

  if (view === 'card') {
    return (
      <div
        aria-busy="true"
        role="status"
        className="@container"
      >
        <span className="sr-only">{srLabel}</span>
        <ul className="grid @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-4">
          {Array.from({ length: rows }).map((_, i) => (
            <li
              key={i}
              className="rounded-lg border bg-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-40" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div aria-busy="true" role="status">
      <span className="sr-only">{srLabel}</span>
      <div className="w-full border rounded-md overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/40">
          <Skeleton className="h-4 w-[28%]" />
          <Skeleton className="h-4 w-[14%]" />
          <Skeleton className="h-4 w-[18%]" />
          <Skeleton className="h-4 w-[14%]" />
          <Skeleton className="h-4 w-[12%]" />
          <Skeleton className="h-4 w-[14%]" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0"
          >
            <div className="flex items-center gap-2 w-[28%]">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-4 flex-1" />
            </div>
            <Skeleton className="h-4 w-[14%]" />
            <Skeleton className="h-4 w-[18%]" />
            <Skeleton className="h-4 w-[14%]" />
            <Skeleton className="h-4 w-[12%]" />
            <Skeleton className="h-4 w-[14%]" />
          </div>
        ))}
      </div>
    </div>
  );
}
