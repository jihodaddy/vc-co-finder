import Link from 'next/link';
import type { Route } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Disclaimer } from './disclaimer';

/**
 * Site footer rendered on every (public) route.
 *
 * Contains the TRUST-06 Disclaimer component + locale-aware compliance nav
 * (sources / privacy / terms / dsar) + copyright + version. Per D-04.7 the
 * Disclaimer is intentionally the first element so users scanning down from
 * content see it before the link list.
 *
 * All strings sourced from `footer.*` — no hardcoded Korean in JSX.
 */
export async function Footer() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('footer'),
  ]);
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-4">
        <Disclaimer />
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link href={`/${locale}/sources`}>{t('links.sources')}</Link>
          <Link href={`/${locale}/privacy`}>{t('links.privacy')}</Link>
          <Link href={`/${locale}/terms`}>{t('links.terms')}</Link>
          {/*
            DSAR landing route is delivered by Plan 06 (PIPA DSAR handler).
            Footer link must be live in Phase 1 per FOUND-11 / D-04.7, so
            we cast through the typedRoutes registry until the page lands.
            robots.txt already Disallows this path (PITFALLS #7).
          */}
          <Link href={`/${locale}/contact/dsar` as Route}>
            {t('links.dsar')}
          </Link>
        </nav>
        <p className="text-xs text-neutral-500">
          {t('copyright', { year })} · {t('version')}
        </p>
      </div>
    </footer>
  );
}
