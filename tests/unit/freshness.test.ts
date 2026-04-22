import { describe, it, expect } from 'vitest';
import { subDays } from 'date-fns';
import { freshnessLevel, FRESHNESS_DOT_CLASS } from '@/lib/data/freshness';

const NOW = new Date('2026-04-21T00:00:00Z');

describe('freshnessLevel', () => {
  it('today → fresh', () =>
    expect(freshnessLevel(NOW.toISOString(), NOW)).toBe('fresh'));
  it('30 days exactly → fresh (≤30 inclusive)', () =>
    expect(freshnessLevel(subDays(NOW, 30).toISOString(), NOW)).toBe('fresh'));
  it('31 days → stale (first day past fresh)', () =>
    expect(freshnessLevel(subDays(NOW, 31).toISOString(), NOW)).toBe('stale'));
  it('180 days exactly → stale (≤180 inclusive)', () =>
    expect(freshnessLevel(subDays(NOW, 180).toISOString(), NOW)).toBe('stale'));
  it('181 days → expired (first day past stale)', () =>
    expect(freshnessLevel(subDays(NOW, 181).toISOString(), NOW)).toBe('expired'));
  it('5 years (1825 days) → expired', () =>
    expect(freshnessLevel(subDays(NOW, 1825).toISOString(), NOW)).toBe('expired'));
});

describe('FRESHNESS_DOT_CLASS', () => {
  it('fresh level uses text-green-600 + dark variant', () => {
    expect(FRESHNESS_DOT_CLASS.fresh).toMatch(/text-green-600/);
    expect(FRESHNESS_DOT_CLASS.fresh).toMatch(/dark:text-green-500/);
  });
  it('stale level uses text-amber-500 + dark variant', () => {
    expect(FRESHNESS_DOT_CLASS.stale).toMatch(/text-amber-500/);
    expect(FRESHNESS_DOT_CLASS.stale).toMatch(/dark:text-amber-400/);
  });
  it('expired level uses text-red-600 + dark variant', () => {
    expect(FRESHNESS_DOT_CLASS.expired).toMatch(/text-red-600/);
    expect(FRESHNESS_DOT_CLASS.expired).toMatch(/dark:text-red-500/);
  });
});
