import { getTranslations } from 'next-intl/server';

/**
 * /terms — minimal v1 Korean Terms of Service (D-04.6).
 *
 * Four sections: data accuracy disclaimer, no-warranty / liability cap,
 * anti-scraping / no-redistribution, contact + governing law. Separate
 * from privacy (D-04.6). All copy via `t()`.
 */
const SECTIONS = [
  { heading: 'terms.dataAccuracyTitle', body: 'terms.dataAccuracyBody' },
  { heading: 'terms.noWarrantyTitle', body: 'terms.noWarrantyBody' },
  { heading: 'terms.scrapingTitle', body: 'terms.scrapingBody' },
  { heading: 'terms.contactTitle', body: 'terms.contactBody' },
];

export default async function TermsPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">{t('terms.title')}</h1>
      <p className="mt-2 text-xs text-neutral-500">
        {t('terms.lastUpdated')}
      </p>
      <p className="mt-4 text-sm">{t('terms.intro')}</p>
      {SECTIONS.map(({ heading, body }) => (
        <section key={heading} className="mt-8">
          <h2 className="text-lg font-semibold">{t(heading)}</h2>
          <p className="mt-2 text-sm leading-relaxed">{t(body)}</p>
        </section>
      ))}
    </main>
  );
}
