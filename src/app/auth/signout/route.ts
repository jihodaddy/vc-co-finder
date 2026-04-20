import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /auth/signout — clears the Supabase session cookie and redirects home.
 *
 * Deliberately POST-only (no `GET` export):
 *   - Blocks CSRF-triggered signouts from `<img src="/auth/signout">`,
 *     `<link rel="prefetch">`, or drive-by anchor navigation (T-01-04-05).
 *   - Same-site forms submitted from our own pages still work because the
 *     `<form method="POST">` in `UserMenu` carries the session cookie.
 *
 * Returns a 303 See Other redirect — POST → GET transition is the standard
 * Post/Redirect/Get pattern so the browser back button does not resubmit.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/ko/', request.url), { status: 303 });
}
