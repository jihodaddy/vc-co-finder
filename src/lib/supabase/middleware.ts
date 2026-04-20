import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
