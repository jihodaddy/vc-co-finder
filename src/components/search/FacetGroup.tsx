'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';

/**
 * UI-SPEC §D-01 Desktop sidebar — facet group shell.
 *
 * Renders `<fieldset>` + `<legend>` wrapper for accessibility
 * (UI-SPEC §Accessibility Contract: "each group is a <fieldset> with
 * <legend class='text-xl font-semibold'>{label}</legend>").
 *
 * Label text resolves via next-intl `t('search.facet.{key}.label')` — zero
 * hardcoded Korean in JSX per Phase 1 D-05.4 (enforced by Plan 04 grep
 * verifier at `src/components/search/*.tsx`).
 */
type Props = {
  labelKey: 'sector' | 'stage' | 'region' | 'employees' | 'funding' | 'founded';
  children: ReactNode;
  withSeparator?: boolean;
};

export function FacetGroup({ labelKey, children, withSeparator = true }: Props) {
  const t = useTranslations('search');
  return (
    <div className="flex flex-col gap-3">
      <fieldset className="border-0 p-0 m-0">
        <legend className="font-mono uppercase text-[11px] tracking-[0.3em] text-muted-foreground mb-2">
          {t(`facet.${labelKey}.label`)}
        </legend>
        <div className="flex flex-col gap-2">{children}</div>
      </fieldset>
      {withSeparator && <Separator className="my-4" />}
    </div>
  );
}
