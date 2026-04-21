/**
 * Phase 2 smoke suite — `/ko/companies/[slug]` success criteria.
 *
 * Every pending test (it-dot-todo) below is wired to a green assertion by:
 *   - Plan 02-04 (route + page)
 *   - Plan 02-05 (seed data creates `toss` slug)
 *   - Plan 02-06 (full phase verification)
 *
 * Run with BASE_URL set:  BASE_URL=http://localhost:3000 npm run test:smoke
 */
import { describe, it } from 'vitest';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

describe('Phase 2 — /ko/companies/[slug] smoke', () => {
  it.todo('PROF-01: /ko/companies/toss returns 200 and HTML contains 토스');
  it.todo('PROF-01: /ko/companies/__definitely_missing__ returns 404');
  it.todo('PROF-02: Hero HTML contains display_name_ko, sector, HQ, website anchor with rel="noopener noreferrer"');
  it.todo('PROF-03: /ko/companies/toss HTML contains ≥1 funding-round row with 억원');
  it.todo('PROF-08: @container class present in rendered HTML/CSS (card transition)');
  it.todo('PROF-10: HTML contains BOTH 토스 AND 비바리퍼블리카 on /ko/companies/toss');
  it.todo('PROF-11: formatted KRW amount appears on /ko/companies/toss');
  it.todo('TRUST-04: HTML contains "출처:" string ≥1 occurrence on /ko/companies/toss');
  it.todo('TRUST-05: one of text-green-600 / text-amber-500 / text-red-600 classes present');
  it.todo('TRUST-06 inherited: footer.disclaimerText present on /ko/companies/toss');
  it.todo('ISR: unstable_cache call carries tags: ["company:${slug}"]');
});

// Dead-reference so test runner picks up the env var in Plan 02-06:
export { BASE_URL };
