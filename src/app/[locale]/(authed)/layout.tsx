import type { ReactNode } from 'react';

/**
 * Authenticated route group — reserved for Phase 4c pages (watchlists,
 * saved searches). Plan 04 will add a `requireUser()` guard here; Plan 01
 * keeps it empty so the guard can be introduced without blocking route
 * creation in the meantime.
 */
export default function AuthedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
