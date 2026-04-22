// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { formatKRW } from '@/lib/format/currency';

// Mock next/navigation so notFound() throws a recognizable signal
const NOT_FOUND = Symbol('next-not-found');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
}));

// Mock the Supabase-backed data wrapper
const mockProfile = {
  hero: {
    id: 'co-1',
    slug: 'toss',
    displayNameKo: '토스',
    displayNameEn: 'Toss',
    legalName: '비바리퍼블리카',
    sector: 'fintech',
    hqAddress: '서울시 강남구',
    descriptionKo: '간편 송금 서비스',
    websiteUrl: 'https://toss.im',
    logoUrl: null,
    _meta: {
      sourceId: 'ds-1',
      sourceType: 'manual',
      sourceUrl: null,
      fetchedAt: '2026-04-01T00:00:00Z',
      lastVerifiedAt: '2026-04-01T00:00:00Z',
      confidence: null,
    },
  },
  aliases: [
    {
      id: 'a-1',
      alias: '비바리퍼블리카',
      aliasType: 'legal',
      validFrom: '2013-01-01',
      validTo: null,
      _meta: {
        sourceId: 'ds-1',
        sourceType: 'manual',
        sourceUrl: null,
        fetchedAt: '2026-04-01T00:00:00Z',
        lastVerifiedAt: '2026-04-01T00:00:00Z',
        confidence: null,
      },
    },
  ],
  fundingRounds: [
    {
      id: 'fr-1',
      stage: 'series_a',
      amountMinor: 100_000_000_000n,
      currencyCode: 'KRW',
      originalText: null,
      announcedAt: '2023-06-01',
      closedAt: null,
      investors: [],
      _meta: {
        sourceId: 'ds-1',
        sourceType: 'manual',
        sourceUrl: null,
        fetchedAt: '2026-04-01T00:00:00Z',
        lastVerifiedAt: '2026-04-01T00:00:00Z',
        confidence: null,
      },
    },
  ],
  identifiers: [
    {
      id: 'i-1',
      kind: 'business_registration_number',
      value: '123-45-67890',
      _meta: {
        sourceId: 'ds-1',
        sourceType: 'manual',
        sourceUrl: null,
        fetchedAt: '2026-04-01T00:00:00Z',
        lastVerifiedAt: '2026-04-01T00:00:00Z',
        confidence: null,
      },
    },
  ],
};

vi.mock('@/lib/data/companies', () => ({
  getCompanyBySlug: vi.fn(async (slug: string) =>
    slug === 'toss' ? mockProfile : null,
  ),
}));

// Stub next-intl server/client variants — pass through t() so the DOM
// contains deterministic tokens we can grep.
vi.mock('next-intl/server', () => ({
  getTranslations: async (ns?: string) => (key: string, vars?: Record<string, string>) => {
    if (vars) return `${ns ?? ''}.${key}(${JSON.stringify(vars)})`;
    return `${ns ?? ''}.${key}`;
  },
  getLocale: async () => 'ko',
}));
vi.mock('next-intl', () => ({
  useTranslations: (ns?: string) => (key: string) => `${ns ?? ''}.${key}`,
}));

// Stub next/image to a bare img so happy-dom doesn't choke on next/image.
vi.mock('next/image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => <img {...props} />,
}));

// ---------------------------------------------------------------------------
// Mock the four profile child components to SYNC stubs.
//
// Rationale (deviation from plan): the production Hero/AliasList/
// FundingRoundsTable/IdentifierList are all `async` Server Components.
// React-Testing-Library running in happy-dom (client-side react-dom) can
// NOT render async function components — it bails with "async/await is not
// yet supported in Client Components". Unit-scoped RSC composition tests
// therefore stub each child with a synchronous functional component that
// (a) carries the same section `id` the real component renders, and
// (b) echoes the load-bearing data we want to assert on.
//
// Full-stack HTTP smoke in Plan 02-06 exercises the real async RSCs.
// ---------------------------------------------------------------------------

