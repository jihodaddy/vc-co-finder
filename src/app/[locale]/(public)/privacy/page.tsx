import { getTranslations } from 'next-intl/server';

/**
 * /privacy — Hand-written Korean PIPA-compliant policy (FOUND-11 / D-04.2).
 *
 * 10 sections (preamble + 9 numbered) authored against the KISA 표준
 * 개인정보처리방침 skeleton. All copy lives in `src/messages/ko.json` so
 * translators (Phase 7+) can localize without touching this component.
 *
 * NOTE: `privacy.cpoBody` contains the placeholder `privacy@[도메인]` —
 * Plan 06 (DSAR handler) or Plan 08 (launch smoke test) replaces the
 * bracket once a real domain is bound. Tracked in 01-05-SUMMARY.md.
 */
const SECTIONS = [
  { heading: 'privacy.preambleSection', body: 'privacy.preambleBody' },
  { heading: 'privacy.itemsSection', body: 'privacy.itemsBody' },
  { heading: 'privacy.purposeSection', body: 'privacy.purposeBody' },
  { heading: 'privacy.retentionSection', body: 'privacy.retentionBody' },
  { heading: 'privacy.thirdPartySection', body: 'privacy.thirdPartyBody' },
  {
    heading: 'privacy.intlTransferSection',
    body: 'privacy.intlTransferBody',
  },
  { heading: 'privacy.rightsSection', body: 'privacy.rightsBody' },
  { heading: 'privacy.cookiesSection', body: 'privacy.cookiesBody' },
  { heading: 'privacy.cpoSection', body: 'privacy.cpoBody' },
  { heading: 'privacy.changesSection', body: 'privacy.changesBody' },
];

export default async function PrivacyPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">{t('privacy.title')}</h1>
      <p className="mt-2 text-xs text-neutral-500">
        {t('privacy.lastUpdated')}
      </p>

      {SECTIONS.map(({ heading, body }) => (
        <section key={heading} className="mt-8">
          <h2 className="text-lg font-semibold">{t(heading)}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
            {t(body)}
          </p>
        </section>
      ))}

      <p className="mt-12 text-xs text-neutral-500">
        {t('privacy.disclaimerNote')}
      </p>
    </main>
  );
}
