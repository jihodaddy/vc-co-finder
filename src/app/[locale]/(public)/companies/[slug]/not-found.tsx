import Link from 'next/link';
import type { Route } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * 404 for unknown slugs. Rendered when `page.tsx` calls `notFound()` —
 * which happens for BOTH (a) regex-failing slugs (V5 abuse reject) and
 * (b) DB-miss on a well-formed slug.
 * UI-SPEC §Copywriting: profile.notFound.heading + body + searchCta.
 *
 * Link to /search will 404 in Phase 2 (Phase 3 lands the route) — that
 * is acceptable per D-04 (don't build placeholders). The key
 * `profile.notFound.searchCta` is wired so Phase 3 unblocks immediately.
 */
export default async function CompanyNotFound() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('profile.notFound'),
  ]);
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold leading-tight">{t('heading')}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{t('body')}</p>
      <div className="mt-8">
        <Link
          href={`/${locale}/search` as Route}
          className="inline-flex items-center rounded border px-4 py-2 text-sm hover:bg-muted/40"
        >
          {t('searchCta')}
        </Link>
      </div>
    </main>
  );
}
