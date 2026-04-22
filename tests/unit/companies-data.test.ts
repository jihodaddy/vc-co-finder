import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (fn: any, _keyParts: string[], opts: { tags: string[]; revalidate: number }) => {
    // Record tags for assertions; return plain fn
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__CACHE_CALLS__ = (globalThis as any).__CACHE_CALLS__ || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__CACHE_CALLS__.push({ keyParts: _keyParts, opts });
    return fn;
  },
}));

// Mock @supabase/supabase-js directly — companies.ts uses createClient from
// this package to build a cookie-free anon client (Plan 02-06 fix: moved away
// from @/lib/supabase/server because cookies() inside unstable_cache throws).
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            single: async () => ({
              data: {
                id: 'co-1', slug: 'toss', display_name_ko: '토스',
                display_name_en: 'Toss', legal_name: '비바리퍼블리카',
                sector: 'fintech', hq_address: '서울', description_ko: '송금 앱',
                website_url: 'https://toss.im', logo_url: null,
                last_verified_at: '2026-04-01T00:00:00Z',
                source: {
                  id: 'ds-1', source_type: 'manual', source_url: null,
                  fetched_at: '2026-04-01T00:00:00Z',
                  last_verified_at: '2026-04-01T00:00:00Z', confidence: null,
                },
                aliases: [],
                company_identifiers: [],
                funding_rounds: [{
                  id: 'fr-1', stage: 'series_a', amount_minor: '100000000',
                  currency_code: 'KRW', original_text: null,
                  announced_at: '2023-01-01', closed_at: null,
                  last_verified_at: '2026-04-01T00:00:00Z', deleted_at: null,
                  source: {
                    id: 'ds-1', source_type: 'manual', source_url: null,
                    fetched_at: '2026-04-01T00:00:00Z',
                    last_verified_at: '2026-04-01T00:00:00Z', confidence: null,
                  },
                  round_investors: [],
                }],
              },
              error: null,
            }),
          }),
        }),
      }),
    }),
  })),
}));

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__CACHE_CALLS__ = [];
});

describe('getCompanyBySlug', () => {
  it('wraps unstable_cache with tags: ["company:${slug}"] and revalidate: 3600', async () => {
    const { getCompanyBySlug } = await import('@/lib/data/companies');
    await getCompanyBySlug('toss');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = (globalThis as any).__CACHE_CALLS__;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0].opts.tags).toEqual(['company:toss']);
    expect(calls[0].opts.revalidate).toBe(3600);
    expect(calls[0].keyParts).toEqual(['company', 'toss']);
  });

  it('amount_minor from supabase is returned as numeric string (RSC-safe)', async () => {
    const { getCompanyBySlug } = await import('@/lib/data/companies');
    const profile = await getCompanyBySlug('toss');
    expect(profile).not.toBeNull();
    expect(profile!.fundingRounds[0].amountMinor).toBe('100000000');
    expect(typeof profile!.fundingRounds[0].amountMinor).toBe('string');
  });

  it('hero carries SourceMeta with lastVerifiedAt from the fact row', async () => {
    const { getCompanyBySlug } = await import('@/lib/data/companies');
    const profile = await getCompanyBySlug('toss');
    expect(profile!.hero._meta.sourceType).toBe('manual');
    expect(profile!.hero._meta.lastVerifiedAt).toBe('2026-04-01T00:00:00Z');
  });
});
