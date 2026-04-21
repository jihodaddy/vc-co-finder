import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { UserMenu } from './user-menu';

/**
 * Site header rendered on every (public) route.
 *
 * Server component — resolves the current locale + translations in parallel
 * with the `UserMenu` (itself server-component, reads the Supabase session)
 * so the rendered tree is a single async pass.
 *
 * Nav links are locale-aware (`/${locale}/sources` etc.) matching the
 * next-intl `localePrefix: 'always'` routing config from Plan 01.
 */
export async function Header() {
  const [locale, t, tCommon] = await Promise.all([
    getLocale(),
    getTranslations('header'),
    getTranslations('common'),
  ]);
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href={`/${locale}/`} className="text-lg font-semibold">
          {tCommon('appName')}
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href={`/${locale}/sources`}>{t('nav.sources')}</Link>
          <Link href={`/${locale}/privacy`}>{t('nav.privacy')}</Link>
          <Link href={`/${locale}/terms`}>{t('nav.terms')}</Link>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
