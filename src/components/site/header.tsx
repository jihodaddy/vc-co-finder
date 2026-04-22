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
    <header className="relative border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href={`/${locale}/` as Route}
          className="text-lg font-semibold"
        >
          {tCommon('appName')}
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href as Route}>
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
