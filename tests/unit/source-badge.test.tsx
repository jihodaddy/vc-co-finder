// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock next-intl/server for unit testing server components
vi.mock('next-intl/server', () => ({
  getTranslations: async (_ns: string) => (key: string, vars?: Record<string, string>) => {
    const dict: Record<string, string> = {
      'source.type.manual': '수동 큐레이션',
      'source.type.dart': 'DART',
      'freshness.fresh': '신선',
      'freshness.stale': '확인 권장',
      'freshness.expired': '오래된 정보',
      'source.badge': `출처: ${vars?.sourceLabel} · ${vars?.date} 업데이트`,
    };
    return dict[key] ?? key;
  },
}));

import { SourceBadge } from '@/components/profile/SourceBadge';

describe('SourceBadge', () => {
  it('renders 출처 text with sourceLabel + date', async () => {
    const node = await SourceBadge({
      meta: {
        sourceId: 'ds-1',
        sourceType: 'manual',
        sourceUrl: null,
        fetchedAt: '2026-04-01T00:00:00Z',
        lastVerifiedAt: new Date().toISOString(),
        confidence: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(node as any);
    expect(container.textContent).toMatch(/출처:/);
    expect(container.textContent).toMatch(/수동 큐레이션/);
    expect(container.textContent).toMatch(/업데이트/);
  });

  it('embeds freshness dot with FRESHNESS_DOT_CLASS for fresh level', async () => {
    const node = await SourceBadge({
      meta: {
        sourceId: 'ds-1',
        sourceType: 'manual',
        sourceUrl: null,
        fetchedAt: '2026-04-01T00:00:00Z',
        lastVerifiedAt: new Date().toISOString(), // fresh
        confidence: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(node as any);
    const dot = container.querySelector('span[aria-hidden="true"]');
    expect(dot).not.toBeNull();
    expect(dot!.className).toMatch(/text-green-600/);
    expect(dot!.className).toMatch(/h-1\.5 w-1\.5/);
  });

  it('includes sr-only freshness label', async () => {
    const node = await SourceBadge({
      meta: {
        sourceId: 'ds-1',
        sourceType: 'manual',
        sourceUrl: null,
        fetchedAt: '2026-04-01T00:00:00Z',
        lastVerifiedAt: new Date().toISOString(),
        confidence: null,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(node as any);
    const sr = container.querySelector('.sr-only');
    expect(sr).not.toBeNull();
    expect(sr!.textContent).toBe('신선');
  });
});
