'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Use ONLY in Client Components.
 *
 * Reads the anonymous public key from `NEXT_PUBLIC_*` env vars (safe to ship
 * to the browser). RLS policies are the real security boundary — see
 * `.planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md` D-03.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
