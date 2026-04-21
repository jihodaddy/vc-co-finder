import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/health — heartbeat endpoint. Used by:
 *   1. GitHub Actions heartbeat workflow (every 6 days, D-02.4) to prevent
 *      the Supabase free-tier 7-day auto-pause.
 *   2. Smoke tests after deploy (Plan 08).
 *
 * Modes:
 *   - 200 `{ ok: true, mode: 'public' }` — anyone may probe; we don't touch the DB
 *   - 200 `{ ok: true, dbReachable: true }` — `x-heartbeat-secret` matches; DB pinged
 *   - 401 `{ ok: false, error: 'unauthorized' }` — secret header present but wrong
 *   - 503 `{ ok: false, dbReachable: false }` — secret OK, DB query failed
 *
 * Public probe is intentionally information-light: returning `mode:'public'`
 * tells the caller they're hitting a healthy app without revealing infra
 * state (T-01-07-02). DB-touching mode is gated by HEARTBEAT_SECRET to
 * frustrate trivial DoS / fingerprinting.
 *
 * NOTE: Excluded from auth middleware in Plan 01 (matcher skips /api/health).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const providedSecret = request.headers.get('x-heartbeat-secret');
  const expectedSecret = process.env.HEARTBEAT_SECRET;

  // Public probe path — no DB touch, no infra disclosure.
  if (!providedSecret) {
    return NextResponse.json({ ok: true, mode: 'public' }, { status: 200 });
  }

  // Authenticated probe — validate secret with constant-ish comparison.
  // (Length check + === is acceptable for v1 per T-01-07-03; HMAC out of scope.)
  if (
    !expectedSecret ||
    providedSecret.length !== expectedSecret.length ||
    providedSecret !== expectedSecret
  ) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    );
  }

  // Touch the DB to reset Supabase's 7-day idle timer (D-02.4).
  // `data_sources` is the smallest canonical table — single SELECT LIMIT 1.
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('data_sources').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json(
      { ok: true, dbReachable: true },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, dbReachable: false },
      { status: 503 }
    );
  }
}
