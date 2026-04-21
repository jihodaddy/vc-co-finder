import { getTranslations } from 'next-intl/server';

/**
 * /admin — Phase 1 stub page (D-06.3).
 *
 * The (admin) layout calls `requireAdminOrEditor()` which 404s for everyone
 * else, so this body never renders for non-admins. Phase 4b replaces this
 * stub with the real curation UI; this file exists in Phase 1 only to
 * validate the role-gating pipeline end-to-end.
 */
export default async function AdminStubPage() {
  const t = await getTranslations('admin');
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">{t('stubTitle')}</h1>
      <p className="mt-4 text-neutral-700">{t('stubBody')}</p>
    </main>
  );
}
