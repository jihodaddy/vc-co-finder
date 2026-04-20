import type { ReactNode } from 'react';

/**
 * Public route group — anonymous users can read everything underneath.
 *
 * Plan 05 adds the header/footer chrome; Plan 01 keeps this a passthrough
 * so landing/login/privacy can be added incrementally without refactors.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
