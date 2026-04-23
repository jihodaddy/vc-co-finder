// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import koMessages from '@/../src/messages/ko.json';

/**
 * Plan 04 Task 2 — FacetRangeBuckets + FacetRangeInputs happy-dom tests.
 *
 * Mocks nuqs `useQueryStates` so we can assert setQuery is called with the
 * expected diff. This keeps the test pure — no real Router / URL involved.
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

describe('FacetRangeBuckets', () => {
  it('renders 6 bucket buttons + 직접 입력 trigger', async () => {
    const { FacetRangeBuckets } = await import('@/components/search/FacetRangeBuckets');
    const { container } = render(withIntl(<FacetRangeBuckets />));
    const bucketButtons = container.querySelectorAll('button[aria-pressed]');
    expect(bucketButtons).toHaveLength(6);
    // labels come from ko.json search.range.bucket.employees.*
    expect(container.textContent).toContain('1-10명');
    expect(container.textContent).toContain('1,000명 이상');
    // 직접 입력 trigger present
    expect(container.textContent).toContain('직접 입력');
  });

  it('clicking a bucket writes employees + resets page via setQuery', async () => {
    const { FacetRangeBuckets } = await import('@/components/search/FacetRangeBuckets');
    const { container } = render(withIntl(<FacetRangeBuckets />));
    const buttons = container.querySelectorAll('button[aria-pressed]');
    fireEvent.click(buttons[2]); // "51_200"
    expect(mockSetQuery).toHaveBeenCalledTimes(1);
    const arg = mockSetQuery.mock.calls[0][0];
    expect(arg.employees).toBe('51_200');
    expect(arg.page).toBe(1);
  });

  it('highlights currently-selected bucket via aria-pressed', async () => {
    currentState = { ...DEFAULT_STATE, employees: '51_200' };
    const { FacetRangeBuckets } = await import('@/components/search/FacetRangeBuckets');
    const { container } = render(withIntl(<FacetRangeBuckets />));
    const buttons = container.querySelectorAll('button[aria-pressed]');
    const pressed = Array.from(buttons).filter(
      (b) => b.getAttribute('aria-pressed') === 'true',
    );
    expect(pressed).toHaveLength(1);
  });
});

describe('FacetRangeInputs (funding)', () => {
  it('renders 2 inputs with Korean placeholders from t()', async () => {
    const { FacetRangeInputs } = await import('@/components/search/FacetRangeInputs');
    const { container } = render(
      withIntl(<FacetRangeInputs paramKey="funding" />),
    );
    const inputs = container.querySelectorAll('input');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].getAttribute('placeholder')).toBe('최소');
    expect(inputs[1].getAttribute('placeholder')).toBe('최대');
  });

  it('blur commits "{min}-{max}" with parseKRW-normalized bigint strings', async () => {
    const { FacetRangeInputs } = await import('@/components/search/FacetRangeInputs');
    const { container } = render(
      withIntl(<FacetRangeInputs paramKey="funding" />),
    );
    const [minInput, maxInput] = Array.from(
      container.querySelectorAll('input'),
    ) as HTMLInputElement[];
    fireEvent.change(minInput, { target: { value: '100억' } });
    fireEvent.change(maxInput, { target: { value: '1조' } });
    fireEvent.blur(maxInput);
    expect(mockSetQuery).toHaveBeenCalled();
    const call = mockSetQuery.mock.calls.at(-1)![0];
    // 100억 = 10_000_000_000 · 1조 = 1_000_000_000_000
    expect(call.funding).toBe('10000000000-1000000000000');
    expect(call.page).toBe(1);
  });

  it('min > max sets aria-invalid=true on both inputs (no URL commit)', async () => {
    const { FacetRangeInputs } = await import('@/components/search/FacetRangeInputs');
    const { container } = render(
      withIntl(<FacetRangeInputs paramKey="funding" />),
    );
    const [minInput, maxInput] = Array.from(
      container.querySelectorAll('input'),
    ) as HTMLInputElement[];
    fireEvent.change(minInput, { target: { value: '1조' } });
    fireEvent.change(maxInput, { target: { value: '100억' } });
    fireEvent.blur(maxInput);
    expect(minInput.getAttribute('aria-invalid')).toBe('true');
    expect(maxInput.getAttribute('aria-invalid')).toBe('true');
    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('Enter key blurs input (triggers commit)', async () => {
    const { FacetRangeInputs } = await import('@/components/search/FacetRangeInputs');
    const { container } = render(
      withIntl(<FacetRangeInputs paramKey="founded" />),
    );
    const [minInput] = Array.from(
      container.querySelectorAll('input'),
    ) as HTMLInputElement[];
    fireEvent.change(minInput, { target: { value: '2020' } });
    fireEvent.keyDown(minInput, { key: 'Enter' });
    // Enter triggers blur → blur triggers commit
    expect(mockSetQuery).toHaveBeenCalled();
    const call = mockSetQuery.mock.calls.at(-1)![0];
    expect(call.founded).toBe('2020-');
  });

  it('renders a Slider alongside text inputs (Phase 3.1 Wave 4)', async () => {
    const { FacetRangeInputs } = await import(
      '@/components/search/FacetRangeInputs'
    );
    const { container, getAllByRole } = render(
      withIntl(<FacetRangeInputs paramKey="funding" />),
    );
    const sliders = getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(2); // dual-thumb range
    // Text inputs are still present alongside the slider.
    expect(container.querySelectorAll('input').length).toBe(2);
  });

  it('slider for founded uses 1970 to currentYear domain (Phase 3.1 Wave 4)', async () => {
    const { FacetRangeInputs } = await import(
      '@/components/search/FacetRangeInputs'
    );
    const { getAllByRole } = render(
      withIntl(<FacetRangeInputs paramKey="founded" />),
    );
    const sliders = getAllByRole('slider');
    const maxThumb = sliders[sliders.length - 1];
    expect(Number(maxThumb.getAttribute('aria-valuemax'))).toBe(
      new Date().getFullYear(),
    );
    expect(Number(maxThumb.getAttribute('aria-valuemin'))).toBe(1970);
  });
});
