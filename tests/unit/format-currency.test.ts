import { describe, it, expect } from 'vitest';
import { formatKRW } from '@/lib/format/currency';

describe('formatKRW — undisclosed', () => {
  it('null input → 비공개', () => expect(formatKRW(null)).toBe('비공개'));
  it('undefined input → 비공개', () => expect(formatKRW(undefined)).toBe('비공개'));
  it('opts.undisclosedLabel override', () =>
    expect(formatKRW(null, { undisclosedLabel: '비공개(수동)' })).toBe('비공개(수동)'));
});

describe('formatKRW — zero', () => {
  it('zero → 0원', () => expect(formatKRW(0n)).toBe('0원'));
});

describe('formatKRW — 원 tier (< 1만)', () => {
  it('5,000원', () => expect(formatKRW(5_000n)).toBe('5,000원'));
  it('9,999원 boundary', () => expect(formatKRW(9_999n)).toBe('9,999원'));
});

describe('formatKRW — 만 tier (< 1억) with 1-decimal trim', () => {
  it('10,000원 → 1만원', () => expect(formatKRW(10_000n)).toBe('1만원'));
  it('15,000원 → 1.5만원', () => expect(formatKRW(15_000n)).toBe('1.5만원'));
  it('12,000원 → 1.2만원', () => expect(formatKRW(12_000n)).toBe('1.2만원'));
  it('99,990,000원 → 9,999만원 (max before 억)', () =>
    expect(formatKRW(99_990_000n)).toBe('9,999만원'));
});

describe('formatKRW — 억 tier (< 1조) — strict D-Discretion-3 rule (만 part ≥ 1000만)', () => {
  it('1억원 boundary', () => expect(formatKRW(100_000_000n)).toBe('1억원'));
  it('12억원 (man part = 0)', () => expect(formatKRW(1_200_000_000n)).toBe('12억원'));
  it('120,000,000원 → 1억 2,000만원 (man part = 2,000만 ≥ 1,000만 threshold renders)', () =>
    expect(formatKRW(120_000_000n)).toBe('1억 2,000만원'));
  it('108,000,000원 → 1억원 (man part 800만 < 1,000만 → strict suppress)', () =>
    expect(formatKRW(108_000_000n)).toBe('1억원'));
  it('199,999,999원 → 1억 9,999만원 (man part 9,999만 ≥ 1,000만)', () =>
    expect(formatKRW(199_999_999n)).toBe('1억 9,999만원'));
  it('210,000,000원 → 2억 1,000만원 (man part exactly 1,000만 → threshold hit)', () =>
    expect(formatKRW(210_000_000n)).toBe('2억 1,000만원'));
});

describe('formatKRW — 조 tier', () => {
  it('2,345,678,900,000원 → 2조 3,456억원', () =>
    expect(formatKRW(2_345_678_900_000n)).toBe('2조 3,456억원'));
  it('1조원 exact (billion part = 0)', () =>
    expect(formatKRW(1_000_000_000_000n)).toBe('1조원'));
});

describe('formatKRW — invariants', () => {
  it('negative input throws', () =>
    expect(() => formatKRW(-1n)).toThrow(/negative/i));
  it('number input (non-bigint) accepted', () =>
    expect(formatKRW(5000)).toBe('5,000원'));
  it('beyond Number.MAX_SAFE_INTEGER preserves precision via bigint', () => {
    // 10경원 = 10^17 원 — well past Number.MAX_SAFE_INTEGER (~9e15)
    const amt = 100_000_000_000_000_000n;
    // 10경 = 100,000조 (1경 = 10,000조) → renders as "100,000조원"
    expect(formatKRW(amt)).toBe('100,000조원');
  });
});
