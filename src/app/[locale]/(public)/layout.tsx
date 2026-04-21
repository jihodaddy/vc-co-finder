import type { ReactNode } from 'react';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { CookieNotice } from '@/components/site/cookie-notice';

/**
 * Public route group — anonymous users can read everything underneath.
 *
 * Chrome (header/footer + cookie notice) lives here so every public page
 * picks it up automatically. Client-side CookieNotice mounts once per
 * (public) subtree and persists its dismissal in localStorage.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="min-h-[60vh]">{children}</div>
      <Footer />
      <CookieNotice />
    </>
  );
}
