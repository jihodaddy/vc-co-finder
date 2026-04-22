'use client';

import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { searchParsers } from '@/lib/search/query-params';
import { Button } from '@/components/ui/button';

/**
 * UI-SPEC §Copywriting Contract — 0-result state.
 *
 * Contract (per spec):
 *   - Heading ("0개 기업") via `search.empty.heading`.
 *   - Body body + single next-step CTA via `search.empty.body`.
 *   - Inline `<Button variant="outline">` labeled `search.empty.clearCta`
 *     mirrors the chip bar's "모두 지우기" handler — clears all facets
 *     + resets `page=1`, preserves view/sort/per_page (D-03 persistence).
 *
 * No destructive style; clearing filters is a reset, not a destroy.
 */
export function ResultsEmpty() {
  const t = useTranslations('search');
  const [, setQuery] = useQueryStates(searchParsers, { shallow: false });

  function clearAll() {
    void setQuery({
      q: '',
      sectors: [],
      stage: [],
      region: [],
      employees: '',
      funding: '',
      founded: '',
      page: 1,
    });
  }

  return (
    <div className="flex flex-col gap-3 py-12">
      <h2 className="text-xl font-semibold">{t('empty.heading')}</h2>
      <p className="text-sm text-muted-foreground">{t('empty.body')}</p>
      <Button
        type="button"
        variant="outline"
        onClick={clearAll}
        className="self-start"
      >
        {t('empty.clearCta')}
      </Button>
    </div>
  );
}
