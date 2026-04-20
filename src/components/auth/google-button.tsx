'use client';

import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

type Props = {
  disabled: boolean;
  nextPath: string;
};

/**
 * Google OAuth entrypoint button.
 *
 * Google is the unblocked OAuth path per D-01.1 — Kakao requires a Business
 * Developers app (see `docs/auth/KAKAO_BUSINESS_APP.md`) so Google ships
 * first. The click handler invokes `supabase.auth.signInWithOAuth` with the
 * browser anon client; Supabase redirects to Google, Google returns to
 * `/auth/callback?code=...&next=<nextPath>`.
 *
 * `nextPath` is pre-validated by the server `LoginPage` component (open-
 * redirect guard) before being passed down, so we pass it through as-is and
 * URL-encode at build time only.
 *
 * Error surfacing is intentionally crude (`alert`) for Plan 04 — Sentry
 * capture lands in Plan 07 and will replace this.
 */
export function GoogleButton({ disabled, nextPath }: Props) {
  const t = useTranslations('login');
  const supabase = createClient();

  async function handleClick() {
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      alert(t('oauthError', { message: error.message }));
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className="w-full rounded border px-4 py-2 disabled:opacity-50"
      aria-label={t('google')}
    >
      {t('google')}
    </button>
  );
}
