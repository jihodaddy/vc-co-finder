import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

/**
 * Server-side safety net for the root `/` redirect.
 *
 * next-intl middleware handles this via `localePrefix: 'always'` in practice,
 * but if the middleware matcher ever skips `/` (e.g. during a future routing
 * refactor) this page guarantees the redirect still fires — per D-05.1
 * ("root `/` → 302 to `/ko/`").
 */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
