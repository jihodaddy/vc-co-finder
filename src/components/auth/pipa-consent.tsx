'use client';

import { useLocale, useTranslations } from 'next-intl';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * PIPA §15 / §22 consent checkbox.
 *
 * Per D-06.4 and PITFALLS #7, explicit user consent is required before any
 * personal-data collection — including OAuth signup (which writes email to
 * `auth.users` and `profiles`). The parent `SignInPanel` disables the OAuth
 * buttons until this checkbox is ticked; the `required` attribute also
 * prevents accidental native `<form>` submissions from bypassing it.
 *
 * The consent label links to `/<locale>/privacy` — the hand-written KISA
 * skeleton policy shipped by Plan 06 (D-04.2). Marketing-purpose consent is
 * kept separate per PIPA §22-2 and lives on the alerts signup flow
 * (Phase 7), not here.
 */
export function PipaConsent({ checked, onChange }: Props) {
  const t = useTranslations('login.pipa');
  const locale = useLocale();
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby="pipa-description"
        required
      />
      <span id="pipa-description">
        {t('consentText')}{' '}
        <a href={`/${locale}/privacy`} className="underline">
          {t('privacyLink')}
        </a>
      </span>
    </label>
  );
}
