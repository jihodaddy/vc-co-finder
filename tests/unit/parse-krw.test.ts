import { describe, it, expect } from 'vitest';
import { parseKRW } from '@/lib/format/parseKRW';
import { formatKRW } from '@/lib/format/currency';

describe('parseKRW — Korean numeric tier suffixes', () => {
  it('100억 → 10_000_000_000n', () => {
    expect(parseKRW('100억')).toBe(10_000_000_000n);
  });

  it('1.5조 → 1_500_000_000_000n (fractional scales via bigint)', () => {
    expect(parseKRW('1.5조')).toBe(1_500_000_000_000n);
  });

  it('5억원 → 500_000_000n (원 suffix tolerated)', () => {
    expect(parseKRW('5억원')).toBe(500_000_000n);
  });

  it('500000000 → 500_000_000n (raw integer)', () => {
    expect(parseKRW('500000000')).toBe(500_000_000n);
  });

  it('10,000,000 → 10_000_000n (commas stripped)', () => {
    expect(parseKRW('10,000,000')).toBe(10_000_000n);
  });

  it('1,500만 → 15_000_000n (comma + 만 tier)', () => {
    expect(parseKRW('1,500만')).toBe(15_000_000n);
  });

  it('1만 → 10_000n', () => {
    expect(parseKRW('1만')).toBe(10_000n);
  });
});

describe('parseKRW — null / invalid inputs', () => {
  it('empty string → null', () => {
    expect(parseKRW('')).toBeNull();
  });

  it('whitespace-only → null', () => {
    expect(parseKRW('   ')).toBeNull();
  });

  it('non-numeric → null', () => {
    expect(parseKRW('abc')).toBeNull();
  });

  it('mixed non-numeric with digit → null', () => {
    expect(parseKRW('12ab3')).toBeNull();
  });

  it('negative → null (threat T-03-03-01 mitigation)', () => {
    expect(parseKRW('-100억')).toBeNull();
  });

  it('negative raw integer → null', () => {
    expect(parseKRW('-500000000')).toBeNull();
  });

  it('fractional raw integer (no tier) → null', () => {
    expect(parseKRW('1.5')).toBeNull();
  });

  it('unknown suffix → null', () => {
    expect(parseKRW('100K')).toBeNull();
  });
});

describe('parseKRW — round-trip with formatKRW (Phase 2 carry-forward)', () => {
  it('formatKRW(parseKRW("100억")!) === "100억원"', () => {
    const parsed = parseKRW('100억');
    expect(parsed).not.toBeNull();
    expect(formatKRW(parsed!)).toBe('100억원');
  });

  it('formatKRW(parseKRW("1조")!) === "1조원"', () => {
    const parsed = parseKRW('1조');
    expect(parsed).not.toBeNull();
    expect(formatKRW(parsed!)).toBe('1조원');
  });
});
