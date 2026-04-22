// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import koMessages from '@/../src/messages/ko.json';

/**
 * Plan 04 Task 3 — ActiveFilterChips tests.
 *
 * Stub nuqs to drive different URL-state scenarios; assert the rendered
 * chip list, aria labels, and setQuery behavior for remove + clearAll.
 */

type QueryState = {
  q: string;
  sectors: string[];
  stage: string[];
  region: string[];
  employees: string;
  funding: string;
  founded: string;
  sort: string;
  view: string;
  page: number;
  per_page: string;
};

const DEFAULT_STATE: QueryState = {
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

const mockSetQuery = vi.fn();
let currentState: QueryState = { ...DEFAULT_STATE };

vi.mock('nuqs', () => ({
  useQueryStates: () => [currentState, mockSetQuery],
}));

beforeEach(() => {
  mockSetQuery.mockReset();
  currentState = { ...DEFAULT_STATE };
});

function withIntl(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="ko" messages={koMessages} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>
  );
}

describe('ActiveFilterChips', () => {
  it('returns null when no filters active (no DOM)', async () => {
    const { ActiveFilterChips } = await import(
      '@/components/search/ActiveFilterChips'
    );
    const { container } = render(withIntl(<ActiveFilterChips />));
    expect(container.innerHTML).toBe('');
  });

  it('renders chips for sectors + employees bucket + aria-label="활성 필터"', async () => {
    currentState = {
      ...DEFAULT_STATE,
      sectors: ['fintech', 'ai'],
      employees: '51_200',
    };
    const { ActiveFilterChips } = await import(
      '@/components/search/ActiveFilterChips'
    );
    const { container } = render(withIntl(<ActiveFilterChips />));
    const ul = container.querySelector('ul[role="group"]');
    expect(ul).not.toBeNull();
    expect(ul!.getAttribute('aria-label')).toBe('활성 필터');

    const text = container.textContent ?? '';
    expect(text).toContain('fintech');
    expect(text).toContain('ai');
    // employees chip: "직원 수 51-200명"
    expect(text).toContain('51-200명');
  });

  it('stage chip uses stageLabel() for Korean copy', async () => {
    currentState = { ...DEFAULT_STATE, stage: ['series_a'] };
    const { ActiveFilterChips } = await import(
      '@/components/search/ActiveFilterChips'
    );
    const { container } = render(withIntl(<ActiveFilterChips />));
    // stageLabel('series_a') === '시리즈 A' (ko.json profile.stage.series_a)
    expect(container.textContent).toContain('시리즈 A');
  });

  it('funding chip uses formatKRW for both bounds', async () => {
    currentState = {
      ...DEFAULT_STATE,
      funding: '10000000000-100000000000', // 100억-1,000억
    };
    const { ActiveFilterChips } = await import(
      '@/components/search/ActiveFilterChips'
    );
    const { container } = render(withIntl(<ActiveFilterChips />));
    const text = container.textContent ?? '';
    expect(text).toContain('100억원');
    expect(text).toContain('1,000억원');
  });

  it('clicking "모두 지우기" resets facets but preserves view/sort/per_page', async () => {
    currentState = {
      ...DEFAULT_STATE,
      sectors: ['fintech'],
      view: 'card',
      sort: 'name_asc',
      per_page: '50',
    };
    const { ActiveFilterChips } = await import(
      '@/components/search/ActiveFilterChips'
    );
    const { container } = render(withIntl(<ActiveFilterChips />));
    // chip row has the clear-all link as its last <li><button>
    const clearBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '모두 지우기',
    );
    expect(clearBtn).toBeDefined();
    fireEvent.click(clearBtn!);
    expect(mockSetQuery).toHaveBeenCalledTimes(1);
    const call = mockSetQuery.mock.calls[0][0];
    // Facet state reset:
    expect(call.q).toBe('');
    expect(call.sectors).toEqual([]);
    expect(call.stage).toEqual([]);
    expect(call.region).toEqual([]);
    expect(call.employees).toBe('');
    expect(call.funding).toBe('');
    expect(call.founded).toBe('');
    expect(call.page).toBe(1);
    // Preferences NOT cleared:
    expect(call.view).toBeUndefined();
    expect(call.sort).toBeUndefined();
    expect(call.per_page).toBeUndefined();
  });

  it('per-chip remove button has aria-label="{label} 제거"', async () => {
    currentState = { ...DEFAULT_STATE, sectors: ['fintech'] };
    const { ActiveFilterChips } = await import(
      '@/components/search/ActiveFilterChips'
    );
    const { container } = render(withIntl(<ActiveFilterChips />));
    const removeBtn = container.querySelector(
      'button[aria-label="fintech 제거"]',
    );
    expect(removeBtn).not.toBeNull();
  });

  it('clicking per-chip remove removes just that value (sector)', async () => {
    currentState = { ...DEFAULT_STATE, sectors: ['fintech', 'ai'] };
    const { ActiveFilterChips } = await import(
      '@/components/search/ActiveFilterChips'
    );
    const { container } = render(withIntl(<ActiveFilterChips />));
    const removeBtn = container.querySelector(
      'button[aria-label="fintech 제거"]',
    ) as HTMLButtonElement;
    fireEvent.click(removeBtn);
    expect(mockSetQuery).toHaveBeenCalledTimes(1);
    const call = mockSetQuery.mock.calls[0][0];
    expect(call.sectors).toEqual(['ai']);
    expect(call.page).toBe(1);
  });
});
