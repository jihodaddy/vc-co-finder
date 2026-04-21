import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * Public landing page (D-06.1).
 *
 * Real content — not a "Coming Soon" placeholder. Hero + 3-up value props +
 * status note. Every string flows through `getTranslations('landing')` per
 * FOUND-10 / D-05.4. CTA links are locale-aware so `/en/login` works once
 * en.json is translated.
 */
export default async function LandingPage() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('landing'),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <section className="text-center">
        <h1 className="text-4xl font-semibold leading-tight">
          {t('hero.headline')}
        </h1>
        <p className="mt-4 text-lg text-neutral-700">{t('hero.subhead')}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href={`/${locale}/login`}
            className="rounded bg-neutral-900 px-5 py-2 text-white"
          >
            {t('hero.ctaPrimary')}
          </Link>
          <Link
            href={`/${locale}/sources`}
            className="rounded border px-5 py-2"
          >
            {t('hero.ctaSecondary')}
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-8 md:grid-cols-3">
        <article>
          <h2 className="font-semibold">{t('valueProps.faceted.title')}</h2>
          <p className="mt-2 text-sm text-neutral-700">
            {t('valueProps.faceted.body')}
          </p>
        </article>
        <article>
          <h2 className="font-semibold">{t('valueProps.provenance.title')}</h2>
          <p className="mt-2 text-sm text-neutral-700">
            {t('valueProps.provenance.body')}
          </p>
        </article>
        <article>
          <h2 className="font-semibold">{t('valueProps.open.title')}</h2>
          <p className="mt-2 text-sm text-neutral-700">
            {t('valueProps.open.body')}
          </p>
        </article>
      </section>

      <p className="mt-16 text-center text-xs text-neutral-500">
        {t('status')}
      </p>
    </main>
  );
}
