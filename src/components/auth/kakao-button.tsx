'use client';

import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

type Props = {
  disabled: boolean;
  nextPath: string;
};

/**
 * Kakao OAuth button — feature-flagged off by default per D-01.1.
 *
 * Kakao `account_email` scope is only granted to Business-verified
 * Developers apps. Until that verification completes (checklist in
 * `docs/auth/KAKAO_BUSINESS_APP.md`), this button is rendered disabled
 * with a "준비 중" badge + tooltip, and the click handler is a no-op
 * even if a stylesheet override re-enables the button.
 *
 * Flip `NEXT_PUBLIC_KAKAO_ENABLED=true` (`.env.example`) after:
 *   1. Kakao Business app approval,
 *   2. `account_email` consent item enabled in Kakao Developers console,
 *   3. Kakao provider credentials pasted into Supabase Dashboard.
 *
 * Scope string `account_email profile_nickname` is the minimum we need for
 * the `profiles` row — email is required, nickname is optional.
 */
const KAKAO_ENABLED = process.env.NEXT_PUBLIC_KAKAO_ENABLED === 'true';

export function KakaoButton({ disabled, nextPath }: Props) {
  const t = useTranslations('login');
  const supabase = createClient();

  async function handleClick() {
    if (!KAKAO_ENABLED) return;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo, scopes: 'account_email profile_nickname' },
    });
    if (error) {
      alert(t('oauthError', { message: error.message }));
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || !KAKAO_ENABLED}
      onClick={handleClick}
      className="w-full rounded border px-4 py-2 disabled:opacity-50"
      aria-label={t('kakao')}
      title={!KAKAO_ENABLED ? t('kakaoDisabledTooltip') : undefined}
    >
      {t('kakao')}
      {!KAKAO_ENABLED && (
        <span className="ml-2 text-xs">({t('kakaoPending')})</span>
      )}
    </button>
  );
}
