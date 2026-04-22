'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import type { SearchHit } from '@/lib/search/types';
import { STAGE_KEYS } from '@/lib/format/stage';
import { Badge } from '@/components/ui/badge';
import { formatKRW } from '@/lib/format/currency';
import { stageLabel } from '@/lib/format/stage';
import { formatProfileDate } from '@/lib/format/date';
import { freshnessLevel, FRESHNESS_DOT_CLASS } from '@/lib/data/freshness';
import { cn } from '@/lib/utils';

/**
 * UI-SPEC §Card view contract (D-06 alternative to table).
 *
 * Layout (UI-SPEC §Card view contract):
 *   - Outer `@container` wrapper so grid scales by container width, not viewport
 *     (Phase 2 FundingRoundsTable carry-forward pattern).
 *   - `@sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4` — breakpoints
 *     relative to the container.
 *   - Each card: logo + name → sector badge → latest round + freshness →
 *     metadata row (3-col grid: 누적 / 직원 / 설립) → wrapping `<a>` link.
 *
 * CompanyLogo is an async RSC; this client component renders a letter
 * avatar inline (same pattern as ResultsTable).
 */
type Props = { hits: SearchHit[] };

export function ResultsCards({ hits }: Props) {
  const t = useTranslations('search');
  const locale = useLocale();

  function safeStageLabel(stage: string | null): string {
    if (!stage) return '';
    if ((STAGE_KEYS as readonly string[]).includes(stage)) {
      return stageLabel(stage);
    }
    return stage;
  }

  return (
    <div className="@container">
      <ul className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-4">
        {hits.map((h) => {
          const level = freshnessLevel(h.lastVerifiedAt);
          const letter = h.displayNameKo.trim().charAt(0) || '?';
          return (
            <li key={h.id}>
              <Link
                href={`/${locale}/companies/${h.slug}`}
                aria-label={t('card.rowLink.srLabel', {
                  companyName: h.displayNameKo,
                })}
                className="block rounded-lg border bg-card p-4 flex flex-col gap-3 hover:bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground text-base font-semibold"
                  >
                    {letter}
                  </span>
                  <span className="font-semibold truncate">
                    {h.displayNameKo}
                  </span>
                </div>
                {h.sector && (
                  <div>
                    <Badge variant="secondary">{h.sector}</Badge>
                  </div>
                )}
                <div className="text-sm">
                  {h.latestRoundStage ? (
                    <span className="inline-flex items-center gap-1">
                      <span>{safeStageLabel(h.latestRoundStage)}</span>
                      {h.latestRoundAnnouncedAt && (
                        <span className="text-muted-foreground">
                          · {formatProfileDate(h.latestRoundAnnouncedAt)}
                        </span>
                      )}
                      <span
                        aria-hidden
                        className={cn(
                          'ml-1 inline-block h-1.5 w-1.5 rounded-full bg-current',
                          FRESHNESS_DOT_CLASS[level],
                        )}
                      />
                      <span className="sr-only">
                        {level} · {formatProfileDate(h.lastVerifiedAt)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">
                      {t('columns.cumulativeFunding')}
                    </dt>
                    <dd className="tabular-nums">
                      {h.cumulativeFundingMinor
                        ? formatKRW(BigInt(h.cumulativeFundingMinor))
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t('columns.employees')}
                    </dt>
                    <dd className="tabular-nums">
                      {h.employeesLatest ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t('columns.foundedYear')}
                    </dt>
                    <dd className="tabular-nums">{h.foundedYear ?? '—'}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
