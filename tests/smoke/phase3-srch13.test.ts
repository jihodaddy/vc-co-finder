/**
 * SRCH-13 Korean regression harness — live tests (Plan 07 Task 1).
 *
 * Requirement: SRCH-13 (Korean alias resolution) per ROADMAP §Phase 3 SC #3.
 * Flips from it.todo stubs (Plan 01 scaffold) to live `it(...)` assertions
 * against the Phase 2 seed (15 companies, 59 aliases) + any additional
 * synthetic rows present at run time.
 *
 * Each corpus entry resolves via searchAdapter.autocomplete — which joins
 * companies ↔ aliases and uses PGroonga TokenBigram for Korean matching.
 * PGroonga bigram must resolve:
 *   토스뱅크   → toss   (alias match)
 *   비바리퍼블리카 → toss   (legal alias match)
 *   당근마켓   → daangn (alias match)
 *   쿠팡 / Coupang → coupang (display_name_ko / display_name_en match)
 */
import { config as loadEnv } from 'dotenv';

// Load .env.local BEFORE importing the search adapter — postgres.ts reads
// DATABASE_URL at connection-init time. Vitest does not load dotenv by
// default; the per-file pattern matches tests/unit/search-postgres.test.ts.
loadEnv({ path: '.env.local' });

import { describe, it, expect } from 'vitest';
import { searchAdapter } from '@/lib/search/adapter';
import { SRCH13_CORPUS } from '../unit/search-fixtures';

describe('SRCH-13 Korean regression corpus — live against Phase 2 seed', () => {
  for (const { q, expectSlug } of SRCH13_CORPUS) {
    it(`autocomplete("${q}") resolves to slug "${expectSlug}"`, async () => {
      const hits = await searchAdapter.autocomplete({ q, limit: 10 });
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some((h) => h.slug === expectSlug)).toBe(true);
    });
  }

  it('all 7 corpus entries pass against 15-company cold-start seed', async () => {
    const results = await Promise.all(
      SRCH13_CORPUS.map(async ({ q, expectSlug }) => {
        const hits = await searchAdapter.autocomplete({ q, limit: 10 });
        return {
          q,
          expectSlug,
          pass: hits.some((h) => h.slug === expectSlug),
          hits: hits.length,
        };
      }),
    );
    const fails = results.filter((r) => !r.pass);
    if (fails.length > 0) {
      // eslint-disable-next-line no-console
      console.error('SRCH-13 failures:', JSON.stringify(fails, null, 2));
    }
    expect(fails).toEqual([]);
  });
});
