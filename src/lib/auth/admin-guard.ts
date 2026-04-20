import 'server-only';

import { notFound } from 'next/navigation';
import { getSessionUser } from './session';

/**
 * Admin route guard.
 *
 * Returns void when the session user has role `admin` or `editor`.
 * Calls `notFound()` (HTTP 404) for anyone else — per D-06.3, admin routes
 * respond 404, not 403, to avoid leaking the admin URL surface to attackers
 * probing for privileged endpoints.
 *
 * Defense in depth: the RLS policies in `0013_rls_user_scoped.sql` block
 * admin-only reads at the database layer even if a non-admin slipped past
 * this guard. This check only prevents rendering the admin UI shell.
 */
export async function requireAdminOrEditor(): Promise<void> {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    notFound(); // 404 — intentional per D-06.3
  }
}
