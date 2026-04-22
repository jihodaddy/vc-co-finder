import { describe, it, expect } from 'vitest';
import { companies } from '../../scripts/seed/companies';

/**
 * Seed coverage test — gates SRCH-13 Korean search regression suite.
 *
 * Any regression here means Phase 3 search coverage is broken. The fixture
 * list mirrors `scripts/seed/companies/CRITICAL.md`. Modifying either list
 * WITHOUT updating the other is a planning violation.
 */

const SRCH_13_FIXTURES = [
  '토스',
  '토스뱅크',
  '비바리퍼블리카',
  '당근',
  '당근마켓',
  'Coupang',
  '쿠팡',
  '배민',
];

describe('Seed coverage (SRCH-13 pre-requisite)', () => {
  it('every SRCH-13 fixture resolves via display_name_ko OR aliases[]', () => {
    for (const fixture of SRCH_13_FIXTURES) {
      const hit = companies.find(
        (c) =>
          c.display_name_ko === fixture ||
          c.display_name_en === fixture ||
          c.legal_name === fixture ||
          c.aliases.some((a) => a.alias === fixture),
      );
      expect(hit, `MISSING SRCH-13 fixture: "${fixture}"`).toBeTruthy();
    }
  });

  it('4 CRITICAL brand families each have ≥3 aliases', () => {
    const critical = ['toss', 'daangn', 'coupang', 'baemin'];
    for (const slug of critical) {
      const co = companies.find((c) => c.slug === slug);
      expect(co, `CRITICAL slug missing: ${slug}`).toBeTruthy();
      expect(co!.aliases.length, `${slug} needs ≥3 aliases`).toBeGreaterThanOrEqual(3);
    }
  });

  it('at least 8 seed companies after tranche 1', () => {
    expect(companies.length).toBeGreaterThanOrEqual(8);
  });

  it('every company has ≥1 alias', () => {
    for (const c of companies) {
      expect(c.aliases.length, `${c.slug} has no aliases`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every company has a unique slug', () => {
    const slugs = companies.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every slug is URL-safe kebab-case', () => {
    for (const c of companies) {
      expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
