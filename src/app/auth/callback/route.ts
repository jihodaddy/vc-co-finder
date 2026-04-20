import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth callback per https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * Flow:
 *   1. Browser calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })`
 *   2. Provider sends the user back to `/auth/callback?code=...&next=/ko/` (same origin).
 *   3. This handler exchanges the PKCE `code` for a session cookie and redirects to `next`.
 *
 * Security:
 *   - `next` query param is validated as a same-origin relative path only — `/ko/...` is
 *     accepted, `//evil.com` and `https://evil.com` are rejected to prevent T-01-04-01
 *     (open-redirect in phishing campaigns).
 *   - Missing `code` is treated as an error path back to `/ko/login` rather than a
 *     blank screen — helps surface OAuth provider misconfiguration during setup.
 *   - Error messages from `exchangeCodeForSession` are `encodeURIComponent`-wrapped
 *     before being inserted into the redirect URL (T-01-04-06 defense).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextRaw = url.searchParams.get('next') ?? '/ko/';

  // Open-redirect guard: only allow relative paths starting with exactly one slash.
  // `//evil.com` is rejected because browsers interpret it as `http://evil.com`.
  const next =
    nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/ko/';

  if (!code) {
    return NextResponse.redirect(
      new URL('/ko/login?error=missing_code', url.origin)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/ko/login?error=${encodeURIComponent(error.message)}`,
        url.origin
      )
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
