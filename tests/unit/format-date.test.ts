import { describe, it, expect } from 'vitest';
import { formatProfileDate } from '@/lib/format/date';

describe('formatProfileDate', () => {
  it('UTC ISO → YYYY-MM-DD', () =>
    expect(formatProfileDate('2026-04-21T00:00:00Z')).toBe('2026-04-21'));
  it('KST offset ISO → YYYY-MM-DD (local)', () =>
    expect(formatProfileDate('2026-12-01T13:00:00+09:00')).toBe('2026-12-01'));
  it('date-only ISO accepted', () =>
    expect(formatProfileDate('2025-06-15')).toBe('2025-06-15'));
  it('invalid input throws', () =>
    expect(() => formatProfileDate('not-a-date')).toThrow());
});
