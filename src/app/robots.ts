import type { MetadataRoute } from 'next';

/**
 * Phase 1 robots.txt.
 *
 * Strategy:
 *   - allow public marketing pages (`/`, `/ko/`, `/ko/sources`,
 *     `/ko/privacy`, `/ko/terms`)
 *   - disallow administrative + write surfaces (`/admin/`, `/ko/admin/`,
 *     `/api/`, `/auth/`) so search bots do not surface them
 *   - disallow `/ko/contact/dsar` per PITFALLS #7 — the DSAR form should
 *     not be SEO-indexed (avoids spam submissions and preserves the form
 *     for users actually exercising their rights)
 *
 * Threat note: the admin URL appearing here is NOT a secret. Plan 03's
 * `requireAdminOrEditor` guard returns 404 for non-admins, so listing the
 * path leaks no actionable information (T-01-05-01 in the threat register).
 *
 * Sitemap is intentionally absent — Phase 8 (LAUNCH-01) adds the dynamic
 * sitemap.xml once seed content reaches the threshold.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/ko/', '/ko/sources', '/ko/privacy', '/ko/terms'],
        disallow: [
          '/admin/',
          '/ko/admin/',
          '/api/',
          '/auth/',
          '/ko/contact/dsar',
        ],
      },
    ],
  };
}
