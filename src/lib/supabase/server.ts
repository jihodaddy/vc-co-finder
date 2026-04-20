import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client for RSCs, Route Handlers, and Server Actions.
 *
 * Uses the anonymous key plus the user's JWT (stored in cookies) so RLS
 * applies to every query. Session cookie refresh is performed by middleware
 * via `updateSession` in `./middleware.ts` — this client does not refresh.
 *
 * See https://supabase.com/docs/guides/auth/server-side/nextjs for the
 * canonical @supabase/ssr pattern.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // is refreshing the session on every request.
          }
        },
      },
    }
  );
}
