'use client';

import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { searchParsers } from '@/lib/search/query-params';
import { FacetSidebar } from './FacetSidebar';
import { FacetDrawer } from './FacetDrawer';
import { ActiveFilterChips } from './ActiveFilterChips';
import { ResultsHeader } from './ResultsHeader';
import { ResultsTable } from './ResultsTable';
import { ResultsCards } from './ResultsCards';
import { ResultsEmpty } from './ResultsEmpty';
import { Pagination } from './Pagination';
import { SearchInput } from './SearchInput';
import { LiveCountAnnouncer } from './LiveCountAnnouncer';
import type { SearchResult } from '@/lib/search/types';
import type { FacetDomain } from '@/lib/search/facet-domain';

/**
 * Client composition root for `/search` (UI-SPEC §Page structure).
 *
 * Receives the RSC-computed `result` (hits + facets + total) and the
 * `domain` (available sector/stage/region values). Reads the current
 * `view` from nuqs so the table↔card toggle flips without remounting
 * the entire tree.
 *
 * Layout contract (UI-SPEC §Page structure + §Responsive Contract):
 *   - Desktop: `grid-cols-[minmax(280px,320px)_1fr]` — sticky sidebar
 *     on the left, results region on the right.
 *   - Mobile: single column; FacetSidebar hidden via its own `w-72`
 *     only-on-desktop expectation; FacetDrawer renders a fixed pill
 *     trigger that opens the bottom sheet.
 *
 * `SearchInput` is injected as the sidebar's top slot (desktop) AND
 * rendered at the top of the results column (mobile only, `lg:hidden`).
 */
type Props = {
  result: SearchResult;
  domain: FacetDomain;
};

export function SearchPage({ result, domain }: Props) {
  const t = useTranslations('search');
  const [query] = useQueryStates(searchParsers, { shallow: false });
  const view = query.view;

  return (
    <main className="container mx-auto px-4 py-6 lg:py-12">
      <h1 className="sr-only">{t('page.title')}</h1>
      <LiveCountAnnouncer count={result.total} />

      <div className="lg:grid lg:grid-cols-[minmax(280px,320px)_1fr] lg:gap-8">
        <div className="hidden lg:block">
          <FacetSidebar
            facets={result.facets}
            availableSectors={domain.sectors}
            availableStages={domain.stages}
            availableRegions={domain.regions}
            searchInputSlot={<SearchInput />}
          />
        </div>
        <FacetDrawer
          facets={result.facets}
          availableSectors={domain.sectors}
          availableStages={domain.stages}
          availableRegions={domain.regions}
        />

        <section
          role="region"
          aria-label={t('results.sortBy')}
          className="flex flex-col gap-6 min-w-0"
        >
          <div className="lg:hidden pb-4 border-b">
            <SearchInput />
          </div>
          <ActiveFilterChips />
          <ResultsHeader total={result.total} />
          {result.total === 0 ? (
            <ResultsEmpty />
          ) : view === 'card' ? (
            <ResultsCards hits={result.hits} />
          ) : (
            <ResultsTable hits={result.hits} />
          )}
          <Pagination total={result.total} />
        </section>
      </div>
    </main>
  );
}
