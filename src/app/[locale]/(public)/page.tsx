import { useTranslations } from 'next-intl';

/**
 * Minimal Phase-1 landing placeholder. Plan 05 replaces this with the real
 * hero + OAuth CTAs + footer disclaimer. For Plan 01 we only need `/ko/`
 * to return 200 so the `/ → /ko/` redirect chain is observable end-to-end.
 */
export default function LandingPage() {
  const t = useTranslations('common');
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">{t('appName')}</h1>
        <p className="text-muted-foreground mt-2">
          한국·아시아 스타트업 검색·비교 인텔리전스
        </p>
      </div>
    </main>
  );
}
