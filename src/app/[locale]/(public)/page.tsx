import Link from 'next/link';
import type { Route } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * Phase 3.1 Wave 5 — Minimal brand hero landing.
 *
 * Replaces Phase 1 Plan 05's 3-up value-prop landing with a single-screen
 * brand hero. Per CONTEXT D-03.1 step 5 + RESEARCH Open Q #4: wordmark +
 * tagline + CTA + 1-line LIVE status. Full marketing experience (scan
 * animation, auto-rotating facet demo, ticker, value-prop grid, brand-story
 * sections) is deferred to a post-launch marketing phase (CONTEXT D-03.2).
 *
 * Inherits cream bg + ink text from globals.css (Wave 1) automatically.
 * Reuses the Wave 3 header wordmark pattern (lime square + Geist bold text)
 * and the Wave 4 ResultsHeader LIVE pulse pattern (animate-ping on a lime
 * dot) for cross-route visual continuity.
 *
 * i18n: all copy via next-intl landing.hero3_1 namespace. The old
 * landing.hero / landing.valueProps keys remain in ko.json for backward
 * compatibility with any stale snapshots (Phase 1 Plan 05 consumers).
 */
export default async function LandingPage() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('landing.hero3_1'),
  ]);

  // v1: hardcoded company count until Phase 8 wires a real getCount() against
  // the seed database. 5016 matches the Phase 2 SRCH-13 cold-start baseline +
  // LAUNCH-03 projection; updated via a future data-bound Server Component.
  const companyCount = 5016;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl flex-col items-start justify-center gap-8 px-6 py-16">
      <section
        aria-labelledby="landing-hero-heading"
        className="flex flex-col gap-6"
      >
        {/* LIVE status pill */}
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1.5 text-xs">
          <span aria-hidden className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--primary)] opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--primary)]" />
          </span>
          <span className="font-mono uppercase tracking-[0.3em] text-[color:var(--foreground)] font-semibold">
            {t('eyebrow')}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {t('statusSuffix', { count: companyCount })}
          </span>
        </div>

        {/* Wordmark */}
        <div className="inline-flex items-center gap-2 font-[family-name:var(--font-geist)] text-xl font-bold tracking-[-0.3px]">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-[3px] bg-[color:var(--primary)]"
          />
          <span>VC·Finder</span>
        </div>

        {/* Headline */}
        <h1
          id="landing-hero-heading"
          className="font-[family-name:var(--font-geist)] text-5xl font-semibold leading-[1.05] tracking-[-1.5px] sm:text-6xl"
        >
          {t('headline')}
        </h1>

        {/* Tagline */}
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t('tagline')}
        </p>

        {/* CTA */}
        <div className="mt-4">
          <Link
            href={`/${locale}/search` as Route}
            className="inline-flex items-center gap-2 rounded-md bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] shadow-sm transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/40"
          >
            {t('ctaPrimary')}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
