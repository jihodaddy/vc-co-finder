'use client';

import { useState } from 'react';
import { throwServerActionError } from './actions';

/**
 * Hidden diagnostic page used to verify Sentry captures both runtime
 * (browser) and Server Action errors. Intentionally unlinked. After Plan 08
 * smoke test we keep it as a debug utility — Sentry events are tagged with
 * `environment` so prod noise is identifiable.
 */
export default function SentryTestPage() {
  const [serverActionFired, setServerActionFired] = useState(false);

  function fireRuntimeError() {
    // Throws synchronously inside an event handler — caught by React's
    // error boundary then reported to Sentry by the SDK.
    throw new Error(
      'Sentry verification: deliberate runtime error (safe to ignore)'
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Sentry Verification</h1>
      <p className="mt-4 text-sm">
        This page exists only for the Plan 07 success-criterion smoke test.
        Clicking either button fires a harmless error that Sentry should
        capture.
      </p>
      <div className="mt-8 flex flex-col gap-4">
        <button
          type="button"
          onClick={fireRuntimeError}
          className="rounded border px-4 py-2"
        >
          Throw runtime error (client)
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await throwServerActionError();
            } catch {
              setServerActionFired(true);
            }
          }}
          className="rounded border px-4 py-2"
        >
          Throw server-action error
        </button>
        {serverActionFired && (
          <p className="text-sm text-neutral-600">
            Server-action fired — check Sentry for capture.
          </p>
        )}
      </div>
    </main>
  );
}
