import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-only helper that returns the **domain** of each sidebar facet —
 * the full set of values that exist anywhere under non-deleted companies,
 * not just the current filter's result set. The sidebar uses this to render
 * every checkable item; per-value hit counts come from `FacetCounts` on the
 * current `SearchResult` (so the UI shows "0" next to filtered-out values
 * but still renders the checkbox).
 *
 * Uses a **cookie-free anon client** (RESEARCH §Pitfall 5 — Phase 2 Bug #1)
 * so the helper is safe to call from inside `unstable_cache` or any RSC
 * path. DO NOT import `@/lib/supabase/server` here.
 *
 * Runs once per `/search` page render; three small `SELECT DISTINCT`-style
 * queries against `public.companies` filtered by `deleted_at IS NULL`.
 * RLS policy `canonical_select_public` (migration 0012) grants anon SELECT.
 */

function anon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type FacetDomain = {
  sectors: string[];
  stages: string[];
  regions: string[];
};

/**
 * Derives the available (domain) values for each sidebar facet. Cheap —
 * three small queries in parallel. Result is deterministic (alphabetical
 * within each facet) so re-renders don't reshuffle checkbox order.
 */
export async function getFacetDomain(): Promise<FacetDomain> {
  const supa = anon();
  const [sec, stg, reg] = await Promise.all([
    supa
      .from('companies')
      .select('sector')
      .is('deleted_at', null)
      .not('sector', 'is', null),
    supa
      .from('companies')
      .select('latest_round_stage')
      .is('deleted_at', null)
      .not('latest_round_stage', 'is', null),
    supa
      .from('companies')
      .select('hq_region')
      .is('deleted_at', null)
      .not('hq_region', 'is', null),
  ]);

  const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

  const sectors = uniq(
    (sec.data ?? []).map((r) => (r as { sector: string }).sector),
  )
    .filter(Boolean)
    .sort();
  const stages = uniq(
    (stg.data ?? []).map(
      (r) => (r as { latest_round_stage: string }).latest_round_stage,
    ),
  )
    .filter(Boolean)
    .sort();
  const regions = uniq(
    (reg.data ?? []).map((r) => (r as { hq_region: string }).hq_region),
  )
    .filter(Boolean)
    .sort();

  return { sectors, stages, regions };
}
