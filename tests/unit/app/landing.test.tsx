// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import LandingPage from '@/app/[locale]/(public)/page';

afterEach(() => cleanup());

// Mock next-intl/server — getLocale + getTranslations return predictable values.
// The getTranslations mock returns a t() function whose `key` is the leaf name
// under the requested namespace (`landing.hero3_1`). The page resolves the
// namespace once and calls t('headline'), t('tagline'), etc.
vi.mock('next-intl/server', () => ({
  getLocale: async () => 'ko',
  getTranslations: async () => {
    return (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        eyebrow: '실시간',
        statusSuffix: params?.count
          ? `${params.count}개 스타트업 · 한국·아시아`
          : '',
        headline: '스타트업 시장을, 한 번의 검색으로.',
        tagline:
          '섹터 · 라운드 · 지역 · 인원 · 누적 투자액을 동시에 좁혀 한국과 아시아 스타트업을 30초 안에 찾습니다.',
        ctaPrimary: '검색 시작',
      };
      return map[key] ?? `MISS:${key}`;
    };
  },
}));

describe('/[locale] landing page (Phase 3.1 Wave 5)', () => {
  it('renders the hero headline as h1', async () => {
    const ui = await LandingPage();
    render(ui);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('스타트업 시장을');
  });

  it('renders exactly one CTA link pointing to /ko/search with "검색 시작"', async () => {
    const ui = await LandingPage();
    render(ui);
    const cta = screen.getByRole('link', { name: /검색 시작/ });
    expect(cta.getAttribute('href')).toBe('/ko/search');
  });

  it('renders a LIVE status pill with the eyebrow "실시간" and a tabular-nums count', async () => {
    const ui = await LandingPage();
    const { container } = render(ui);
    expect(container.textContent).toContain('실시간');
    expect(container.textContent).toContain('5016'); // ICU-formatted count (mock returns raw number)
    expect(container.querySelector('.tabular-nums')).toBeTruthy();
  });

  it('does NOT render the Phase 1 valueProps 3-up grid (regression guard)', async () => {
    const ui = await LandingPage();
    const { container } = render(ui);
    expect(container.querySelectorAll('article').length).toBe(0);
    expect(container.querySelectorAll('section').length).toBeLessThanOrEqual(2);
  });
});
