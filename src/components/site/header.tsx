import Link from 'next/link';
import type { Route } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';

/**
 * Site header rendered on every (public) route.
 *
 * Server component — resolves the current locale + translations in parallel
 * with the `UserMenu` (itself server-component, reads the Supabase session)
 * so the rendered tree is a single async pass.
 *
 * Nav links are locale-aware (`/${locale}/sources` etc.) matching the
 * next-intl `localePrefix: 'always'` routing config from Plan 01.
 *
 * Responsive: at ≥ sm (640 px) the horizontal nav is rendered inline.
 * Below sm a hamburger button (MobileNav) replaces it and discloses the
 * same link list in a dropdown panel. The nav items live in a single
 * JS array so both surfaces render from the same source of truth.
 *
 * Phase 3.1 Wave 3 brand dressing:
 * - Brand wordmark uses Geist (display) + tight tracking.
 * - Decorative lime square precedes the translated app name instead of
 *   splitting the i18n string (FOUND-10 carry-forward: translations must
 *   remain intact; the dot is a pure ::before-style visual glyph marked
 *   aria-hidden so assistive tech announces the full "VC Co-Finder" label).
 * - Nav links render as muted-foreground by default and ease to foreground
 *   on hover, matching `.design-import/landing.jsx` shell treatment.
 */
export async function Header() {
  const [locale, t, tCommon] = await Promise.all([
    getLocale(),
    getTranslations('header'),
    getTranslations('common'),
  ]);
  const navLinks = [
    { href: `/${locale}/sources`, label: t('nav.sources') },
    { href: `/${locale}/privacy`, label: t('nav.privacy') },
    { href: `/${locale}/terms`, label: t('nav.terms') },
  ];
  return (
    <header className="relative border-b border-[color:var(--border)] bg-[color:var(--background)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href={`/${locale}/` as Route}
          className="inline-flex items-center gap-1.5 font-[family-name:var(--font-geist)] text-lg font-bold tracking-[-0.3px] text-[color:var(--foreground)]"
        >
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-[2px] bg-[color:var(--primary)]"
          />
          {tCommon('appName')}
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-[color:var(--muted-foreground)]">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href as Route}
              className="hover:text-[color:var(--foreground)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <UserMenu />
        </nav>
        <MobileNav
          links={navLinks}
          trailing={<UserMenu />}
          ariaLabel={t('nav.menuLabel')}
          openLabel={t('nav.openMenu')}
          closeLabel={t('nav.closeMenu')}
        />
      </div>
    </header>
  );
}
