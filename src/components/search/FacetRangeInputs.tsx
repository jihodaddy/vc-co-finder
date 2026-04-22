'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { searchParsers } from '@/lib/search/query-params';
import { parseKRW } from '@/lib/format/parseKRW';
import { Input } from '@/components/ui/input';

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

export function FacetRangeInputs({ paramKey }: Props) {
  const t = useTranslations('search');
  const [query, setQuery] = useQueryStates(searchParsers, { shallow: false });
  const { min, max } = parseRange(query[paramKey]);
  const [minTxt, setMinTxt] = useState(min);
  const [maxTxt, setMaxTxt] = useState(max);
  const [invalid, setInvalid] = useState(false);

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
  );
}
