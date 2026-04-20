import type { ReactNode } from 'react';
import { requireAdminOrEditor } from '@/lib/auth/admin-guard';

/**
 * Admin route group layout. Calls `requireAdminOrEditor` before rendering
 * children — non-admin visitors receive HTTP 404 via `notFound()` (D-06.3),
 * not 403, so the admin URL surface is not discoverable.
 *
 * RLS policies in migration 0013 provide the data-layer backstop; this
 * guard prevents the admin UI shell from rendering at all.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminOrEditor();
  return <>{children}</>;
}
