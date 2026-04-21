'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

const STORAGE_KEY = 'vc-co-finder.cookie-notice.dismissed';

/**
 * Minimal Korean functional-cookie notice per D-04.4.
 *
 * Shows once until dismissed; the dismissal flag lives in localStorage as a
 * single boolean key (`'1'`) — no PII, no server logging (per PIPA §22-2 the
 * service uses only functional cookies so no consent record is legally
 * required). The `try/catch` around localStorage is deliberate: private
 * browsing mode throws, and in that case we silently suppress the notice
 * rather than nagging the user every page load (T-01-05-08 mitigation).
 *
 * Links to `/${locale}/privacy` for the full policy rather than embedding it
 * inline.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  const t = useTranslations('cookieNotice');
  const locale = useLocale();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private mode / SSR) — don't nag
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-white/95 backdrop-blur px-4 py-3 text-sm flex flex-col sm:flex-row items-start sm:items-center gap-3"
    >
      <p className="flex-1">
        {t('message')}{' '}
        <Link href={`/${locale}/privacy`} className="underline">
          {t('privacyLink')}
        </Link>
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(STORAGE_KEY, '1');
          } catch {
            // private mode — accept still hides for the session
          }
          setVisible(false);
        }}
        className="rounded border px-3 py-1"
      >
        {t('accept')}
      </button>
    </div>
  );
}
