'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { searchParsers } from '@/lib/search/query-params';
import { EMPLOYEE_BUCKETS } from '@/lib/search/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * UI-SPEC §Range facet UX — Employees bucket chips + "직접 입력" popover.
 *
 * Renders the 6 industry-standard employee-count buckets (1-10 / 11-50 /
 * 51-200 / 201-500 / 501-1,000 / 1,000+) as single-select chips. A trailing
 * "직접 입력" popover exposes custom min/max for researchers who need a
 * precise range outside the bucket taxonomy.
 *
 * - Selecting a bucket writes `employees=${bucketKey}` (one of the 6 literal
 *   keys) to the URL; clicking the already-selected bucket clears it.
 * - Custom range writes `employees=${min}-${max}` (either side may be empty
 *   for open-ended ranges). This supersedes any active bucket.
 * - `page` resets to 1 on every change (RESEARCH §Pitfall 6).
 * - Every label (bucket copy, "직접 입력", "최소/최대", "적용") flows through
 *   `t()` — zero hardcoded Korean in JSX.
 * - Bucket labels reference `search.range.bucket.employees.{key}` keys
 *   pre-registered by Plan 01 in `src/messages/ko.json`.
 */
export function FacetRangeBuckets() {
  const t = useTranslations('search');
  const [query, setQuery] = useQueryStates(searchParsers, { shallow: false });
  const current = query.employees;
  const [minTxt, setMinTxt] = useState('');
  const [maxTxt, setMaxTxt] = useState('');

  function selectBucket(b: (typeof EMPLOYEE_BUCKETS)[number]) {
    void setQuery({ employees: b === current ? '' : b, page: 1 });
  }

  function commitCustom() {
    const min = Number.parseInt(minTxt, 10);
    const max = Number.parseInt(maxTxt, 10);
    const hasMin = Number.isFinite(min) && min >= 0;
    const hasMax = Number.isFinite(max) && max >= 0;
    if (!hasMin && !hasMax) return;
    if (hasMin && hasMax && min > max) return; // invalid — silent (input will show aria-invalid in parent when wired)
    const v = `${hasMin ? min : ''}-${hasMax ? max : ''}`;
    void setQuery({ employees: v, page: 1 });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {EMPLOYEE_BUCKETS.map((b) => {
        const selected = current === b;
        return (
          <button
            key={b}
            type="button"
            aria-pressed={selected}
            onClick={() => selectBucket(b)}
            className={cn(
              'h-8 px-3 rounded-full border text-sm',
              selected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {t(`range.bucket.employees.${b}`)}
          </button>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-full"
          >
            {t('range.customCta')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="flex flex-col gap-3">
            <Input
              type="number"
              inputMode="numeric"
              placeholder={t('range.from')}
              value={minTxt}
              onChange={(e) => setMinTxt(e.target.value)}
            />
            <Input
              type="number"
              inputMode="numeric"
              placeholder={t('range.to')}
              value={maxTxt}
              onChange={(e) => setMaxTxt(e.target.value)}
            />
            <Button type="button" onClick={commitCustom}>
              {t('drawer.applyCta')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
