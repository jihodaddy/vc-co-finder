import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/storage-check — reports Supabase DB size as % of the free-tier
 * 500MB ceiling. Hit daily by `.github/workflows/storage-monitor.yml`
 * (PITFALLS #11: free-tier wall mitigation).
 *
 * Secret-gated: revealing DB size is low-risk but not zero-risk
 * (T-01-07-05). Same `HEARTBEAT_SECRET` is reused so we don't sprawl
 * secret material.
 *
 * Implementation note: a real `pg_database_size_for_self` RPC is not
 * installed yet — Plan 01 migrations don't define it. We attempt the RPC
 * and fall back to a row-count signal when it's missing. The "real" size
 * monitor will live in the GitHub Actions workflow once we have the RPC
 * (or once we wire up the Supabase Management API in Phase 4a+).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FREE_TIER_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
const WARN_THRESHOLD = 0.7; // 70% per PITFALLS #11

export async function GET(request: NextRequest) {
  const providedSecret = request.headers.get('x-heartbeat-secret');
  const expectedSecret = process.env.HEARTBEAT_SECRET;
  if (
    !providedSecret ||
    !expectedSecret ||
    providedSecret.length !== expectedSecret.length ||
    providedSecret !== expectedSecret
  ) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();
  // Try the canonical RPC first — silently fall back if the function isn't
  // installed in this environment.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    'pg_database_size_for_self'
  );

  if (error) {
    const { count } = await supabase
      .from('data_sources')
      .select('id', { count: 'exact', head: true });
    return NextResponse.json({
      ok: true,
      source: 'fallback',
      rowCountEstimate: count ?? null,
      warn: false,
      threshold: WARN_THRESHOLD,
      note: 'pg_database_size RPC not installed — replace with Supabase Management API call in Phase 4a+',
    });
  }

  const sizeBytes = typeof data === 'number' ? data : 0;
  const pct = sizeBytes / FREE_TIER_LIMIT_BYTES;
  return NextResponse.json({
    ok: true,
    source: 'rpc',
    sizeBytes,
    sizePctOfFreeTier: pct,
    warn: pct >= WARN_THRESHOLD,
    threshold: WARN_THRESHOLD,
  });
}
