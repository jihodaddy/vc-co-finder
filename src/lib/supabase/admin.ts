import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. Bypasses RLS.
 *
 * Use ONLY in trusted server-side contexts:
 *   - ETL workers (Phase 4a+)
 *   - `/api/revalidate` webhook (Phase 4a)
 *   - Admin Server Actions (Phase 4b)
 *   - Scheduled jobs / heartbeat endpoint (Plan 07)
 *
 * **NEVER import from a Client Component or any module that may end up in
 * the browser bundle.** The `import 'server-only'` directive causes the
 * Next.js build to fail if this file is pulled into a client chunk.
 *
 * The service-role key has no `NEXT_PUBLIC_` prefix by design — Next.js
 * cannot inline it into client code. See threat T-01-01 in the plan's
 * <threat_model>.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required but not set');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
