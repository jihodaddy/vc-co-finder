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
 *
 * Plan 06 (Phase 3 Wave 5) deviation — Rule 1 bug fix: removed the
 * `import 'server-only'` directive so that client components in
 * `src/components/search/*` (ResultsTable, ResultsCards) can share this
 * single source of truth. The helper is pure (differenceInDays + a
 * Tailwind class map) — nothing here touches server-only secrets, so
 * `server-only` was overly restrictive. The anti-regression guard still
 * holds: no component may hard-code the freshness hex palette.
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
