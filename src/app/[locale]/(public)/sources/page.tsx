import { getTranslations } from 'next-intl/server';

/**
 * /sources — TRUST-07 sources index (D-06.2).
 *
 * Lists active + planned data sources with phase-attribution and license
 * notes. Acknowledging future sources signals roadmap transparency to
 * researchers. Includes the excluded-sources note (the VC) so readers know
 * we will not scrape that site.
 */
type SourceEntry = {
  titleKey: string;
  statusKey: string;
  licenseKey: string;
  active: boolean;
};

const SOURCES: SourceEntry[] = [
  {
    titleKey: 'sources.manualTitle',
    statusKey: 'sources.manualStatus',
    licenseKey: 'sources.manualLicense',
    active: true,
  },
  {
    titleKey: 'sources.dartTitle',
    statusKey: 'sources.dartStatus',
    licenseKey: 'sources.dartLicense',
    active: false,
  },
  {
    titleKey: 'sources.kstartupTitle',
    statusKey: 'sources.kstartupStatus',
    licenseKey: 'sources.kstartupLicense',
    active: false,
  },
  {
    titleKey: 'sources.userSubmissionTitle',
    statusKey: 'sources.userSubmissionStatus',
    licenseKey: 'sources.userSubmissionLicense',
    active: false,
  },
  {
    titleKey: 'sources.vcPortfolioTitle',
    statusKey: 'sources.vcPortfolioStatus',
    licenseKey: 'sources.vcPortfolioLicense',
    active: false,
  },
  {
    titleKey: 'sources.newsTitle',
    statusKey: 'sources.newsStatus',
    licenseKey: 'sources.newsLicense',
    active: false,
  },
];

export default async function SourcesPage() {
  // Use root translator so we can pass full dotted keys from SOURCES[].
  const t = await getTranslations();

  const active = SOURCES.filter((s) => s.active);
  const planned = SOURCES.filter((s) => !s.active);

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">{t('sources.title')}</h1>
      <p className="mt-4 text-neutral-700">{t('sources.intro')}</p>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">
          {t('sources.activeSection')}
        </h2>
        <ul className="mt-4 space-y-4">
          {active.map((s) => (
            <li key={s.titleKey} className="rounded border p-4">
              <h3 className="font-medium">{t(s.titleKey)}</h3>
              <p className="mt-1 text-sm text-neutral-700">{t(s.statusKey)}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {t(s.licenseKey)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">
          {t('sources.plannedSection')}
        </h2>
        <ul className="mt-4 space-y-4">
          {planned.map((s) => (
            <li
              key={s.titleKey}
              className="rounded border border-dashed p-4 opacity-80"
            >
              <h3 className="font-medium">{t(s.titleKey)}</h3>
              <p className="mt-1 text-sm text-neutral-700">{t(s.statusKey)}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {t(s.licenseKey)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">{t('sources.excludedTitle')}</h2>
        <p className="mt-2 text-sm text-neutral-700">
          {t('sources.excludedBody')}
        </p>
      </section>

      <p className="mt-12 text-xs text-neutral-500">
        {t('footer.disclaimerText')}
      </p>
    </main>
  );
}
