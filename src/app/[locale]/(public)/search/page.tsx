import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { searchParamsCache } from '@/lib/search/query-params';
import { searchAdapter } from '@/lib/search/adapter';
import { getFacetDomain } from '@/lib/search/facet-domain';
import { EMPLOYEE_BUCKETS } from '@/lib/search/types';
import type { SearchQuery, EmployeeBucket } from '@/lib/search/types';
import { SearchPage } from '@/components/search/SearchPage';
import { ResultsSkeleton } from '@/components/search/ResultsSkeleton';

/**
 * SRCH-01 — `/search` route entry (server component).
 *
 * Next.js 15 App Router `searchParams: Promise<...>` pattern (RESEARCH
 * §Pattern 1). We parse via `searchParamsCache.parse(await searchParams)`
 * then adapt the raw nuqs output into the typed `SearchQuery` expected by
 * the Postgres adapter (types diverge because the URL keeps range values
 * as "min-max" strings, while the adapter takes discriminated `employees`
 * + `bigint` / number ranges).
 *
 * ISR off / request-fresh: filter cardinality is too high to cache
 * usefully (RESEARCH §Anti-Patterns). `dynamic='force-dynamic'` +
 * `revalidate=0` keep every request live against Postgres.
 *
 * No cookies inside cache: `getFacetDomain` + `searchAdapter.search`
 * both use cookie-free anon clients (RESEARCH §Pitfall 5).
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'search' });
  return {
    title: t('page.title'),
    description: t('page.description'),
  };
}

/**
 * Convert the raw nuqs output (strings like "51_200" or "10000-50000")
 * into the discriminated-union shape the adapter consumes.
 */
function adaptQuery(
  raw: Awaited<ReturnType<typeof searchParamsCache.parse>>,
): SearchQuery {
  const emp = raw.employees;
  let empResolved: SearchQuery['employees'];
  if (!emp) {
    empResolved = { kind: 'none' };
  } else if ((EMPLOYEE_BUCKETS as readonly string[]).includes(emp)) {
    empResolved = { kind: 'bucket', bucket: emp as EmployeeBucket };
  } else {
    const [a = '', b = ''] = emp.split('-');
    empResolved = {
      kind: 'range',
      min: a ? parseInt(a, 10) : undefined,
      max: b ? parseInt(b, 10) : undefined,
    };
  }

  const [fMin = '', fMax = ''] = (raw.funding ?? '').split('-');
  const [yMin = '', yMax = ''] = (raw.founded ?? '').split('-');

  return {
    q: raw.q,
    sectors: raw.sectors,
    stage: raw.stage,
    region: raw.region,
    employees: empResolved,
    funding: {
      min: fMin ? BigInt(fMin) : null,
      max: fMax ? BigInt(fMax) : null,
    },
    founded: {
      min: yMin ? parseInt(yMin, 10) : null,
      max: yMax ? parseInt(yMax, 10) : null,
    },
    sort: raw.sort,
    page: raw.page,
    perPage: Number(raw.per_page) as 25 | 50 | 100,
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  // params.locale is required by Next.js 15's type system for localized
  // segments, but the adapter + UI layer read locale from next-intl
  // providers transparently. Destructure to document the contract.
  await params;

  const raw = await searchParamsCache.parse(await searchParams);
  const query = adaptQuery(raw);

  const [result, domain] = await Promise.all([
    searchAdapter.search(query),
    getFacetDomain(),
  ]);

  return (
    <Suspense fallback={<ResultsSkeleton view={raw.view} />}>
      <SearchPage result={result} domain={domain} />
    </Suspense>
  );
}
