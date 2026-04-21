import { getTranslations } from 'next-intl/server';

import { DsarForm } from './dsar-form';

export default async function DsarPage() {
  const t = await getTranslations('dsar');
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">{t('title')}</h1>
      <p className="mt-4 text-sm leading-relaxed text-neutral-700">{t('intro')}</p>
      <div className="mt-8">
        <DsarForm />
      </div>
    </main>
  );
}
