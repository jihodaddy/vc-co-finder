/**
 * Phase 3 search fixtures — shared across unit + smoke + load tests.
 *
 * SRCH13_CORPUS: The 7 Korean-alias regression cases specified in ROADMAP
 * §Phase 3 Success Criteria #3 and RESEARCH §Code Examples. Each entry
 * states the query string (as a user would type it) and the expected
 * canonical slug that should be resolved via alias/display-name match.
 *
 * CANONICAL_SEED_SLUGS: The 4 Phase-2-seeded slugs that Phase 3 treats as
 * "must exist" in any test DB state. Drives seed-guard assertions and
 * load-test synthetic-row exclusions.
 *
 * makeSearchQuery(overrides): Builder for the SearchQuery shape that
 * Plans 02/03/04/05/07 will all consume. Default values mirror the
 * URL-state defaults from UI-SPEC §URL Contract — these are the values
 * that render as an empty `/ko/search` query (no filters, default sort
 * recent_funding_desc, page 1, 25 per page). Tests override only the
 * fields they care about.
 *
 * Source: RESEARCH §Code Examples > SRCH-13 regression test harness.
 * This file MUST be importable from both tests/unit/ and tests/smoke/;
 * keep runtime dependencies at zero (type-only import of SearchQuery is
 * introduced by Plan 03 — not here).
 */

export const SRCH13_CORPUS = [
  { q: '토스', expectSlug: 'toss' },
  { q: '토스뱅크', expectSlug: 'toss' },
  { q: '비바리퍼블리카', expectSlug: 'toss' },
  { q: '당근', expectSlug: 'daangn' },
  { q: '당근마켓', expectSlug: 'daangn' },
  { q: 'Coupang', expectSlug: 'coupang' },
  { q: '쿠팡', expectSlug: 'coupang' },
] as const;

export const CANONICAL_SEED_SLUGS = ['toss', 'daangn', 'coupang', 'baemin'] as const;

export type SearchQueryOverrides = Partial<{
  q: string;
  sectors: string[];
  stage: string[];
  region: string[];
  employees: { kind: 'none' } | { kind: 'bucket'; bucket: string } | { kind: 'range'; min: number | null; max: number | null };
  funding: { min: bigint | null; max: bigint | null };
  founded: { min: number | null; max: number | null };
  sort: string;
  page: number;
  perPage: 25 | 50 | 100;
}>;

export function makeSearchQuery(overrides: SearchQueryOverrides = {}) {
  return {
    q: '',
    sectors: [] as string[],
    stage: [] as string[],
    region: [] as string[],
    employees: { kind: 'none' as const } as
      | { kind: 'none' }
      | { kind: 'bucket'; bucket: string }
      | { kind: 'range'; min: number | null; max: number | null },
    funding: { min: null as bigint | null, max: null as bigint | null },
    founded: { min: null as number | null, max: null as number | null },
    sort: 'recent_funding_desc' as const,
    page: 1,
    perPage: 25 as 25 | 50 | 100,
    ...overrides,
  };
}
