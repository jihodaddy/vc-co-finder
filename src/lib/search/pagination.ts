/**
 * Numeric pagination window — current ± window, always show first + last.
 *
 * Returns a mixed array of page numbers and '...' ellipsis sentinels.
 * Pure — no DOM, no React; unit-testable; server + client safe.
 *
 * Rule (UI-SPEC §D-09):
 *   - total = 0 → []
 *   - total = 1 → [1]
 *   - left ellipsis emitted iff (current - window) > 2
 *   - right ellipsis emitted iff (current + window) < (total - 1)
 *   - first page always present, last page always present (when total > 1)
 *
 * Example shapes:
 *   paginationWindow(1, 5, 2)   → [1, 2, 3, 4, 5]
 *   paginationWindow(7, 23, 2)  → [1, '...', 5, 6, 7, 8, 9, '...', 23]
 *   paginationWindow(23, 23, 2) → [1, '...', 21, 22, 23]
 *
 * Implements SRCH-10.
 */
export function paginationWindow(
  current: number,
  total: number,
  window = 2,
): Array<number | '...'> {
  if (total <= 0) return [];
  if (total === 1) return [1];

  const out: Array<number | '...'> = [];
  const left = Math.max(2, current - window);
  const right = Math.min(total - 1, current + window);

  out.push(1);

  if (left > 2) out.push('...');

  for (let i = left; i <= right; i++) {
    out.push(i);
  }

  if (right < total - 1) out.push('...');

  out.push(total);

  return out;
}
