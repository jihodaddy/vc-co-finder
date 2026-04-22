import { Skeleton } from '@/components/ui/skeleton';
import { getTranslations } from 'next-intl/server';
import type { ViewKey } from '@/lib/search/types';

/**
 * Loading skeleton for the results area (UI-SPEC §Loading state).
 *
 * Shape parity with the final view:
 *   - view=table → N table-row skeletons with cell widths matching
 *     ResultsTable column widths (UI-SPEC §Table view contract).
 *   - view=card  → N card-shaped skeletons in the same
 *     `@container`-driven grid used by ResultsCards.
 *
 * Row-count rule (Plan 06 — Phase 3 Wave 5 polish):
 *   - Callers may pass `perPage` to match the current URL `per_page`
 *     query param so the skeleton anchors to how many rows the user
 *     has chosen to see (25 / 50 / 100). The actual number rendered
 *     is capped at 10 to prevent DOM bloat; users on per_page=100
 *     still only see 10 skeleton rows during the brief loading flash.
 *   - Legacy `rows` prop is retained for non-search callers (loading.tsx
 *     reserved segment) — when both are passed, `perPage` wins.
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
  perPage?: number;
};

const MAX_SKELETON_ROWS = 10;

export async function ResultsSkeleton({ view = 'table', rows, perPage }: Props) {
  const t = await getTranslations('search');
  const srLabel = t('loading.srLabel');
  // Resolve render count: perPage wins when supplied; fall back to `rows`;
  // default to MAX_SKELETON_ROWS. Always cap at MAX_SKELETON_ROWS so a user
  // who selected per_page=100 sees a proportional-but-bounded skeleton.
  const requested = perPage ?? rows ?? MAX_SKELETON_ROWS;
  const count = Math.max(1, Math.min(requested, MAX_SKELETON_ROWS));

  if (view === 'card') {
    return (
      <div
        aria-busy="true"
        role="status"
        className="@container"
      >
        <span className="sr-only">{srLabel}</span>
        <ul className="grid @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-4">
          {Array.from({ length: count }).map((_, i) => (
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
        {Array.from({ length: count }).map((_, i) => (
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
