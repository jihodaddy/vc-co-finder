import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { routing } from '@/i18n/routing';
import '../globals.css';

export const metadata = {
  title: 'VC Co-Finder',
  description: '한국·아시아 스타트업 검색·비교 인텔리전스',
};

// next-intl 3.26 does not export `hasLocale`; inline the equivalent check.
function isSupportedLocale(
  value: string
): value is (typeof routing.locales)[number] {
  return (routing.locales as readonly string[]).includes(value);
}

/**
 * Locale-scoped root layout. This is where `<html>` / `<body>` live; the
 * `src/app/layout.tsx` shim above it only forwards children so the root
 * layout requirement is satisfied.
 *
 * Invalid locales call `notFound()` which renders the nearest `not-found.tsx`
 * with a 404 — avoids silently serving the default locale for typo'd paths.
 *
 * Plan 07: Vercel Analytics + Speed Insights are mounted INSIDE `<body>`
 * (below the i18n provider) so route-aware events fire correctly. Both are
 * cookieless on Vercel Hobby — see threat T-01-07-10.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const messages = await getMessages({ locale });
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <NuqsAdapter>{children}</NuqsAdapter>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
