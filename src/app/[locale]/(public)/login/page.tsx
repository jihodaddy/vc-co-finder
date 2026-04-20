import { getTranslations } from 'next-intl/server';
import { SignInPanel } from '@/components/auth/sign-in-panel';

/**
 * Login page served at `/<locale>/login` (D-06.4).
 *
 * Server component: reads + validates the `next` query param before handing
 * it to the client panel. This mirrors the guard in `/auth/callback` — if a
 * link like `/ko/login?next=//evil.com` is opened, the SSR layer rewrites
 * `next` back to the safe default before any OAuth button captures it.
 *
 * Error toasts surface `?error=` back-channel messages produced by the
 * OAuth callback when code exchange fails; they are i18n-prefixed so end
 * users see a Korean-language label alongside the encoded provider error.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const t = await getTranslations('login');
  const nextPath =
    sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//')
      ? sp.next
      : '/ko/';

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-8 text-2xl font-semibold">{t('title')}</h1>
      {sp.error && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {t('errorPrefix')}: {sp.error}
        </div>
      )}
      <SignInPanel nextPath={nextPath} />
    </main>
  );
}
