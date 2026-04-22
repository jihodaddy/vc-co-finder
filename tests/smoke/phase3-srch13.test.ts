/**
 * SRCH-13 Korean regression harness — Wave 0 stub.
 *
 * Flips to live tests in Plan 07 (load + regression wave). Each todo below
 * corresponds to one entry in SRCH13_CORPUS (tests/unit/search-fixtures.ts).
 * The aggregate todo verifies that all 7 corpus entries resolve against the
 * 15-company cold-start seed (scripts/seed/companies/index.ts).
 *
 * Requirement: SRCH-13 (Korean alias resolution) per
 * .planning/phases/03-faceted-search-postgres-path/03-RESEARCH.md.
 *
 * The live-test form (Plan 07) will:
 *   1. fetch(`${SMOKE_BASE_URL}/api/search/autocomplete?q=${encode(q)}`)
 *   2. assert response.suggestions[0].slug === expectSlug
 *
 * Until then, this file exists so `npm run test:smoke` counts these cases
 * in its todo roster — making Wave 0 completion visible to the planner.
 */
import { describe, it } from 'vitest';
import { SRCH13_CORPUS } from '../unit/search-fixtures';

describe('SRCH-13 Korean regression corpus', () => {
  for (const { q, expectSlug } of SRCH13_CORPUS) {
    it.todo(`autocomplete("${q}") resolves to slug "${expectSlug}"`);
  }
  it.todo('all 7 corpus entries pass against 15-company cold-start seed');
});
