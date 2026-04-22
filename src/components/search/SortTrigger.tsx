'use client';

import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { Check, ChevronDown } from 'lucide-react';
import { searchParsers } from '@/lib/search/query-params';
import { SORT_KEYS } from '@/lib/search/types';
import type { SortKey } from '@/lib/search/types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

/**
 * UI-SPEC §D-07/D-08 — sort selector (8 options, 4 columns × ASC/DESC).
 *
 * Rendering split (UI-SPEC §D-08):
 *   - Desktop (`sm:block`): DropdownMenu with `정렬: {current label}` trigger;
 *     active item has a leading Check glyph.
 *   - Mobile (`sm:hidden`): native-feel Select with just the current label.
 *
 * URL commit: sets `sort` + resets `page=1` (changing sort should always
 * return to the top of the result set).
 */
export function SortTrigger() {
  const t = useTranslations('search');
  const [query, setQuery] = useQueryStates(searchParsers, { shallow: false });
  const current = query.sort;
  const currentLabel = t(`sort.${current}` as const);

  function select(k: SortKey) {
    void setQuery({ sort: k, page: 1 });
  }

  return (
    <>
      <div className="hidden sm:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-haspopup="menu"
              aria-label={`${t('results.sortBy')}: ${currentLabel}`}
              className="gap-2"
            >
              <span>
                {t('results.sortBy')}: {currentLabel}
              </span>
              <ChevronDown aria-hidden className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[14rem]">
            {SORT_KEYS.map((k) => {
              const active = k === current;
              return (
                <DropdownMenuItem
                  key={k}
                  onSelect={() => select(k)}
                  aria-checked={active}
                  className="flex items-center gap-2"
                >
                  <span className="w-4 inline-flex justify-center">
                    {active ? (
                      <Check aria-hidden className="h-4 w-4 text-primary" />
                    ) : null}
                  </span>
                  <span className={active ? 'font-semibold' : ''}>
                    {t(`sort.${k}` as const)}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="sm:hidden">
        <Select value={current} onValueChange={(v) => select(v as SortKey)}>
          <SelectTrigger
            size="sm"
            aria-label={`${t('results.sortBy')}: ${currentLabel}`}
          >
            <SelectValue placeholder={currentLabel} />
          </SelectTrigger>
          <SelectContent>
            {SORT_KEYS.map((k) => (
              <SelectItem key={k} value={k}>
                {t(`sort.${k}` as const)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
