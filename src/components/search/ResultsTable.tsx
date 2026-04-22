'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { searchParsers } from '@/lib/search/query-params';
import type { SearchHit, SortKey } from '@/lib/search/types';
import { STAGE_KEYS } from '@/lib/format/stage';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatKRW } from '@/lib/format/currency';
import { stageLabel } from '@/lib/format/stage';
import { formatProfileDate } from '@/lib/format/date';
import { freshnessLevel, FRESHNESS_DOT_CLASS } from '@/lib/data/freshness';
import { cn } from '@/lib/utils';

/**
 * UI-SPEC §Table view contract — 6-column sortable table (D-05).
 *
 * Columns (all widths in UI-SPEC §Table view contract):
 *   1. 기업명 (28%)           — logo + display name, link to /companies/slug
 *   2. 섹터 (14%)
 *   3. 최신 라운드 (18%)       — stageLabel · formatProfileDate + freshness dot
 *   4. 누적 투자액 (14% right) — formatKRW, tabular-nums
 *   5. 직원 수 (12% right)     — tabular-nums
 *   6. 설립 연도 (14% right)   — 4-digit year
 *
 * Sortable columns (UI-SPEC §D-08): name, recent_funding, cumulative_funding,
 * founded. Sector + employees headers are not clickable (no sort). Clicking
 * a sortable header cycles ASC ↔ DESC via `sort` URL param; `page` resets to 1.
 *
 * Freshness dot (UI-SPEC §Freshness semantic palette):
 *   - Rendered at the right edge of the 최신 라운드 cell
 *   - `aria-hidden` + sibling `<span class="sr-only">` with level + date for SR
 *   - Uses FRESHNESS_DOT_CLASS (Phase 2 palette — single source of truth)
 *
 * Row links use `<Link href="/{locale}/companies/{slug}">` so middle-click
 * / open-in-new-tab keep working (UI-SPEC §Accessibility Contract).
 *
 * CompanyLogo is an async RSC (server-only), so the table renders a
 * letter-avatar fallback inline — keeps this file a pure client component.
 */
type Props = { hits: SearchHit[] };

type SortCol = 'name' | 'recent_funding' | 'cumulative_funding' | 'founded';

function ascKey(col: SortCol): SortKey {
  return `${col}_asc` as SortKey;
}
function descKey(col: SortCol): SortKey {
  return `${col}_desc` as SortKey;
}

function freshnessI18n(level: 'fresh' | 'stale' | 'expired'): string {
  // Carry-forward `profile.freshness.*` (Phase 2 single source of truth).
  // The table renders only screen-reader text so a raw map is sufficient
  // here; no visible chrome depends on this string.
  return level;
}

export function ResultsTable({ hits }: Props) {
  const t = useTranslations('search');
  const locale = useLocale();
  const [query, setQuery] = useQueryStates(searchParsers, { shallow: false });
  const current = query.sort;

  function cycle(col: SortCol) {
    const next: SortKey =
      current === ascKey(col) ? descKey(col) : current === descKey(col) ? ascKey(col) : descKey(col);
    void setQuery({ sort: next, page: 1 });
  }

  function arrowFor(col: SortCol) {
    if (current === ascKey(col)) {
      return (
        <ArrowUp
          aria-hidden
          className="h-3.5 w-3.5 text-primary inline ml-1"
        />
      );
    }
    if (current === descKey(col)) {
      return (
        <ArrowDown
          aria-hidden
          className="h-3.5 w-3.5 text-primary inline ml-1"
        />
      );
    }
    return (
      <ArrowUpDown
        aria-hidden
        className="h-3.5 w-3.5 text-muted-foreground inline ml-1"
      />
    );
  }

  function ariaSortFor(col: SortCol): 'ascending' | 'descending' | 'none' {
    if (current === ascKey(col)) return 'ascending';
    if (current === descKey(col)) return 'descending';
    return 'none';
  }

  function safeStageLabel(stage: string | null): string {
    if (!stage) return '';
    if ((STAGE_KEYS as readonly string[]).includes(stage)) {
      return stageLabel(stage);
    }
    return stage;
  }

  return (
    <Table>
      <TableCaption className="sr-only">{t('page.title')}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead
            className="w-[28%] cursor-pointer select-none"
            aria-sort={ariaSortFor('name')}
            onClick={() => cycle('name')}
          >
            {t('columns.name')}
            {arrowFor('name')}
          </TableHead>
          <TableHead className="w-[14%]">{t('columns.sector')}</TableHead>
          <TableHead
            className="w-[18%] cursor-pointer select-none"
            aria-sort={ariaSortFor('recent_funding')}
            onClick={() => cycle('recent_funding')}
          >
            {t('columns.latestRound')}
            {arrowFor('recent_funding')}
          </TableHead>
          <TableHead
            className="w-[14%] text-right cursor-pointer select-none"
            aria-sort={ariaSortFor('cumulative_funding')}
            onClick={() => cycle('cumulative_funding')}
          >
            {t('columns.cumulativeFunding')}
            {arrowFor('cumulative_funding')}
          </TableHead>
          <TableHead className="w-[12%] text-right">
            {t('columns.employees')}
          </TableHead>
          <TableHead
            className="w-[14%] text-right cursor-pointer select-none"
            aria-sort={ariaSortFor('founded')}
            onClick={() => cycle('founded')}
          >
            {t('columns.foundedYear')}
            {arrowFor('founded')}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {hits.map((h) => {
          const level = freshnessLevel(h.lastVerifiedAt);
          const letter = h.displayNameKo.trim().charAt(0) || '?';
          return (
            <TableRow key={h.id} className="hover:bg-muted/40">
              <TableCell className="py-3">
                <Link
                  href={`/${locale}/companies/${h.slug}`}
                  aria-label={t('table.rowLink.srLabel', {
                    companyName: h.displayNameKo,
                  })}
                  className="flex items-center gap-2 font-semibold text-foreground"
                >
                  <span
                    aria-hidden
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground text-xs font-semibold"
                  >
                    {letter}
                  </span>
                  <span>{h.displayNameKo}</span>
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {h.sector ?? '—'}
              </TableCell>
              <TableCell>
                {h.latestRoundStage ? (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="font-normal">
                      {safeStageLabel(h.latestRoundStage)}
                    </span>
                    {h.latestRoundAnnouncedAt && (
                      <span className="text-muted-foreground">
                        · {formatProfileDate(h.latestRoundAnnouncedAt)}
                      </span>
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        'ml-2 inline-block h-1.5 w-1.5 rounded-full bg-current',
                        FRESHNESS_DOT_CLASS[level],
                      )}
                    />
                    <span className="sr-only">
                      {freshnessI18n(level)} ·{' '}
                      {formatProfileDate(h.lastVerifiedAt)}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="tabular-nums text-right">
                {h.cumulativeFundingMinor
                  ? formatKRW(BigInt(h.cumulativeFundingMinor))
                  : '—'}
              </TableCell>
              <TableCell className="tabular-nums text-right">
                {h.employeesLatest ?? '—'}
              </TableCell>
              <TableCell className="tabular-nums text-right">
                {h.foundedYear ?? '—'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
