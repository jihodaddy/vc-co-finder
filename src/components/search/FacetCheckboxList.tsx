'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { searchParsers } from '@/lib/search/query-params';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * UI-SPEC §D-01 Facet item row — multi-select checkbox list with show-more/less.
 *
 * - Reads / writes URL state via nuqs `useQueryStates(searchParsers)` so that
 *   checkbox toggles produce shareable URLs (SRCH-06).
 * - Shows first `defaultLimit` items (8) inline; remaining items collapse
 *   behind a "더 보기 ({remaining})" toggle button (UI-SPEC §D-01 show-more
 *   rule triggered when items.length > 8).
 * - Resets `page` to 1 on every toggle so filter changes never land on a
 *   stale-out-of-range page (RESEARCH §Pitfall 6).
 * - Every user-visible string ("더 보기", "접기", count suffix) resolves
 *   through `t()`; zero hardcoded Korean in JSX.
 *
 * Props:
 *   - `paramKey`: which nuqs param this list drives — one of
 *     `'sectors' | 'stage' | 'region'` (the three multi-select URL keys).
 *   - `items`: `{ value, label, count? }[]` — already sorted by the caller
 *     (Plan 05 RSC passes `availableSectors/Stages/Regions` after its own
 *     alpha / facet-count ordering).
 *   - `defaultLimit`: optional, defaults to 8 per UI-SPEC.
 */
type Props = {
  paramKey: 'sectors' | 'stage' | 'region';
  items: Array<{ value: string; label: string; count?: number }>;
  defaultLimit?: number;
};

export function FacetCheckboxList({
  paramKey,
  items,
  defaultLimit = 8,
}: Props) {
  const t = useTranslations('search');
  const [query, setQuery] = useQueryStates(searchParsers, { shallow: false });
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, defaultLimit);
  const remaining = items.length - defaultLimit;
  const selected = query[paramKey];

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    void setQuery({ [paramKey]: next, page: 1 });
  }

  return (
    <>
      {visible.map((item) => {
        const checked = selected.includes(item.value);
        const id = `facet-${paramKey}-${item.value}`;
        return (
          <label
            key={item.value}
            htmlFor={id}
            className="flex items-center gap-2 h-8 cursor-pointer"
          >
            <Checkbox
              id={id}
              checked={checked}
              onCheckedChange={() => toggle(item.value)}
            />
            <span className="text-sm text-foreground">{item.label}</span>
            {typeof item.count === 'number' && (
              <span className="text-[11px] leading-tight text-muted-foreground ml-1">
                {t('facet.count', { count: item.count })}
              </span>
            )}
          </label>
        );
      })}
      {items.length > defaultLimit && (
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="text-sm text-muted-foreground hover:text-foreground self-start"
        >
          {expanded ? t('facet.showLess') : t('facet.showMore')}
          {!expanded && ` (${remaining})`}
        </button>
      )}
    </>
  );
}
