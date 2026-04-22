'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Mobile hamburger menu — appears below the `sm` breakpoint.
 *
 * Client component: needs useState to toggle the panel. The Header remains
 * a server component and renders this alongside the desktop nav, which it
 * hides via Tailwind responsive utilities.
 *
 * `links` is passed from the server-component Header so i18n + typed-route
 * resolution stays on the server. The signed-in user's auth state is
 * rendered as a slot (`trailing`) so the server-side `UserMenu` can nest
 * here without duplication.
 */
export function MobileNav({
  links,
  trailing,
  ariaLabel,
  openLabel,
  closeLabel,
}: {
  links: Array<{ href: string; label: string }>;
  trailing: React.ReactNode;
  ariaLabel: string;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? closeLabel : openLabel}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>
      {open && (
        <nav
          id="mobile-nav-panel"
          aria-label={ariaLabel}
          className="absolute inset-x-0 top-full z-40 border-b border-t bg-background shadow-sm"
        >
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block rounded-md px-2 py-2 hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="border-t pt-3 mt-1">{trailing}</li>
          </ul>
        </nav>
      )}
    </div>
  );
}