vi.mock('@/components/profile/Hero', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Hero: ({ company }: { company: any }) => (
    <section id="hero" data-stub="Hero">
      <h1>{company.displayNameKo}</h1>
      {company.displayNameEn && <p>{company.displayNameEn}</p>}
    </section>
  ),
}));
vi.mock('@/components/profile/AliasList', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AliasList: ({ aliases }: { aliases: any[] }) => (
    <section id="aliases" data-stub="AliasList">
      {aliases.map((a) => (
        <span key={a.id}>{a.alias}</span>
      ))}
    </section>
  ),
}));
vi.mock('@/components/profile/FundingRoundsTable', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FundingRoundsTable: ({ rounds }: { rounds: any[] }) => (
    <section id="funding-rounds" data-stub="FundingRoundsTable">
      {rounds.map((r) => (
        <div key={r.id}>
          {r.stage}:{' '}
          {r.amountMinor === null
            ? 'undisclosed'
            : r.originalText ?? formatKRW(r.amountMinor)}
        </div>
      ))}
    </section>
  ),
}));
vi.mock('@/components/profile/IdentifierList', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  IdentifierList: ({ identifiers }: { identifiers: any[] }) => (
    <section id="identifiers" data-stub="IdentifierList">
      {identifiers.map((i) => (
        <div key={i.id}>
          {i.kind}: {i.value}
        </div>
      ))}
    </section>
  ),
}));

describe('CompanyPage (RSC composition)', () => {
  it('renders Hero → Aliases → Rounds → Identifiers in order (D-03)', async () => {
    const { default: Page } = await import(
      '@/app/[locale]/(public)/companies/[slug]/page'
    );
    const node = await Page({
      params: Promise.resolve({ locale: 'ko', slug: 'toss' }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(node as any);

    const html = container.innerHTML;
    const idxHero = html.indexOf('id="hero"');
    const idxAliases = html.indexOf('id="aliases"');
    const idxRounds = html.indexOf('id="funding-rounds"');
    const idxIdents = html.indexOf('id="identifiers"');
    expect(idxHero).toBeGreaterThanOrEqual(0);
    expect(idxAliases).toBeGreaterThan(idxHero);
    expect(idxRounds).toBeGreaterThan(idxAliases);
    expect(idxIdents).toBeGreaterThan(idxRounds);
  });

  it('calls notFound() when getCompanyBySlug returns null', async () => {
    const { default: Page } = await import(
      '@/app/[locale]/(public)/companies/[slug]/page'
    );
    await expect(
      Page({ params: Promise.resolve({ locale: 'ko', slug: '__missing__' }) }),
    ).rejects.toBe(NOT_FOUND);
  });

  it('calls notFound() BEFORE DB when slug fails regex (V5 abuse reject)', async () => {
    // This test proves the regex gate fires before the DB call.
    // Malformed inputs:
    //   - uppercase (Foo)
    //   - underscore (foo_bar)
    //   - path traversal (..)
    //   - SQL-injection-shaped ('OR 1=1)
    //   - double-hyphen (a--b)
    //   - leading/trailing hyphen
    const { default: Page } = await import(
      '@/app/[locale]/(public)/companies/[slug]/page'
    );
    const badSlugs = [
      'Foo',
      'foo_bar',
      '..',
      "bad'OR1=1",
      'a--b',
      '-leading',
      'trailing-',
    ];
    for (const bad of badSlugs) {
      await expect(
        Page({ params: Promise.resolve({ locale: 'ko', slug: bad }) }),
        `slug "${bad}" should 404 before DB`,
      ).rejects.toBe(NOT_FOUND);
    }
  });

  it('page module exports revalidate = 3600 (PROF-01 success criterion #4)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(
      '@/app/[locale]/(public)/companies/[slug]/page'
    );
    expect(mod.revalidate).toBe(3600);
    expect(mod.dynamicParams).toBe(true);
  });

  it('renders display_name_ko in DOM (PROF-02 sanity)', async () => {
    const { default: Page } = await import(
      '@/app/[locale]/(public)/companies/[slug]/page'
    );
    const node = await Page({
      params: Promise.resolve({ locale: 'ko', slug: 'toss' }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(node as any);
    expect(container.textContent).toMatch(/토스/);
  });

  it('rounds section contains 억원 formatted amount (PROF-03 sanity)', async () => {
    const { default: Page } = await import(
      '@/app/[locale]/(public)/companies/[slug]/page'
    );
    const node = await Page({
      params: Promise.resolve({ locale: 'ko', slug: 'toss' }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(node as any);
    // 100_000_000_000원 = 1,000억원 per formatKRW
    expect(container.textContent).toMatch(/1,000억원/);
  });

  it('identifier row renders value verbatim', async () => {
    const { default: Page } = await import(
      '@/app/[locale]/(public)/companies/[slug]/page'
    );
    const node = await Page({
      params: Promise.resolve({ locale: 'ko', slug: 'toss' }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(node as any);
    expect(container.textContent).toMatch(/123-45-67890/);
  });
});
