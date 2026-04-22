import 'server-only';
import { differenceInDays } from 'date-fns';

/**
 * Freshness classification for TRUST-05.
 *
 * Thresholds: ≤30d → fresh, ≤180d → stale, >180d → expired.
 * Source: .planning/phases/02-read-only-profiles-manual-seed/02-CONTEXT.md §D-02
 *
 * IMPORTANT: takes `lastVerifiedAt` (TRUST-02) NOT `updated_at`. See
 * RESEARCH §Pitfall 1 — using updated_at here produces false-green dots
 * when any DB write touches the row (currency refresh, etc.).
 */
export type FreshnessLevel = 'fresh' | 'stale' | 'expired';

export function freshnessLevel(
  lastVerifiedAt: string,
  now: Date = new Date()
): FreshnessLevel {
  const days = differenceInDays(now, new Date(lastVerifiedAt));
  if (days <= 30) return 'fresh';
  if (days <= 180) return 'stale';
  return 'expired';
}

/**
 * Tailwind class per freshness level. Exact classes from UI-SPEC §Color
 * Freshness semantic palette. These three values live ONLY here —
 * no other component may hardcode green-600 / amber-500 / red-600.
 */
export const FRESHNESS_DOT_CLASS: Record<FreshnessLevel, string> = {
  fresh: 'text-green-600 dark:text-green-500',
  stale: 'text-amber-500 dark:text-amber-400',
  expired: 'text-red-600 dark:text-red-500',
};
