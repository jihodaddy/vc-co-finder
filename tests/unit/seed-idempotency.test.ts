import { describe, it, expect } from 'vitest';
import { companies } from '../../scripts/seed/companies';

/**
 * Static idempotency test — no live DB required.
 *
 * Ensures the seed data itself cannot cause unique-constraint violations on
 * a clean run. The seed runner uses UPSERT for companies and delete-then-
 * insert for child rows; these tests verify the inputs never violate the
 * relevant DB uniqueness invariants.
 */

describe('Seed idempotency (static — no DB required)', () => {
  it('every company slug is unique (upsert onConflict pivot)', () => {
    const slugs = new Map<string, number>();
    for (const c of companies) {
      slugs.set(c.slug, (slugs.get(c.slug) ?? 0) + 1);
    }
    for (const [slug, count] of slugs) {
      expect(count, `slug ${slug} appears ${count} times`).toBe(1);
    }
  });

  it('(company_id, alias, alias_type) combinations would be unique in DB', () => {
    for (const c of companies) {
      const keys = c.aliases.map((a) => `${a.alias}::${a.alias_type}`);
      const unique = new Set(keys);
      expect(unique.size, `${c.slug} has duplicate (alias, alias_type)`).toBe(keys.length);
    }
  });

  it('(kind, value) pairs are globally unique across all companies', () => {
    const seen = new Map<string, string>();
    for (const c of companies) {
      for (const i of c.identifiers) {
        const key = `${i.kind}::${i.value}`;
        const prev = seen.get(key);
        expect(prev, `identifier collision: ${key} in ${c.slug} and ${prev}`).toBeUndefined();
        seen.set(key, c.slug);
      }
    }
  });

  it('at least 15 companies total', () => {
    expect(companies.length).toBeGreaterThanOrEqual(15);
  });

  it('every logo_file (when present) references a .png file', () => {
    for (const c of companies) {
      if (c.logo_file) {
        expect(c.logo_file).toMatch(/\.png$/);
      }
    }
  });

  it('every funding round with amount_minor has currency_code', () => {
    for (const c of companies) {
      for (const r of c.funding_rounds) {
        if (r.amount_minor !== undefined) {
          expect(r.currency_code, `${c.slug} round missing currency_code`).toBeTruthy();
        }
      }
    }
  });
});
