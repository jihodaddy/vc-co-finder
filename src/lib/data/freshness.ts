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
 * Tailwind class per freshness level.
 *
 * Phase 3.1 Wave 6 — brand-aligned freshness dot colors per DESIGN.md §1.2
 * Chart Palette + .planning/phases/03.1-.../03.1-CONTEXT.md D-03.1 step 6.
 * These three hex values live ONLY here — no other component may hardcode
 * the freshness palette.
 *
 * fresh   (≤30d)  → #0C8A3A (Delta-up green; elevated from primitive-internal
 *                   to shared freshness signal per Phase 3.1 decision)
 * stale   (≤180d) → #B8860B (dark goldenrod; neutral warm tone that sits
 *                   cleanly on cream without competing with lime accent)
 * expired (>180d) → #C03A3A (Delta-down coral-red; elevated for negative
 *                   freshness signal. --destructive is #FFB5A0 coral which
 *                   is too light for a 1.5px dot on cream — AA contrast
 *                   requires the darker #C03A3A variant.)
 */
export const FRESHNESS_DOT_CLASS: Record<FreshnessLevel, string> = {
  fresh: 'text-[#0C8A3A]',
  stale: 'text-[#B8860B]',
  expired: 'text-[#C03A3A]',
};
