import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Detects whether Supabase is configured with real project values.
 *
 * `.env.example` ships with placeholder `https://YOUR_PROJECT.supabase.co`
 * and empty anon key so fresh-clone developers can boot `npm run dev`
 * before they've created a Supabase project. When either value looks like
 * a placeholder, we skip session refresh — otherwise the middleware would
 * throw on every request and block the `/` → `/ko/` redirect from being
 * observable. Once real values land in `.env.local`, session refresh kicks
 * in automatically.
 */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes('YOUR_PROJECT')) return false;
  return true;
}

/**
 * Refreshes the Supabase session cookie on every request. Must be called
 * from the root `src/middleware.ts` AFTER next-intl's locale middleware
 * (see D-05.3 in the phase context).
 *
 * `supabase.auth.getUser()` is load-bearing: it verifies the JWT with the
 * Supabase server, which triggers the refresh-token exchange when the
 * access token is close to expiry. The new cookies are written back onto
 * `supabaseResponse` which the middleware chain returns to the browser.
 *
 * Per Supabase docs, NEVER use `supabase.auth.getSession()` on the server
 * for auth decisions — it trusts the cookie without verification.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Pre-Supabase-setup escape hatch so `/` → `/ko/` is observable on a
  // fresh clone. The actual auth guard (Plan 04) MUST re-check config and
  // reject unauthenticated access — middleware no-op is a dev-time
  // convenience, not a security boundary.
  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRITICAL: refreshes the session cookie before Server Components read it.
  await supabase.auth.getUser();

  return supabaseResponse;
}
