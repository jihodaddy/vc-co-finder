import type { ReactNode } from 'react';

/**
 * Admin route group — reserved for Plan 03+ pages. Per D-06.3, admin URLs
 * respond with 404 (not 403) for non-admin users to avoid surface leakage.
 * The role gate itself arrives in Plan 03; this passthrough is the skeleton
 * so later plans only add the guard logic.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
