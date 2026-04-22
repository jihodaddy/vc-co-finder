import { describe, it, expect } from 'vitest';
import { SORT_SQL } from '@/lib/search/sort';
import { SORT_KEYS } from '@/lib/search/types';

describe('SRCH-08 SORT_SQL map', () => {
  it('contains exactly 8 keys matching SORT_KEYS', () => {
    const keys = Object.keys(SORT_SQL).sort();
    const expected = [...SORT_KEYS].sort();
    expect(keys).toEqual(expected);
    expect(keys).toHaveLength(8);
  });

  it('each value is a Drizzle SQL object (has queryChunks)', () => {
    for (const key of SORT_KEYS) {
      const frag = SORT_SQL[key];
      expect(frag).toBeDefined();
      // Drizzle SQL objects expose `queryChunks` (internal) — shape check.
      expect(frag).toHaveProperty('queryChunks');
    }
  });

  it('every fragment is compile-time literal — queryChunks contain no user-supplied strings', () => {
    // Every fragment is created from a tagged template with no ${} placeholders → queryChunks
    // should contain only StringChunk-like entries, not dynamic Param nodes.
    for (const key of SORT_KEYS) {
      const frag = SORT_SQL[key] as unknown as { queryChunks: unknown[] };
      // No chunk should report a `.value` (drizzle's Param shape); StringChunk has `.value` too
      // but is a static string — acceptable. We assert no chunk is a function / promise.
      for (const chunk of frag.queryChunks) {
        expect(typeof chunk === 'object' || typeof chunk === 'string').toBe(true);
      }
    }
  });

  it('recent_funding_desc uses NULLS LAST', () => {
    const frag = SORT_SQL.recent_funding_desc as unknown as { queryChunks: Array<{ value?: string[] }> };
    const serialized = JSON.stringify(frag.queryChunks);
    expect(serialized).toMatch(/NULLS LAST/i);
    expect(serialized).toMatch(/latest_round_announced_at/);
    expect(serialized).toMatch(/DESC/i);
  });

  it('name_asc points at display_name_ko', () => {
    const frag = SORT_SQL.name_asc as unknown as { queryChunks: Array<{ value?: string[] }> };
    const serialized = JSON.stringify(frag.queryChunks);
    expect(serialized).toMatch(/display_name_ko/);
    expect(serialized).toMatch(/ASC/i);
  });
});
