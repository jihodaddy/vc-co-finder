/**
 * Smoke test for the nuqs searchParsers contract (SRCH-06).
 *
 * This is NOT in the plan's must_haves — added as a small safeguard because
 * `npx tsc --noEmit` proves types resolve but not that `createSearchParamsCache`
 * runs at module-import time without throwing. Plan 05 will fail fast in dev
 * if these exports regress; the unit test catches it earlier.
 */
import { describe, it, expect } from 'vitest';
import { searchParsers, searchParamsCache } from '@/lib/search/query-params';

describe('searchParsers + searchParamsCache (SRCH-06)', () => {
  it('exports searchParsers with all 11 URL keys', () => {
    const keys = Object.keys(searchParsers).sort();
    expect(keys).toEqual(
      [
        'q',
        'sectors',
        'stage',
        'region',
        'employees',
        'funding',
        'founded',
        'sort',
        'view',
        'page',
        'per_page',
      ].sort(),
    );
    expect(keys).toHaveLength(11);
  });

  it('exports searchParamsCache callable to parse()', () => {
    expect(searchParamsCache).toBeDefined();
    expect(typeof searchParamsCache.parse).toBe('function');
  });

  it('defaults match UI-SPEC §URL state encoding', () => {
    const parsed = searchParamsCache.parse({});
    expect(parsed.q).toBe('');
    expect(parsed.sectors).toEqual([]);
    expect(parsed.stage).toEqual([]);
    expect(parsed.region).toEqual([]);
    expect(parsed.employees).toBe('');
    expect(parsed.funding).toBe('');
    expect(parsed.founded).toBe('');
    expect(parsed.sort).toBe('recent_funding_desc'); // D-07
    expect(parsed.view).toBe('table'); // D-05
    expect(parsed.page).toBe(1); // D-09
    expect(parsed.per_page).toBe('25'); // D-09
  });

  it('rejects unknown sort → falls back to default', () => {
    const parsed = searchParamsCache.parse({ sort: 'malicious; DROP TABLE' });
    // parseAsStringLiteral allowlist — unknown values coerce to default.
    expect(parsed.sort).toBe('recent_funding_desc');
  });

  it('parses multi-select sectors as comma-separated list', () => {
    const parsed = searchParamsCache.parse({ sectors: 'fintech,ai,mobility' });
    expect(parsed.sectors).toEqual(['fintech', 'ai', 'mobility']);
  });
});
