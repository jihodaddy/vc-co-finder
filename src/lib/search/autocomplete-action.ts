'use server';

import { searchAdapter } from './adapter';
import type { AutocompleteHit } from './types';

/**
 * SRCH-07 — Server Action exposing `searchAdapter.autocomplete` to the
 * client `SearchInput` popover.
 *
 * Security (T-03-05-03 mitigation):
 *   - Clamps `q` to 100 chars at the trust boundary — matches the
 *     adapter's own clamp, belt-and-braces for any future adapter swap.
 *   - Returns `[]` for empty/whitespace-only input so the popover stays
 *     closed and we avoid an unnecessary DB round-trip.
 *   - No raw error propagation: any throw from the adapter bubbles up
 *     to Next.js and is logged server-side by Sentry (wired in Phase 1).
 *
 * Rate-limiting per IP/user is deferred to Phase 7 — the current
 * defenses (150ms debounce on client + length clamp + limit=10) keep
 * attack surface acceptable for v1.
 */
export async function autocompleteAction(q: string): Promise<AutocompleteHit[]> {
  const trimmed = (q ?? '').trim().slice(0, 100);
  if (!trimmed) return [];
  return await searchAdapter.autocomplete({ q: trimmed, limit: 10 });
}
