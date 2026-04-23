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

describe('FRESHNESS_DOT_CLASS (Phase 3.1 Wave 6 brand scrub)', () => {
  it('fresh level uses brand Delta-up green #0C8A3A', () => {
    expect(FRESHNESS_DOT_CLASS.fresh).toBe('text-[#0C8A3A]');
  });
  it('stale level uses brand dark goldenrod #B8860B', () => {
    expect(FRESHNESS_DOT_CLASS.stale).toBe('text-[#B8860B]');
  });
  it('expired level uses brand Delta-down coral-red #C03A3A', () => {
    expect(FRESHNESS_DOT_CLASS.expired).toBe('text-[#C03A3A]');
  });
  it('no stock-color Tailwind classes leak into freshness palette', () => {
    const values = Object.values(FRESHNESS_DOT_CLASS).join(' ');
    expect(values).not.toMatch(/text-(green|red|yellow|amber|blue|slate|neutral|gray|zinc|stone)-\d/);
  });
});
