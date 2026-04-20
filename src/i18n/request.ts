import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/**
 * next-intl request config — loads the locale's message bundle on the server.
 *
 * If `requestLocale` falls outside the configured set (e.g. a bot hits an
 * invalid `/xx/` URL), we coerce back to the default locale instead of
 * throwing — the matching `[locale]/layout.tsx` will still call `notFound()`
 * so the user sees a 404, but the provider stays stable.
 *
 * NOTE: next-intl 3.26 does not export `hasLocale`; inline the equivalent
 * check. (Re-adopt `hasLocale` when upgrading to 3.30+.)
 */
function isSupportedLocale(
  value: string | undefined
): value is (typeof routing.locales)[number] {
  return (
    typeof value === 'string' &&
    (routing.locales as readonly string[]).includes(value)
  );
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isSupportedLocale(requested)
    ? requested
    : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
