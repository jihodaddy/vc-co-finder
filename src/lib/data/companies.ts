import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  type SourceMeta,
  type SourceType,
  type WithMeta,
  attachSource,
} from './_meta';

/**
 * Cookie-free anon client for public reads.
 *
 * Deliberately does NOT use `@/lib/supabase/server` — that helper reads
 * cookies, and Next.js forbids calling `cookies()` inside `unstable_cache`.
 * The company profile is a public read gated only by RLS
 * (canonical_select_public) so the anon key + no cookies is the right fit.
 */
function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// ---- Public shapes ----------------------------------------------------

export type CompanyHero = {
  id: string;
  slug: string;
  displayNameKo: string;
  displayNameEn: string | null;
  legalName: string | null;
  sector: string | null;
  hqAddress: string | null;
  descriptionKo: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
};

export type CompanyAlias = {
  id: string;
  alias: string;
  aliasType: 'legal' | 'brand' | 'english' | 'former' | 'common';
  validFrom: string | null;
  validTo: string | null;
};

export type CompanyFundingRound = {
  id: string;
  stage: string; // funding_stage ENUM string
  amountMinor: bigint | null;
  currencyCode: string | null;
  originalText: string | null;
  announcedAt: string | null;
  closedAt: string | null;
  investors: Array<{
    id: string;
    nameKo: string;
    nameEn: string | null;
    participantType: 'lead' | 'co_lead' | 'participant' | 'follow_on' | 'unknown';
  }>;
};

export type CompanyIdentifierRow = {
  id: string;
  kind: 'dart_corp_code' | 'business_registration_number' | 'corporate_registration_number' | 'website_domain';
  value: string;
};

export type CompanyProfile = {
  hero: WithMeta<CompanyHero>;
  aliases: WithMeta<CompanyAlias>[];
  fundingRounds: WithMeta<CompanyFundingRound>[];
  identifiers: WithMeta<CompanyIdentifierRow>[];
};

// ---- Source-meta helpers ---------------------------------------------

type SourceRow = {
  id: string;
  source_type: SourceType;
  source_url: string | null;
  fetched_at: string;
  last_verified_at: string;
  confidence: string | number | null;
};

function sourceMetaFromRow(src: SourceRow, factLastVerifiedAt: string): SourceMeta {
  return {
    sourceId: src.id,
    sourceType: src.source_type,
    sourceUrl: src.source_url,
    fetchedAt: src.fetched_at,
    // Per D-01 + RESEARCH Pitfall 1: SourceBadge uses the FACT's
    // last_verified_at, not the data_source row's. The fact is closer
    // to researcher intent.
    lastVerifiedAt: factLastVerifiedAt,
    confidence:
      src.confidence === null || src.confidence === undefined
        ? null
        : typeof src.confidence === 'number'
          ? src.confidence
          : Number(src.confidence),
  };
}

// ---- Query -----------------------------------------------------------

async function fetchCompanyBySlug(slug: string): Promise<CompanyProfile | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('companies')
    .select(`
      id, slug, display_name_ko, display_name_en, legal_name,
      sector, hq_address, description_ko, website_url, logo_url,
      last_verified_at,
      source:data_sources!companies_source_id_fkey ( id, source_type, source_url, fetched_at, last_verified_at, confidence ),
      aliases ( id, alias, alias_type, valid_from, valid_to, last_verified_at, deleted_at,
                source:data_sources!aliases_source_id_fkey ( id, source_type, source_url, fetched_at, last_verified_at, confidence ) ),
      company_identifiers ( id, kind, value, last_verified_at, deleted_at,
                            source:data_sources!company_identifiers_source_id_fkey ( id, source_type, source_url, fetched_at, last_verified_at, confidence ) ),
      funding_rounds (
        id, stage, amount_minor, currency_code, original_text, announced_at, closed_at, last_verified_at, deleted_at,
        source:data_sources!funding_rounds_source_id_fkey ( id, source_type, source_url, fetched_at, last_verified_at, confidence ),
        round_investors (
          participant_type,
          investor:investors ( id, name_ko, name_en )
        )
      )
    `)
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;

  const heroMeta = sourceMetaFromRow(row.source, row.last_verified_at);
  const hero: WithMeta<CompanyHero> = attachSource(
    {
      id: row.id,
      slug: row.slug,
      displayNameKo: row.display_name_ko,
      displayNameEn: row.display_name_en,
      legalName: row.legal_name,
      sector: row.sector,
      hqAddress: row.hq_address,
      descriptionKo: row.description_ko,
      websiteUrl: row.website_url,
      logoUrl: row.logo_url,
    },
    heroMeta,
  );

  const aliases: WithMeta<CompanyAlias>[] = (row.aliases ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((a: any) => a.deleted_at === null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((a: any) =>
      attachSource(
        {
          id: a.id,
          alias: a.alias,
          aliasType: a.alias_type,
          validFrom: a.valid_from,
          validTo: a.valid_to,
        },
        sourceMetaFromRow(a.source, a.last_verified_at),
      ),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((x: any, y: any) => {
      // Current (validTo === null) first, then by validFrom desc
      if ((x.validTo === null) !== (y.validTo === null)) {
        return x.validTo === null ? -1 : 1;
      }
      return (y.validFrom ?? '').localeCompare(x.validFrom ?? '');
    });

  const identifiers: WithMeta<CompanyIdentifierRow>[] = (row.company_identifiers ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((i: any) => i.deleted_at === null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((i: any) =>
      attachSource(
        { id: i.id, kind: i.kind, value: i.value },
        sourceMetaFromRow(i.source, i.last_verified_at),
      ),
    );

  const fundingRounds: WithMeta<CompanyFundingRound>[] = (row.funding_rounds ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r: any) => r.deleted_at === null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) =>
      attachSource(
        {
          id: r.id,
          stage: r.stage,
          amountMinor:
            r.amount_minor === null || r.amount_minor === undefined
              ? null
              : BigInt(r.amount_minor),
          currencyCode: r.currency_code,
          originalText: r.original_text,
          announcedAt: r.announced_at,
          closedAt: r.closed_at,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          investors: (r.round_investors ?? []).map((ri: any) => ({
            id: ri.investor.id,
            nameKo: ri.investor.name_ko,
            nameEn: ri.investor.name_en,
            participantType: ri.participant_type,
          })),
        },
        sourceMetaFromRow(r.source, r.last_verified_at),
      ),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => (b.announcedAt ?? '').localeCompare(a.announcedAt ?? ''));

  return { hero, aliases, fundingRounds, identifiers };
}

// ---- Cache envelope (CONTEXT D-Discretion-5) -------------------------

/**
 * ISR + tag-based revalidation. Tag shape `company:${slug}` is a contract
 * Phase 4a DATA-10 webhook will emit. Present here even though no producer
 * exists yet.
 *
 * Research Open Question A6 resolution: The route segment (Plan 02-04) sets
 * `revalidate = 3600` AND `dynamicParams = true`. `generateStaticParams`
 * returns `[]` — slugs build on-demand. This keeps Phase 2 cold-start
 * flexible as seed grows.
 */
export function getCompanyBySlug(slug: string): Promise<CompanyProfile | null> {
  return unstable_cache(
    () => fetchCompanyBySlug(slug),
    ['company', slug],
    {
      tags: [`company:${slug}`],
      revalidate: 3600, // 1 hour (ROADMAP Phase 2 success criterion #4)
    },
  )();
}
