'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { FacetGroup } from './FacetGroup';
import { FacetCheckboxList } from './FacetCheckboxList';
import { FacetRangeBuckets } from './FacetRangeBuckets';
import { FacetRangeInputs } from './FacetRangeInputs';
import type { FacetCounts } from '@/lib/search/types';

/**
 * UI-SPEC §D-01 Desktop sidebar — sticky left rail, 280–320px, all 6 facet
 * groups **always expanded** (no accordion). Order per D-04:
 *   sector → stage → region → employees → funding → founded.
 *
 * Search input (Plan 05 SearchInput component) is injected via the
 * `searchInputSlot` prop so this component stays independent of the
 * autocomplete implementation.
 *
 * Accessibility: wrapping `<aside aria-label=...>` resolves via
 * `t('drawer.heading')` → "필터" (same copy in ko.json for consistency
 * between desktop sidebar and mobile drawer; screen-reader lands the same
 * landmark name across breakpoints).
 */
type Props = {
  facets: FacetCounts;
  availableSectors: string[];
  availableStages: string[];
  availableRegions: string[];
  searchInputSlot?: ReactNode;
};

export function FacetSidebar({
  facets,
  availableSectors,
  availableStages,
  availableRegions,
  searchInputSlot,
}: Props) {
  const t = useTranslations('search');
  const sectorItems = availableSectors.map((s) => ({
    value: s,
    label: s,
    count: facets.sector[s] ?? 0,
  }));
  const stageItems = availableStages.map((s) => ({
    value: s,
    label: s,
    count: facets.stage[s] ?? 0,
  }));
  const regionItems = availableRegions.map((r) => ({
    value: r,
    label: r,
    count: facets.region[r] ?? 0,
  }));

  return (
    <aside
      aria-label={t('drawer.heading')}
      className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto w-72 min-w-[280px] max-w-[320px] border-r border-[color:var(--border)] pr-4"
    >
      {searchInputSlot && (
        <div className="pb-4 border-b mb-4">{searchInputSlot}</div>
      )}
      <FacetGroup labelKey="sector">
        <FacetCheckboxList paramKey="sectors" items={sectorItems} />
      </FacetGroup>
      <FacetGroup labelKey="stage">
        <FacetCheckboxList paramKey="stage" items={stageItems} />
      </FacetGroup>
      <FacetGroup labelKey="region">
        <FacetCheckboxList paramKey="region" items={regionItems} />
      </FacetGroup>
      <FacetGroup labelKey="employees">
        <FacetRangeBuckets />
      </FacetGroup>
      <FacetGroup labelKey="funding">
        <FacetRangeInputs paramKey="funding" />
      </FacetGroup>
      <FacetGroup labelKey="founded" withSeparator={false}>
        <FacetRangeInputs paramKey="founded" />
      </FacetGroup>
    </aside>
  );
}
