'use client';

import { useState } from 'react';
import { GoogleButton } from './google-button';
import { KakaoButton } from './kakao-button';
import { PipaConsent } from './pipa-consent';

type Props = { nextPath: string };

/**
 * Composite client component rendered by the `/[locale]/login` server page.
 *
 * State lives here (not in each button) so one consent checkbox gates every
 * OAuth provider — toggling a button-level state would create racey UX
 * where a click arrives before consent is registered. The consent checkbox
 * must remain in sync with the disabled attribute on both buttons.
 *
 * Adding providers later (email/password in v2, Naver in v2) only requires
 * dropping another `*-button` component next to the existing two and
 * passing the same `disabled={!consented}` prop.
 */
export function SignInPanel({ nextPath }: Props) {
  const [consented, setConsented] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <PipaConsent checked={consented} onChange={setConsented} />
      <GoogleButton disabled={!consented} nextPath={nextPath} />
      <KakaoButton disabled={!consented} nextPath={nextPath} />
    </div>
  );
}
