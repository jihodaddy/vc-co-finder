import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';

/**
 * Header-level user menu rendered in every page's site chrome.
 *
 * Server component — pulls the authenticated user via the request-cached
 * `getSessionUser()` helper (so repeated calls in the same render tree are
 * deduped). When unauthenticated shows a single Login link; when
 * authenticated shows the user's email + a POST signout form.
 *
 * Locale-aware: Login link points at `/<locale>/login`, matching the
 * next-intl `localePrefix: 'always'` routing config (D-05.1). The signout
 * form targets `/auth/signout` (locale-independent — it is a pure side
 * effect endpoint).
 *
 * The signout form uses `method="POST"` to match the route handler's CSRF
 * posture; a GET-triggered signout would 405.
 */
export async function UserMenu() {
  const [user, locale, t] = await Promise.all([
    getSessionUser(),
    getLocale(),
    getTranslations('auth'),
  ]);

  if (!user) {
    return (
      <Link href={`/${locale}/login`} className="text-sm underline">
        {t('login')}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span aria-label={t('signedInAs')}>{user.email ?? user.id.slice(0, 8)}</span>
      <form method="POST" action="/auth/signout">
        <button type="submit" className="underline">
          {t('signOut')}
        </button>
      </form>
    </div>
  );
}
