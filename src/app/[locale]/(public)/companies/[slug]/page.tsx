import { notFound } from 'next/navigation';
import { getCompanyBySlug } from '@/lib/data/companies';
import { Hero } from '@/components/profile/Hero';
import { AliasList } from '@/components/profile/AliasList';
import { FundingRoundsTable } from '@/components/profile/FundingRoundsTable';
import { IdentifierList } from '@/components/profile/IdentifierList';

/**
 * PROF-01 — Company profile (read-only, ISR).
 *
 * D-Discretion-5: `revalidate = 3600` sets the 1-hour ceiling at the
 * route level; the data wrapper in `@/lib/data/companies.ts` also wraps
 * with `unstable_cache({ tags: ['company:${slug}'], revalidate: 3600 })`
 * so Phase 4a DATA-10 webhook can invalidate a specific company on ETL
 * publish without waiting for the clock.
 *
 * D-04: Only Hero / AliasList / FundingRoundsTable / IdentifierList
 * render. Do NOT pre-reserve layout space for later-phase sections.
 * When those phases arrive, insertion points go AFTER FundingRoundsTable
 * and BEFORE IdentifierList.
 *
 * Research A6 resolution: no static-param pre-generation — pages build
 * on first visit (dynamicParams: true is the Next 15.5 default). Seed
 * grows over time; we avoid rebuilding on every new company.
 *
 * Research §V5 resolution: slug is validated against
 * `^[a-z0-9]+(-[a-z0-9]+)*$` BEFORE the DB round-trip. Fast-404 for
 * bogus paths + defense-in-depth against abusive payloads reaching
 * PostgREST (even though `.eq('slug', slug)` is already parameterized).
 */

export const revalidate = 3600;
export const dynamicParams = true;

type PageParams = Promise<{ locale: string; slug: string }>;

/**
 * URL-safe kebab-case: one or more segments of [a-z0-9], separated by
 * single hyphens. Same shape as `seed-coverage.test.ts` slug check, so
 * any valid seed slug passes; anything else is a 404.
 */
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export default async function CompanyPage({ params }: { params: PageParams }) {
  const { slug } = await params;

  // RESEARCH §V5 — slug regex at route boundary (fast-404 + abuse reject).
  if (!SLUG_REGEX.test(slug)) notFound();

  const profile = await getCompanyBySlug(slug);
  if (!profile) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-8">
        <Hero company={profile.hero} />
        <AliasList aliases={profile.aliases} />
        <FundingRoundsTable rounds={profile.fundingRounds} />
        <IdentifierList identifiers={profile.identifiers} />
      </div>
    </main>
  );
}

// Metadata is Phase 8 scope (PROF-09 JSON-LD + unique meta description).
// Phase 2 relies on Next's default <title> inheritance from the layout.
