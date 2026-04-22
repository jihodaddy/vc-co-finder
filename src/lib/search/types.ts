/**
 * Phase 3 search types — pure DTO shapes + const arrays. No runtime logic.
 * Safe to import from any context (server or client). Has zero imports from
 * Supabase, Drizzle, or Postgres — keeps the interface boundary clean so
 * Meilisearch swap (v2) replaces only `./postgres.ts`.
 *
 * Sources:
 *   - RESEARCH §Pattern 2 — SearchQuery / SearchHit / SearchResult / FacetCounts shapes
 *   - UI-SPEC §URL state encoding — SORT_KEYS / VIEW_KEYS / PER_PAGE_KEYS literals
 *   - CONTEXT D-07/D-08 — sort option set
 *   - CONTEXT D-05/D-06 — view option set
 *   - CONTEXT D-09 — per_page option set
 */

export const SORT_KEYS = [
  'recent_funding_desc',
  'recent_funding_asc',
  'name_asc',
  'name_desc',
  'cumulative_funding_desc',
  'cumulative_funding_asc',
  'founded_desc',
  'founded_asc',
] as const;

export const VIEW_KEYS = ['table', 'card'] as const;

export const PER_PAGE_KEYS = ['25', '50', '100'] as const;

export const EMPLOYEE_BUCKETS = [
  '1_10',
  '11_50',
  '51_200',
  '201_500',
  '501_1000',
  '1001_plus',
] as const;

export type SortKey = (typeof SORT_KEYS)[number];
export type ViewKey = (typeof VIEW_KEYS)[number];
export type PerPageKey = (typeof PER_PAGE_KEYS)[number];
export type EmployeeBucket = (typeof EMPLOYEE_BUCKETS)[number];

export type SearchQuery = {
  q: string;
  sectors: string[];
  stage: string[];
  region: string[];
  employees: {
    kind: 'none' | 'bucket' | 'range';
    bucket?: EmployeeBucket;
    min?: number;
    max?: number;
  };
  funding: { min: bigint | null; max: bigint | null };
  founded: { min: number | null; max: number | null };
  sort: SortKey;
  page: number; // 1-indexed
  perPage: 25 | 50 | 100;
};

/**
 * Single row in the results grid. BigInt amounts are serialized as strings
 * at the adapter boundary (React/JSON cannot serialize BigInt) — Phase 2
 * carry-forward, consistent with formatKRW accepting `bigint | string`.
 */
export type SearchHit = {
  id: string;
  slug: string;
  displayNameKo: string;
  displayNameEn: string | null;
  sector: string | null;
  logoUrl: string | null;
  latestRoundStage: string | null;
  latestRoundAnnouncedAt: string | null;
  lastVerifiedAt: string;
  cumulativeFundingMinor: string | null; // BigInt-as-string (React-safe)
  employeesLatest: number | null;
  foundedYear: number | null;
  hqRegion: string | null;
};

export type FacetCounts = {
  sector: Record<string, number>;
  stage: Record<string, number>;
  region: Record<string, number>;
};

export type SearchResult = {
  hits: SearchHit[];
  total: number;
  page: number;
  perPage: number;
  facets: FacetCounts;
};

export type AutocompleteQuery = {
  q: string;
  limit?: number;
};

export type AutocompleteHit = {
  companyId: string;
  slug: string;
  displayNameKo: string;
  matchedAlias: string | null;
  matchedAliasType:
    | 'legal'
    | 'brand'
    | 'english'
    | 'former'
    | 'common'
    | null;
};
