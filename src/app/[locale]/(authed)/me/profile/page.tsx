import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';

/**
 * Placeholder authenticated page at `/<locale>/me/profile`.
 *
 * Exists so the `(authed)` route group has at least one concrete leaf —
 * lets us verify the OAuth round-trip end-to-end without needing Plan 4c's
 * full watchlist UI. Shows the logged-in email + role (from the JWT claim
 * injected by `custom_access_token_hook`) so a user can confirm:
 *
 *   - Google OAuth persisted a session (`user.email` is non-null)
 *   - `fn_handle_new_user` trigger fired (`profiles` row exists → role)
 *   - `custom_access_token_hook` is enabled in the Dashboard (role is
 *     'user' rather than defaulting — see `docs/auth/SUPABASE_AUTH_HOOK.md`)
 *
 * When unauthenticated, redirects to `/<locale>/login`. Phase 4c will
 * replace this with the full profile UI; the `(authed)` layout will grow
 * a `requireUser()` guard at that point, making this in-page redirect
 * redundant.
 */
export default async function MeProfilePage() {
  const [user, locale] = await Promise.all([getSessionUser(), getLocale()]);
  if (!user) {
    redirect(`/${locale}/login`);
  }
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">프로필</h1>
      <p className="mt-4 text-sm">이메일: {user.email}</p>
      <p className="mt-2 text-sm">역할: {user.role}</p>
      <p className="mt-8 text-xs text-neutral-500">
        전체 프로필 페이지는 Phase 4c에서 구현됩니다.
      </p>
    </main>
  );
}
