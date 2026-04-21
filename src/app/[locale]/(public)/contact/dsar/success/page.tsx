import { getTranslations } from 'next-intl/server';

export default async function DsarSuccessPage() {
  const t = await getTranslations('dsar');
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">{t('successTitle')}</h1>
      <p className="mt-4 text-sm leading-relaxed text-neutral-700">{t('successBody')}</p>
    </main>
  );
}
