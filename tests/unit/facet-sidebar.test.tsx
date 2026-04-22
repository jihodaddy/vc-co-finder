// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import koMessages from '@/../src/messages/ko.json';

/**
 * Plan 04 Task 3 — FacetSidebar render test.
 *
 * Stub nuqs to return a default empty state; we only assert the rendered
 * layout (6 fieldset + 6 legend matching ko.json labels), not interaction.
 */

const DEFAULT_STATE = {
  q: '',
  sectors: [],
  stage: [],
  region: [],
  employees: '',
  funding: '',
  founded: '',
  sort: 'recent_funding_desc',
  view: 'table',
  page: 1,
  per_page: '25',
};

vi.mock('nuqs', () => ({
  useQueryStates: () => [DEFAULT_STATE, vi.fn()],
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function withIntl(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="ko" messages={koMessages} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>
  );
}

describe('FacetSidebar', () => {
  it('renders <aside> with 6 <fieldset> + 6 <legend> in D-04 order', async () => {
    const { FacetSidebar } = await import('@/components/search/FacetSidebar');
    const { container } = render(
      withIntl(
        <FacetSidebar
          facets={{ sector: {}, stage: {}, region: {} }}
          availableSectors={['fintech', 'ai']}
          availableStages={['series_a']}
          availableRegions={['KR']}
        />,
      ),
    );
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    // aria-label resolves to "필터" (search.drawer.heading in ko.json)
    expect(aside!.getAttribute('aria-label')).toBe('필터');

    const fieldsets = container.querySelectorAll('fieldset');
    expect(fieldsets).toHaveLength(6);

    const legends = container.querySelectorAll('legend');
    expect(legends).toHaveLength(6);

    const legendTexts = Array.from(legends).map((l) => l.textContent);
    // Order per D-04: sector → stage → region → employees → funding → founded
    expect(legendTexts).toEqual([
      '섹터',
      '라운드 단계',
      '지역',
      '직원 수',
      '누적 투자액',
      '설립 연도',
    ]);
  });

  it('renders searchInputSlot when provided', async () => {
    const { FacetSidebar } = await import('@/components/search/FacetSidebar');
    const { container } = render(
      withIntl(
        <FacetSidebar
          facets={{ sector: {}, stage: {}, region: {} }}
          availableSectors={[]}
          availableStages={[]}
          availableRegions={[]}
          searchInputSlot={<div data-testid="search-slot">SLOT</div>}
        />,
      ),
    );
    expect(container.querySelector('[data-testid="search-slot"]')).not.toBeNull();
  });
});
