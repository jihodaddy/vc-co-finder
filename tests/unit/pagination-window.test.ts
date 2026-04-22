import { describe, it, expect } from 'vitest';
import { paginationWindow } from '@/lib/search/pagination';

describe('paginationWindow — SRCH-10 / UI-SPEC D-09', () => {
  it('total=0 → []', () => {
    expect(paginationWindow(1, 0)).toEqual([]);
  });

  it('total=1 → [1]', () => {
    expect(paginationWindow(1, 1)).toEqual([1]);
  });

  it('current=1, total=5, window=2 → [1,2,3,"...",5] (right ellipsis only)', () => {
    // PLAN behavior: first + current window (2..3) + right ellipsis + last.
    expect(paginationWindow(1, 5, 2)).toEqual([1, 2, 3, '...', 5]);
  });

  it('current mid (3/5) → [1,2,3,4,5] (full overlap, no ellipsis)', () => {
    expect(paginationWindow(3, 5, 2)).toEqual([1, 2, 3, 4, 5]);
  });

  it('current=7, total=23, window=2 → [1,"...",5,6,7,8,9,"...",23]', () => {
    expect(paginationWindow(7, 23, 2)).toEqual([1, '...', 5, 6, 7, 8, 9, '...', 23]);
  });

  it('current at end, total=23 → [1,"...",21,22,23]', () => {
    expect(paginationWindow(23, 23, 2)).toEqual([1, '...', 21, 22, 23]);
  });

  it('current=2, total=10, window=2 → [1,2,3,4,"...",10] (left ellipsis suppressed)', () => {
    expect(paginationWindow(2, 10, 2)).toEqual([1, 2, 3, 4, '...', 10]);
  });

  it('current=9, total=10, window=2 → [1,"...",7,8,9,10] (right ellipsis suppressed)', () => {
    expect(paginationWindow(9, 10, 2)).toEqual([1, '...', 7, 8, 9, 10]);
  });

  it('output type: accepts both numbers and "..." sentinels', () => {
    const out = paginationWindow(7, 23);
    expect(out.every((v) => typeof v === 'number' || v === '...')).toBe(true);
  });
});
