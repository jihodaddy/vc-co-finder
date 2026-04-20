import { defineRouting } from 'next-intl/routing';

/**
 * next-intl routing config (per D-05.1/D-05.2).
 *
 * `localePrefix: 'always'` guarantees every URL is under `/ko/*` or `/en/*`,
 * and the root `/` 307-redirects to `/ko/` (the default). This keeps Plan 08
 * SEO work clean — no redirect chains, no root-level rewrite rules.
 *
 * Korean is the copy source of truth (D-05.4). `en.json` mirrors the key
 * tree with empty strings until translation starts in Phase 7+.
 */
export const routing = defineRouting({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'always',
});
