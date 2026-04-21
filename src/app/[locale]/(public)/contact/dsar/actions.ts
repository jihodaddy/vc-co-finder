'use server';

import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { sendDsarVerificationEmail } from '@/lib/email/resend';
import { rateLimit } from '@/lib/ratelimit/in-memory';
import { createClient } from '@/lib/supabase/server';
import { DsarRequestSchema } from '@/lib/zod-schemas/dsar';

export type DsarActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

/**
 * Server action that handles a DSAR submission end-to-end:
 *
 *   1. Parse + validate against `DsarRequestSchema` (zod bounds = RLS bounds).
 *   2. Per-IP rate limit (default 5/hr — `DSAR_RATE_LIMIT_PER_HOUR`).
 *   3. INSERT into `public.dsar_requests` via the anon Supabase client; the
 *      RLS `dsar_insert_public` policy permits this with length CHECKs.
 *      The `email_verification_token` is `crypto.randomUUID()` server-side
 *      so a malicious client cannot pre-supply a known token.
 *   4. Send the verification email via Resend. Failures are swallowed so the
 *      attacker cannot use email-deliverability as an oracle for whether
 *      the row was inserted (timing-safe success page).
 *   5. `redirect('/ko/contact/dsar/success')` — POST→GET pattern prevents
 *      double-submit on refresh.
 */
export async function submitDsarRequest(
  _prevState: DsarActionState,
  formData: FormData
): Promise<DsarActionState> {
  // --- 1. Parse + validate ---
  const raw = {
    requesterName: formData.get('requesterName'),
    requesterEmail: formData.get('requesterEmail'),
    requesterPhone: formData.get('requesterPhone') ?? '',
    requestType: formData.get('requestType'),
    subjectDescription: formData.get('subjectDescription'),
    evidenceUrl: formData.get('evidenceUrl') ?? '',
  };
  const parsed = DsarRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === 'string' && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { status: 'error', message: 'validation', fieldErrors };
  }

  // --- 2. Rate limit (per IP) ---
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for') ?? '';
  const ip = forwardedFor.split(',')[0]?.trim() || 'unknown';
  const limit = Number(process.env.DSAR_RATE_LIMIT_PER_HOUR ?? 5);
  const rl = rateLimit(`dsar:${ip}`, limit);
  if (!rl.ok) {
    return { status: 'error', message: 'rateLimited' };
  }

  // --- 3. INSERT with server-generated verification token ---
  const token = crypto.randomUUID();
  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from('dsar_requests')
    .insert({
      requester_name: parsed.data.requesterName,
      requester_email: parsed.data.requesterEmail,
      requester_phone: parsed.data.requesterPhone || null,
      request_type: parsed.data.requestType,
      subject_description: parsed.data.subjectDescription,
      evidence_url: parsed.data.evidenceUrl || null,
      email_verification_token: token,
      ip_address: ip === 'unknown' ? null : ip,
      user_agent: headersList.get('user-agent') ?? null,
      status: 'pending_verification',
    })
    .select('id')
    .single();

  if (error || !inserted) {
    return { status: 'error', message: 'insertFailed' };
  }

  // --- 4. Send verification email (best-effort) ---
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const verifyUrl = `${appUrl}/ko/contact/dsar/verify?token=${token}`;
  try {
    await sendDsarVerificationEmail({
      to: parsed.data.requesterEmail,
      name: parsed.data.requesterName,
      verifyUrl,
      locale: 'ko',
    });
  } catch {
    // Email send failed — row is still there, admin can retry manually.
    // We still redirect to success so an attacker cannot distinguish
    // email-deliverability from validation failure (timing oracle).
  }

  // --- 5. Redirect to success page ---
  // Cast through typedRoutes — Plan 06 routes are not yet in the registry
  // when this file compiles in the same build (chicken-and-egg with the
  // sibling success page). Removed once typedRoutes picks them up.
  redirect('/ko/contact/dsar/success' as Route);
}
