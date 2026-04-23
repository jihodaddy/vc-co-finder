'use client';

import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { searchParsers } from '@/lib/search/query-params';
import { stageLabel } from '@/lib/format/stage';
import { formatKRW } from '@/lib/format/currency';
import { Badge } from '@/components/ui/badge';

/**
 * UI-SPEC §D-03 Active filter chip bar.
 *
 * Position: ABOVE the results area (Plan 05 composes this above the
 * ResultsTable / ResultsCards; the sidebar has its OWN checkbox state — the
 * chip bar is a "summary + quick-remove" role per CONTEXT D-03).
 *
 * Chip label format per facet type (UI-SPEC §D-03 label-format table):
 *   - sector / stage / region (multi-select): one chip per value
 *     - stage uses stageLabel() for Korean copy (e.g., "시리즈 A")
 *   - employees bucket: `{label} {bucketCopy}` via search.range.bucket.*
 *   - employees custom range: `{label} {min}-{max}명`
 *   - funding: `{label} {min}-{max}` / `{label} {min} 이상` / `{label} {max} 이하`
 *     with both bounds formatKRW-d
 *   - founded: `{label} {min}-{max}년` / `{label} {min}년 이후` / `{label} {max}년 이전`
 *
 * Accessibility (UI-SPEC §Accessibility Contract):
 *   - wrapping <ul role="group"> gets aria-label via t('chip.activeLabel')
 *     — MUST be i18n-wired per Plan 04 must-have #10 (no literal fallback)
 *   - each chip remove <button> has aria-label="{label} 제거"
 *
 * "모두 지우기" clears q / sectors / stage / region / employees / funding /
 * founded and resets page=1. View / sort / per_page are PRESERVED per D-03
 * ("those persist") — mitigation for T-03-04-06 (accidental pref loss).
 *
 * Returns null when no filters active — no empty-row DOM.
 */
type Chip = {
  key: string;
  facet: string;
  label: string;
  remove: () => void;
};

const EMPLOYEE_BUCKET_KEYS = [
  '1_10',
  '11_50',
  '51_200',
  '201_500',
  '501_1000',
  '1001_plus',
] as const;

type EmployeeBucketKey = (typeof EMPLOYEE_BUCKET_KEYS)[number];

function isBucket(v: string): v is EmployeeBucketKey {
  return (EMPLOYEE_BUCKET_KEYS as readonly string[]).includes(v);
}

export function ActiveFilterChips() {
  const t = useTranslations('search');
  const [query, setQuery] = useQueryStates(searchParsers, { shallow: false });
  const chips: Chip[] = [];

  query.sectors.forEach((v) =>
    chips.push({
      key: `sector:${v}`,
      facet: t('facet.sector.label'),
      label: v,
      remove: () =>
        void setQuery({
          sectors: query.sectors.filter((s) => s !== v),
          page: 1,
        }),
    }),
  );
  query.stage.forEach((v) =>
    chips.push({
      key: `stage:${v}`,
      facet: t('facet.stage.label'),
      label: stageLabel(v),
      remove: () =>
        void setQuery({
          stage: query.stage.filter((s) => s !== v),
          page: 1,
        }),
    }),
  );
  query.region.forEach((v) =>
    chips.push({
      key: `region:${v}`,
      facet: t('facet.region.label'),
      label: v,
      remove: () =>
        void setQuery({
          region: query.region.filter((s) => s !== v),
          page: 1,
        }),
    }),
  );

  if (query.employees) {
    const facetLabel = t('facet.employees.label');
    const empLabel = isBucket(query.employees)
      ? `${facetLabel} ${t(`range.bucket.employees.${query.employees}`)}`
      : (() => {
          const [mn = '', mx = ''] = query.employees.split('-');
          const unit = t('range.unit.employees');
          if (mn && mx) {
            return t('chip.range.between', {
              label: facetLabel,
              min: `${mn}`,
              max: `${mx}${unit}`,
            });
          }
          if (mn) {
            return t('chip.range.atLeast', {
              label: facetLabel,
              min: `${mn}${unit}`,
            });
          }
          return t('chip.range.atMost', {
            label: facetLabel,
            max: `${mx}${unit}`,
          });
        })();
    chips.push({
      key: 'employees',
      facet: facetLabel,
      label: empLabel,
      remove: () => void setQuery({ employees: '', page: 1 }),
    });
  }

  if (query.funding) {
    const facetLabel = t('facet.funding.label');
    const [mn = '', mx = ''] = query.funding.split('-');
    let fundLabel: string;
    if (mn && mx) {
      fundLabel = t('chip.range.between', {
        label: facetLabel,
        min: formatKRW(BigInt(mn)),
        max: formatKRW(BigInt(mx)),
      });
    } else if (mn) {
      fundLabel = t('chip.range.atLeast', {
        label: facetLabel,
        min: formatKRW(BigInt(mn)),
      });
    } else {
      fundLabel = t('chip.range.atMost', {
        label: facetLabel,
        max: formatKRW(BigInt(mx)),
      });
    }
    chips.push({
      key: 'funding',
      facet: facetLabel,
      label: fundLabel,
      remove: () => void setQuery({ funding: '', page: 1 }),
    });
  }

  if (query.founded) {
    const facetLabel = t('facet.founded.label');
    const unit = t('range.unit.year');
    const [mn = '', mx = ''] = query.founded.split('-');
    let foundedLabel: string;
    if (mn && mx) {
      foundedLabel = t('chip.range.between', {
        label: facetLabel,
        min: `${mn}`,
        max: `${mx}${unit}`,
      });
    } else if (mn) {
      foundedLabel = t('chip.range.foundedAfter', {
        label: facetLabel,
        min: mn,
        unit,
      });
    } else {
      foundedLabel = t('chip.range.foundedBefore', {
        label: facetLabel,
        max: mx,
        unit,
      });
    }
    chips.push({
      key: 'founded',
      facet: facetLabel,
      label: foundedLabel,
      remove: () => void setQuery({ founded: '', page: 1 }),
    });
  }

  if (chips.length === 0) return null;

  function clearAll() {
    // Preserve view / sort / per_page per D-03. Reset everything else.
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
    <ul
      role="group"
      aria-label={t('chip.activeLabel')}
      className="flex flex-wrap gap-2 items-center"
    >
      {chips.map((c) => (
        <li key={c.key}>
          <Badge
            variant="filter-chip"
            dismissible
            onDismiss={c.remove}
            dismissAriaLabel={t('chip.remove', { label: c.label })}
          >
            {c.label}
          </Badge>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t('chip.clearAll')}
        </button>
      </li>
    </ul>
  );
}
