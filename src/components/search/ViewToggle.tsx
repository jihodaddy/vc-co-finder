'use client';

import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { List, LayoutGrid } from 'lucide-react';
import { searchParsers } from '@/lib/search/query-params';
import { cn } from '@/lib/utils';
import type { ViewKey } from '@/lib/search/types';

/**
 * UI-SPEC §D-06 table/card view toggle — segmented button (radiogroup).
 *
 * Visual contract:
 *   - container: `inline-flex h-9 p-1 rounded-md border border-border`
 *   - active segment: `bg-primary text-primary-foreground`
 *   - inactive segment: `bg-transparent text-muted-foreground`
 *   - mobile (<sm): icon-only with sr-only label; desktop shows label text.
 *
 * Accessibility: `role="radiogroup"` wrapper + per-segment `role="radio"`
 * + `aria-checked` per UI-SPEC §Accessibility Contract.
 *
 * Commits `view` to URL via nuqs; no `page` reset (changing view does not
 * invalidate the current page of results).
 */
export function ViewToggle() {
  const t = useTranslations('search');
  const [query, setQuery] = useQueryStates(searchParsers, { shallow: false });

  function select(v: ViewKey) {
    void setQuery({ view: v });
  }

  const segments: Array<{
    key: ViewKey;
    label: string;
    Icon: typeof List;
  }> = [
    { key: 'table', label: t('results.view.table'), Icon: List },
    { key: 'card', label: t('results.view.card'), Icon: LayoutGrid },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t('results.view.srLabel')}
      className="inline-flex h-9 p-1 rounded-md border border-border"
    >
      {segments.map(({ key, label, Icon }) => {
        const active = query.view === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => select(key)}
            className={cn(
              'h-7 px-3 rounded-sm text-sm inline-flex items-center gap-1.5 transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
