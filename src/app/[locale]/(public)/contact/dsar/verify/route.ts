import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /:locale/contact/dsar/verify?token=<uuid>
 *
 * Advances a `dsar_requests` row from `pending_verification` to `verified`
 * when the requester clicks the emailed link. Uses the service-role admin
 * client because RLS only permits admin role to UPDATE `dsar_requests`
 * (Plan 03 — `dsar_update_admin`); a session-bound anon user has no UPDATE
 * grant.
 *
 * Replay protection: the WHERE clause filters
 *   `.eq('status', 'pending_verification')`
 * so a token clicked twice cannot transition `verified → verified` (the
 * second UPDATE returns 0 rows; we render the invalid-token redirect).
 *
 * Token shape: must be a 36-character UUID (regex pre-check) so a probe
 * with arbitrary input cannot reach the DB.
 */
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.redirect(
      new URL('/ko/contact/dsar?error=invalid_token', request.url)
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('dsar_requests')
    .update({
      status: 'verified',
      email_verified_at: new Date().toISOString(),
    })
    .eq('email_verification_token', token)
    .eq('status', 'pending_verification')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(
      new URL('/ko/contact/dsar?error=invalid_or_used_token', request.url)
    );
  }

  return NextResponse.redirect(
    new URL('/ko/contact/dsar/success?verified=1', request.url)
  );
}
