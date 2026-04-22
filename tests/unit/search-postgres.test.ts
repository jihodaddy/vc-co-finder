import { describe, it, expect } from 'vitest';
import { config as loadEnv } from 'dotenv';
import { searchAdapter } from '@/lib/search/adapter';
import { makeSearchQuery } from './search-fixtures';
import type { SearchQuery } from '@/lib/search/types';

// Mirror tests/unit/search-schema.test.ts — vitest does not auto-load
// .env.local, so we opt-in. Skips cleanly when DATABASE_URL is absent
// OR cannot be parsed by `new URL(...)` (e.g. unencoded special chars in the
// password — a pre-existing operational concern tracked outside this plan).
loadEnv({ path: '.env.local' });

function canParseUrl(v: string | undefined): boolean {
  if (!v) return false;
  try {
    // `postgres` lib calls `new URL(connectionString)` internally; mirror that.
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

/**
 * Smoke tests against the live Phase 2 seed (15 companies).
 *
 * These are NOT the full SRCH-13 regression corpus — that runs in Plan 07's
 * dedicated smoke suite. Here we verify the adapter wire-up works end-to-end
 * against the DB:
 *   - empty query returns full seed
 *   - unreachable facet returns 0 without error
 *   - BigInt cumulative funding is serialized as string (React-safe)
 *   - 토스 autocomplete resolves to slug=toss (single-case sanity for SRCH-07)
 *
 * If DATABASE_URL is absent these tests are skipped rather than failing with
 * a confusing connection error.
 */
const dbUrlUsable = canParseUrl(process.env.DATABASE_URL);
const maybe = dbUrlUsable ? describe : describe.skip;
if (!dbUrlUsable && process.env.DATABASE_URL) {
  // Surface an explicit skip reason so CI logs aren't silently green.
  // eslint-disable-next-line no-console
  console.warn(
    '[search-postgres.test] DATABASE_URL present but unparseable by new URL(). ' +
      'Likely unencoded special chars in password. Skipping DB smoke tests.',
  );
}

function toSearchQuery(overrides: Partial<SearchQuery> = {}): SearchQuery {
  // Cast through the fixture builder: the builder's default sort is the literal
  // 'recent_funding_desc' which satisfies SortKey. `as SearchQuery` is safe
  // because the fixture mirrors the SearchQuery shape.
  return { ...(makeSearchQuery() as unknown as SearchQuery), ...overrides };
}

maybe('postgresAdapter — smoke against Phase 2 seed', () => {
  it('search with empty query returns ≥15 hits (Phase 2 seed size)', async () => {
    const res = await searchAdapter.search(toSearchQuery());
    expect(res.total).toBeGreaterThanOrEqual(15);
    expect(res.hits.length).toBeGreaterThanOrEqual(Math.min(25, res.total));
  });

  it('search with unreachable facet returns 0 hits without error', async () => {
    const res = await searchAdapter.search(
      toSearchQuery({ sectors: ['__does_not_exist__'] }),
    );
    expect(res.total).toBe(0);
    expect(res.hits).toEqual([]);
    // Facet counts must still be an object (empty), not undefined/null.
    expect(res.facets.sector).toEqual({});
    expect(res.facets.stage).toEqual({});
    expect(res.facets.region).toEqual({});
  });

  it('BigInt cumulative_funding_minor is serialized as string (React-safe)', async () => {
    const res = await searchAdapter.search(toSearchQuery());
    const withFunding = res.hits.find((h) => h.cumulativeFundingMinor !== null);
    if (withFunding) {
      expect(typeof withFunding.cumulativeFundingMinor).toBe('string');
    }
    // If the seed has no funded companies, the null branch is valid — do not fail.
  });

  it('autocomplete("토스") returns ≥1 hit with slug=toss (SRCH-07/13 smoke)', async () => {
    const hits = await searchAdapter.autocomplete({ q: '토스', limit: 10 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.slug === 'toss')).toBe(true);
  });
});
