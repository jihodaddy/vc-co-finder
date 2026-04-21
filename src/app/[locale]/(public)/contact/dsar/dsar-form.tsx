'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { submitDsarRequest, type DsarActionState } from './actions';

const initialState: DsarActionState = { status: 'idle' };

export function DsarForm() {
  const t = useTranslations('dsar');
  const [state, action, pending] = useActionState(submitDsarRequest, initialState);

  const err = state.status === 'error' ? state.message : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span>{t('nameLabel')}</span>
        <input
          name="requesterName"
          required
          maxLength={100}
          className="rounded border border-neutral-300 px-3 py-2"
          aria-invalid={state.fieldErrors?.requesterName ? 'true' : undefined}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>{t('emailLabel')}</span>
        <input
          name="requesterEmail"
          type="email"
          required
          maxLength={320}
          className="rounded border border-neutral-300 px-3 py-2"
          aria-invalid={state.fieldErrors?.requesterEmail ? 'true' : undefined}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>{t('phoneLabel')}</span>
        <input
          name="requesterPhone"
          maxLength={40}
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1">{t('typeLabel')}</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="requestType" value="access" required />
          {t('typeAccess')}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="requestType" value="rectification" />
          {t('typeRectification')}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="requestType" value="erasure" />
          {t('typeErasure')}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="requestType" value="restriction" />
          {t('typeRestriction')}
        </label>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span>{t('descriptionLabel')}</span>
        <textarea
          name="subjectDescription"
          required
          maxLength={5000}
          rows={6}
          placeholder={t('descriptionPlaceholder')}
          className="rounded border border-neutral-300 px-3 py-2"
          aria-invalid={state.fieldErrors?.subjectDescription ? 'true' : undefined}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>{t('evidenceLabel')}</span>
        <input
          name="evidenceUrl"
          type="url"
          maxLength={2048}
          pattern="https://.*"
          className="rounded border border-neutral-300 px-3 py-2"
          aria-invalid={state.fieldErrors?.evidenceUrl ? 'true' : undefined}
        />
      </label>

      {err === 'rateLimited' && (
        <div
          role="alert"
          className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {t('rateLimitMessage')}
        </div>
      )}
      {err === 'validation' && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          {t('errorPrefix')}
        </div>
      )}
      {err === 'insertFailed' && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        >
          {t('errorPrefix')}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {t('submit')}
      </button>
    </form>
  );
}
