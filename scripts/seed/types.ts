import type { SourceType } from '@/lib/data/_meta';

export type SeedAliasType = 'legal' | 'brand' | 'english' | 'former' | 'common';
export type SeedIdentifierKind =
  | 'dart_corp_code' | 'business_registration_number'
  | 'corporate_registration_number' | 'website_domain';
export type SeedFundingStage =
  | 'pre_a' | 'seed' | 'series_a' | 'series_b' | 'series_c' | 'series_d'
  | 'bridge' | 'safe' | 'convertible_note' | 'grant' | 'undisclosed';
export type SeedParticipantType = 'lead' | 'co_lead' | 'participant' | 'follow_on' | 'unknown';

export type SeedAlias = {
  alias: string;
  alias_type: SeedAliasType;
  valid_from?: string; // ISO date (YYYY-MM-DD)
  valid_to?: string;   // null = currently active
};

export type SeedRoundInvestor = {
  name_ko: string;
  name_en?: string;
  investor_type?: 'vc' | 'cvc' | 'angel' | 'gov_fund' | 'accelerator' | 'other';
  participant_type: SeedParticipantType;
};

export type SeedFundingRound = {
  stage: SeedFundingStage;
  /** KRW 원 (not 억원). bigint preserves precision beyond Number.MAX_SAFE_INTEGER. */
  amount_minor?: bigint;
  currency_code?: 'KRW' | 'USD';
  /** Human-readable original value, e.g. "$50M @ 2023 avg 1,300 KRW/USD ≈ ₩65,000,000,000". */
  original_text?: string;
  announced_at?: string; // ISO date
  closed_at?: string;    // ISO date
  investors: SeedRoundInvestor[];
  /** Per-fact verification date; controls freshness dot. */
  last_verified_at: string; // ISO date
};

export type SeedIdentifier = {
  kind: SeedIdentifierKind;
  value: string;
  last_verified_at: string;
};

export type SeedCompany = {
  slug: string; // URL-safe, stable — matches /ko/companies/[slug]
  display_name_ko: string;
  display_name_en?: string;
  legal_name?: string;
  sector: string;
  sub_sector?: string;
  hq_address?: string;
  founded_at?: string;   // ISO date
  description_ko: string; // one-liner, rendered in Hero with line-clamp-2
  website_url?: string;
  /** Filename relative to public/logos/ (e.g., "toss.png"). PNG only per Phase 2 policy. */
  logo_file?: string;
  /** Always 'manual' in Phase 2 seed. Phase 4a will introduce 'dart' source. */
  source_type: SourceType;
  /** Per-company verification date; controls Hero SourceBadge freshness. */
  last_verified_at: string; // ISO date
  aliases: SeedAlias[];        // ≥3 recommended (brand + legal + english)
  funding_rounds: SeedFundingRound[];
  identifiers: SeedIdentifier[];
};
