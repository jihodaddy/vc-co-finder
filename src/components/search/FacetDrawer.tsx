'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryStates } from 'nuqs';
import { searchParsers } from '@/lib/search/query-params';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { FacetCheckboxList } from './FacetCheckboxList';
import { FacetRangeBuckets } from './FacetRangeBuckets';
import { FacetRangeInputs } from './FacetRangeInputs';
import type { FacetCounts } from '@/lib/search/types';

/**
 * UI-SPEC §D-02 Mobile drawer — bottom Sheet + Accordion(type=multiple,
 * defaultValue=['sector']). 6 accordion items in D-04 order; sticky "적용"
 * button at the bottom closes the drawer (state is already in the URL, no
 * round-trip).
 *
 * Trigger copy: "필터" when no filters active; "필터 ({count})" when >0
 * (UI-SPEC §Copywriting Contract, keys `drawer.openCta` + `drawer.openWithCount`).
 * Count aggregates every active facet + query text; matches the UI-SPEC
 * contract for "activeFilterCount" calculation.
 */
type Props = {
  facets: FacetCounts;
  availableSectors: string[];
  availableStages: string[];
  availableRegions: string[];
};

type QueryValues = {
  q: string;
  sectors: string[];
  stage: string[];
  region: string[];
  employees: string;
  funding: string;
  founded: string;
};

function countActive(q: QueryValues): number {
  let n = 0;
  if (q.sectors.length) n += q.sectors.length;
  if (q.stage.length) n += q.stage.length;
  if (q.region.length) n += q.region.length;
  if (q.employees) n += 1;
  if (q.funding) n += 1;
  if (q.founded) n += 1;
  if (q.q) n += 1;
  return n;
}

export function FacetDrawer({
  facets,
  availableSectors,
  availableStages,
  availableRegions,
}: Props) {
  const t = useTranslations('search');
  const [open, setOpen] = useState(false);
  const [query] = useQueryStates(searchParsers, { shallow: false });
  const count = countActive(query);

  const triggerCopy =
    count > 0 ? t('drawer.openWithCount', { count }) : t('drawer.openCta');

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          className="fixed bottom-4 right-4 h-12 px-6 rounded-full shadow-lg z-40 sm:hidden"
        >
          {triggerCopy}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[80vh] overflow-y-auto pt-2 pb-[calc(env(safe-area-inset-bottom)+16px)] px-4"
      >
        <SheetHeader>
          <SheetTitle>{t('drawer.heading')}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('drawer.heading')}
          </SheetDescription>
        </SheetHeader>
        <Accordion
          type="multiple"
          defaultValue={['sector']}
          className="w-full"
        >
          <AccordionItem value="sector">
            <AccordionTrigger className="text-xl font-semibold">
              {t('facet.sector.label')}
            </AccordionTrigger>
            <AccordionContent>
              <FacetCheckboxList paramKey="sectors" items={sectorItems} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="stage">
            <AccordionTrigger className="text-xl font-semibold">
              {t('facet.stage.label')}
            </AccordionTrigger>
            <AccordionContent>
              <FacetCheckboxList paramKey="stage" items={stageItems} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="region">
            <AccordionTrigger className="text-xl font-semibold">
              {t('facet.region.label')}
            </AccordionTrigger>
            <AccordionContent>
              <FacetCheckboxList paramKey="region" items={regionItems} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="employees">
            <AccordionTrigger className="text-xl font-semibold">
              {t('facet.employees.label')}
            </AccordionTrigger>
            <AccordionContent>
              <FacetRangeBuckets />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="funding">
            <AccordionTrigger className="text-xl font-semibold">
              {t('facet.funding.label')}
            </AccordionTrigger>
            <AccordionContent>
              <FacetRangeInputs paramKey="funding" />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="founded">
            <AccordionTrigger className="text-xl font-semibold">
              {t('facet.founded.label')}
            </AccordionTrigger>
            <AccordionContent>
              <FacetRangeInputs paramKey="founded" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <SheetFooter className="sticky bottom-0 pt-3 bg-background">
          <SheetClose asChild>
            <Button type="button" className="w-full h-11">
              {t('drawer.applyCta')}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
