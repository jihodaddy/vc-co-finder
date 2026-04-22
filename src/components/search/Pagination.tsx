'use client';

import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { searchParsers } from '@/lib/search/query-params';
import { paginationWindow } from '@/lib/search/pagination';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PerPageKey } from '@/lib/search/types';

/**
 * UI-SPEC §D-09 Pagination.
 *
 * Renders numeric pagination (current ± 2 with first/last anchors), a
 * `per_page` Select (25/50/100), and a left-side "1-25 / 1,247개 기업"
 * summary line (hidden on mobile to save vertical space).
 *
 * Relies on the `paginationWindow()` helper from Plan 03 so we're not
 * hand-rolling the current-± edge cases here.
 *
 * Returns `null` when `total === 0` — the empty state owns that screen
 * region (UI-SPEC §Loading state rule: "count while loading" skeleton,
 * but empty state suppresses pagination entirely).
 */
type Props = { total: number };

export function Pagination({ total }: Props) {
  const t = useTranslations('search');
  const [query, setQuery] = useQueryStates(searchParsers, { shallow: false });
  const perPage = Number(query.per_page);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, query.page), totalPages);
  const windowPages = paginationWindow(page, totalPages, 2);
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(start + perPage - 1, total);

  if (total === 0) return null;

  function go(p: number) {
    void setQuery({ page: p });
  }

  function changePerPage(v: string) {
    void setQuery({ per_page: v as PerPageKey, page: 1 });
  }

  return (
    <nav
      aria-label={t('pagination.summary', { start, end, total })}
      className="flex flex-col sm:flex-row items-center justify-between gap-4"
    >
      <p className="hidden sm:block text-[11px] text-muted-foreground">
        {t('pagination.summary', { start, end, total })}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => go(1)}
          aria-label={t('pagination.first')}
        >
          <ChevronsLeft aria-hidden className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          aria-label={t('pagination.prev')}
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </Button>
        {windowPages.map((p, i) =>
          p === '...' ? (
            <span
              key={`dot-${i}`}
              aria-hidden
              className="px-2 text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              type="button"
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => go(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          aria-label={t('pagination.next')}
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => go(totalPages)}
          aria-label={t('pagination.last')}
        >
          <ChevronsRight aria-hidden className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-sm text-muted-foreground">
          {t('pagination.perPage')}
        </span>
        <Select
          value={String(query.per_page)}
          onValueChange={changePerPage}
        >
          <SelectTrigger size="sm" className="h-9 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
}
