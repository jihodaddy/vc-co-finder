'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { searchParsers } from '@/lib/search/query-params';
import { parseKRW } from '@/lib/format/parseKRW';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

/**
 * UI-SPEC §Range facet UX — funding (`parseKRW`-aware) + founded (year).
 *
 * Renders two `<Input>` controls (최소 / 최대) side by side. **Commit policy**
 * matches UI-SPEC §Interaction Timing & Motion: URL state updates only on
 * `blur` OR `Enter` — NOT on every keystroke — to prevent partial-range
 * flicker (`parseKRW('10')` → 10원 is a valid-but-misleading intermediate
 * state while the user is still typing "10억").
 *
 * - `paramKey='funding'`: input values pass through `parseKRW` to support
 *   Korean-literal input ("100억", "1.5조"); URL receives raw `amount_minor`
 *   bigint strings. Null from `parseKRW` → aria-invalid.
 * - `paramKey='founded'`: values parse as plain integers; URL receives
 *   4-digit year strings.
 * - Invalid min > max sets `aria-invalid="true"` on BOTH inputs (destructive
 *   palette) until the user corrects one.
 * - `page` resets to 1 on every valid commit (RESEARCH §Pitfall 6).
 *
 * Threat T-03-04-01 (Tampering via parseKRW): negative / non-numeric input
 * returns null from `parseKRW`; URL never receives a malformed range.
 */

type Props = { paramKey: 'funding' | 'founded' };

function parseRange(raw: string): { min: string; max: string } {
  const [a = '', b = ''] = (raw || '').split('-');
  return { min: a, max: b };
}

// Slider domain per 03.1-04 Plan:
//  - funding: 0 원 ~ 1조 원 (amount_minor) with 1억 step — matches Phase 3
//    synthetic corpus observed max; values beyond 1조 are out-of-band but the
//    text input retains full precision.
//  - founded: 1970 ~ current year, 1-year step.
const MAX_FUNDING = 1_000_000_000_000; // 1조 in amount_minor
const MIN_YEAR = 1970;

export function FacetRangeInputs({ paramKey }: Props) {
  const t = useTranslations('search');
  const [query, setQuery] = useQueryStates(searchParsers, { shallow: false });
  const { min, max } = parseRange(query[paramKey]);
  const [minTxt, setMinTxt] = useState(min);
  const [maxTxt, setMaxTxt] = useState(max);
  const [invalid, setInvalid] = useState(false);

  const MAX_YEAR = new Date().getFullYear();
  const domainMin = paramKey === 'funding' ? 0 : MIN_YEAR;
  const domainMax = paramKey === 'funding' ? MAX_FUNDING : MAX_YEAR;
  const step = paramKey === 'funding' ? 100_000_000 : 1;

  const sliderMin = (() => {
    if (!minTxt.trim()) return domainMin;
    if (paramKey === 'funding') {
      const p = parseKRW(minTxt);
      if (p === null) return domainMin;
      const n = Number(p);
      return Math.max(Math.min(n, domainMax), domainMin);
    }
    const n = Number.parseInt(minTxt, 10);
    return Number.isFinite(n)
      ? Math.max(Math.min(n, domainMax), domainMin)
      : domainMin;
  })();

  const sliderMax = (() => {
    if (!maxTxt.trim()) return domainMax;
    if (paramKey === 'funding') {
      const p = parseKRW(maxTxt);
      if (p === null) return domainMax;
      const n = Number(p);
      return Math.max(Math.min(n, domainMax), domainMin);
    }
    const n = Number.parseInt(maxTxt, 10);
    return Number.isFinite(n)
      ? Math.max(Math.min(n, domainMax), domainMin)
      : domainMax;
  })();

  const commit = useCallback(() => {
    let minVal = '';
    let maxVal = '';
    if (paramKey === 'funding') {
      const mn = minTxt.trim() ? parseKRW(minTxt) : null;
      const mx = maxTxt.trim() ? parseKRW(maxTxt) : null;
      // If user typed something non-empty and parseKRW rejected it, mark invalid.
      if ((minTxt.trim() && mn === null) || (maxTxt.trim() && mx === null)) {
        setInvalid(true);
        return;
      }
      if (mn !== null && mx !== null && mn > mx) {
        setInvalid(true);
        return;
      }
      setInvalid(false);
      minVal = mn !== null ? mn.toString() : '';
      maxVal = mx !== null ? mx.toString() : '';
    } else {
      const mn = minTxt.trim() ? Number.parseInt(minTxt, 10) : Number.NaN;
      const mx = maxTxt.trim() ? Number.parseInt(maxTxt, 10) : Number.NaN;
      const hasMin = Number.isFinite(mn);
      const hasMax = Number.isFinite(mx);
      if ((minTxt.trim() && !hasMin) || (maxTxt.trim() && !hasMax)) {
        setInvalid(true);
        return;
      }
      if (hasMin && hasMax && mn > mx) {
        setInvalid(true);
        return;
      }
      setInvalid(false);
      minVal = hasMin ? String(mn) : '';
      maxVal = hasMax ? String(mx) : '';
    }
    const next = !minVal && !maxVal ? '' : `${minVal}-${maxVal}`;
    void setQuery({ [paramKey]: next, page: 1 });
  }, [minTxt, maxTxt, paramKey, setQuery]);

  const inputMode = paramKey === 'funding' ? 'decimal' : 'numeric';

  return (
    <div className="flex flex-col gap-4">
      <Slider
        value={[sliderMin, sliderMax]}
        min={domainMin}
        max={domainMax}
        step={step}
        onValueChange={([mn, mx]) => {
          setMinTxt(String(mn));
          setMaxTxt(String(mx));
        }}
        onValueCommit={() => commit()}
        aria-label={t(`facet.${paramKey}.label`)}
        className="py-2"
      />
      <div className="flex gap-2">
        <Input
          type="text"
          inputMode={inputMode}
          placeholder={t('range.from')}
          aria-invalid={invalid}
          value={minTxt}
          onChange={(e) => setMinTxt(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
        />
        <Input
          type="text"
          inputMode={inputMode}
          placeholder={t('range.to')}
          aria-invalid={invalid}
          value={maxTxt}
          onChange={(e) => setMaxTxt(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
        />
      </div>
    </div>
  );
}
