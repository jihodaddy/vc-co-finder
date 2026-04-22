import 'server-only';
import postgres from 'postgres';
import type {
  SearchQuery,
  SearchResult,
  SearchHit,
  AutocompleteQuery,
  AutocompleteHit,
  FacetCounts,
  EmployeeBucket,
} from './types';
import { EMPLOYEE_BUCKETS } from './types';

/**
 * Postgres implementation of SearchAdapter (SRCH-02/04/05/07/11/12).
 *
 * Uses a direct `postgres` client (not `@supabase/supabase-js`, not `drizzle`)
 * because:
 *   1. The adapter is called from RSC paths that may be wrapped in
 *      `unstable_cache`. Phase 2 Bug #1 (mirrored as Pitfall #5 in RESEARCH)
 *      proved that any path touching `cookies()` inside unstable_cache throws
 *      at runtime. The direct `postgres` client has no cookie dependency.
 *   2. The CTE-based single-query facet-count pattern (RESEARCH §Pattern 5)
 *      is trivial to express as raw SQL and awkward via PostgREST.
 *   3. `postgres` is already a dependency (for migration runner scripts).
 *
 * NEVER import from the cookie-bound Supabase server client — guarded by a
 * unit test (see tests/unit/search-adapter.test.ts).
 *
 * Security:
 *   - All user-controlled values pass as bound parameters via `sql.unsafe(…, values)`.
 *     The dynamic ORDER BY fragment is keyed from an allowlist map (no runtime
 *     string interpolation of request values).
 *   - `q` is clamped to 100 chars at the adapter boundary (T-03-03-03 mitigation).
 *   - `deleted_at IS NULL` repeated at every CTE — defense-in-depth with RLS
 *     (T-03-03-06 mitigation).
 *   - BigInt amounts serialized as string at the adapter boundary
 *     (T-03-03-09 — Phase 2 carry-forward, formatKRW accepts `bigint | string`).
 */

// Connection singleton — created lazily to keep test import side-effect-free.
let _sql: ReturnType<typeof postgres> | null = null;
function getSql(): ReturnType<typeof postgres> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is required for the search adapter (postgres.ts). ' +
        'Set it in .env.local for dev or as a Vercel env var in production.',
    );
  }
  _sql = postgres(url, {
    prepare: false, // Supabase pooler (transaction mode) compat — RESEARCH Assumption A7
    ssl: 'require',
    max: 3,
    // Return BIGINT as a string so the adapter can forward it verbatim
    // without a BigInt cast (React/JSON can't serialize BigInt values).
    types: {
      bigint: postgres.BigInt,
    },
  });
  return _sql;
}

// Employee bucket → (min, max) range mapping (UI-SPEC §Range facet UX).
const BUCKET_RANGE: Record<EmployeeBucket, { min: number; max: number | null }> = {
  '1_10': { min: 1, max: 10 },
  '11_50': { min: 11, max: 50 },
  '51_200': { min: 51, max: 200 },
  '201_500': { min: 201, max: 500 },
  '501_1000': { min: 501, max: 1000 },
  '1001_plus': { min: 1001, max: null },
};

function resolveEmployees(
  q: SearchQuery['employees'],
): { min: number | null; max: number | null } {
  if (q.kind === 'none') return { min: null, max: null };
  if (q.kind === 'bucket' && q.bucket && (EMPLOYEE_BUCKETS as readonly string[]).includes(q.bucket)) {
    const r = BUCKET_RANGE[q.bucket];
    return { min: r.min, max: r.max };
  }
  if (q.kind === 'range') {
    return { min: q.min ?? null, max: q.max ?? null };
  }
  return { min: null, max: null };
}

/**
 * Validated ORDER BY fragments — keyed by the allowlisted SortKey literal.
 * SQL injection via sort param is structurally impossible: the map's keys
 * are compile-time literals and the map's values are hand-authored strings
 * (no runtime concatenation of user input). See T-03-03-02 mitigation.
 */
const ORDER_BY_SQL: Record<string, string> = {
  recent_funding_desc: 'latest_round_announced_at DESC NULLS LAST',
  recent_funding_asc: 'latest_round_announced_at ASC NULLS LAST',
  name_asc: 'display_name_ko ASC',
  name_desc: 'display_name_ko DESC',
  cumulative_funding_desc: 'cumulative_funding_minor DESC NULLS LAST',
  cumulative_funding_asc: 'cumulative_funding_minor ASC NULLS LAST',
  founded_desc: 'founded_year DESC NULLS LAST',
  founded_asc: 'founded_year ASC NULLS LAST',
};

type RawHit = {
  id: string;
  slug: string;
  display_name_ko: string;
  display_name_en: string | null;
  sector: string | null;
  logo_url: string | null;
  latest_round_stage: string | null;
  latest_round_announced_at: string | null;
  last_verified_at: string;
  cumulative_funding_minor: string | number | null;
  employees_latest: number | null;
  founded_year: number | null;
  hq_region: string | null;
};

function hitFromRow(r: RawHit): SearchHit {
  return {
    id: r.id,
    slug: r.slug,
    displayNameKo: r.display_name_ko,
    displayNameEn: r.display_name_en,
    sector: r.sector,
    logoUrl: r.logo_url,
    latestRoundStage: r.latest_round_stage,
    latestRoundAnnouncedAt: r.latest_round_announced_at,
    lastVerifiedAt: r.last_verified_at,
    // Serialize BIGINT → string (React-safe per Phase 2 pattern).
    cumulativeFundingMinor:
      r.cumulative_funding_minor === null || r.cumulative_funding_minor === undefined
        ? null
        : String(r.cumulative_funding_minor),
    employeesLatest: r.employees_latest,
    foundedYear: r.founded_year,
    hqRegion: r.hq_region,
  };
}

/**
 * The concrete Postgres adapter. Typed structurally so `adapter.ts` can
 * import it without creating a circular dependency (adapter ↔ postgres).
 * adapter.ts applies the `SearchAdapter` interface at re-export time.
 */
export const postgresAdapter: {
  search(query: SearchQuery): Promise<SearchResult>;
  autocomplete(query: AutocompleteQuery): Promise<AutocompleteHit[]>;
} = {
  async search(query: SearchQuery): Promise<SearchResult> {
    const sql = getSql();
    const emp = resolveEmployees(query.employees);
    const orderBy = ORDER_BY_SQL[query.sort] ?? ORDER_BY_SQL.recent_funding_desc;
    const page = Math.max(1, Math.floor(query.page) || 1);
    const perPage = query.perPage;
    const offset = (page - 1) * perPage;

    // Clamp free-text to 100 chars (T-03-03-03).
    const q = query.q.trim().slice(0, 100);
    const hasQ = q.length > 0;

    // All user-controlled values bound as parameters ($1..$N).
    // Empty facet arrays short-circuit via `cardinality($N::text[]) = 0`
    // (T-03-03-05 — array-length explosion mitigated by URL byte cap).
    const queryText = `
      WITH filtered AS (
        SELECT c.id, c.slug, c.display_name_ko, c.display_name_en, c.sector, c.logo_url,
               c.latest_round_stage, c.latest_round_announced_at, c.last_verified_at,
               c.cumulative_funding_minor, c.employees_latest, c.founded_year, c.hq_region
        FROM public.companies c
        WHERE c.deleted_at IS NULL
          AND (NOT $1::boolean OR c.search_doc &@~ $2)
          AND (cardinality($3::text[]) = 0 OR c.sector = ANY($3::text[]))
          AND (cardinality($4::text[]) = 0 OR c.latest_round_stage::text = ANY($4::text[]))
          AND (cardinality($5::text[]) = 0 OR c.hq_region = ANY($5::text[]))
          AND ($6::int IS NULL OR c.employees_latest >= $6::int)
          AND ($7::int IS NULL OR c.employees_latest <= $7::int)
          AND ($8::bigint IS NULL OR c.cumulative_funding_minor >= $8::bigint)
          AND ($9::bigint IS NULL OR c.cumulative_funding_minor <= $9::bigint)
          AND ($10::int IS NULL OR c.founded_year >= $10::int)
          AND ($11::int IS NULL OR c.founded_year <= $11::int)
      ),
      page_rows AS (
        SELECT * FROM filtered
        ORDER BY ${orderBy}
        LIMIT $12::int OFFSET $13::int
      ),
      total_count AS (SELECT count(*)::int AS n FROM filtered),
      sector_counts AS (
        SELECT sector, count(*)::int AS n FROM filtered
        WHERE sector IS NOT NULL GROUP BY sector
      ),
      stage_counts AS (
        SELECT latest_round_stage::text AS stage, count(*)::int AS n FROM filtered
        WHERE latest_round_stage IS NOT NULL GROUP BY latest_round_stage
      ),
      region_counts AS (
        SELECT hq_region AS region, count(*)::int AS n FROM filtered
        WHERE hq_region IS NOT NULL GROUP BY hq_region
      )
      SELECT jsonb_build_object(
        'hits',   COALESCE((SELECT jsonb_agg(row_to_json(page_rows)) FROM page_rows), '[]'::jsonb),
        'total',  (SELECT n FROM total_count),
        'sector', COALESCE((SELECT jsonb_object_agg(sector, n) FROM sector_counts), '{}'::jsonb),
        'stage',  COALESCE((SELECT jsonb_object_agg(stage, n)  FROM stage_counts),  '{}'::jsonb),
        'region', COALESCE((SELECT jsonb_object_agg(region, n) FROM region_counts), '{}'::jsonb)
      ) AS payload
    `;

    const values: Array<unknown> = [
      hasQ,
      hasQ ? q : '',
      query.sectors,
      query.stage,
      query.region,
      emp.min,
      emp.max,
      query.funding.min === null ? null : String(query.funding.min),
      query.funding.max === null ? null : String(query.funding.max),
      query.founded.min,
      query.founded.max,
      perPage,
      offset,
    ];

    type PayloadRow = {
      payload: {
        hits: RawHit[] | null;
        total: number | null;
        sector: Record<string, number> | null;
        stage: Record<string, number> | null;
        region: Record<string, number> | null;
      };
    };

    const rows = (await sql.unsafe(queryText, values as never)) as unknown as PayloadRow[];
    const raw = rows[0]?.payload ?? {
      hits: [],
      total: 0,
      sector: {},
      stage: {},
      region: {},
    };

    const hits: SearchHit[] = (raw.hits ?? []).map(hitFromRow);
    const facets: FacetCounts = {
      sector: raw.sector ?? {},
      stage: raw.stage ?? {},
      region: raw.region ?? {},
    };

    return {
      hits,
      total: raw.total ?? 0,
      page,
      perPage,
      facets,
    };
  },

  async autocomplete(query: AutocompleteQuery): Promise<AutocompleteHit[]> {
    const q = query.q.trim().slice(0, 100);
    if (!q) return [];
    const sql = getSql();
    const limit = Math.min(Math.max(1, query.limit ?? 10), 25);

    // Join aliases to find matches on either canonical name OR alias.
    // DISTINCT ON (c.id) de-duplicates multi-alias hits to one row per company.
    // alias_type ordering (legal → brand → english → former → common) is the
    // default enum order; explicit ORDER BY keeps DISTINCT ON deterministic.
    type RawAcRow = {
      id: string;
      slug: string;
      display_name_ko: string;
      display_name_en: string | null;
      matched_alias: string | null;
      matched_alias_type: AutocompleteHit['matchedAliasType'];
    };

    const rows = (await sql<RawAcRow[]>`
      SELECT DISTINCT ON (c.id)
        c.id,
        c.slug,
        c.display_name_ko,
        c.display_name_en,
        a.alias       AS matched_alias,
        a.alias_type  AS matched_alias_type
      FROM public.companies c
      LEFT JOIN public.aliases a
        ON a.company_id = c.id AND a.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
        AND (
          c.display_name_ko &@~ ${q}
          OR (c.display_name_en IS NOT NULL AND c.display_name_en &@~ ${q})
          OR a.alias &@~ ${q}
        )
      ORDER BY c.id, a.alias_type
      LIMIT ${limit}
    `) as unknown as RawAcRow[];

    return rows.map((r) => {
      // If the query substring appears in the canonical display name, treat
      // this as a display match (no alias attribution). Otherwise attribute
      // the match to the joined alias row. This is a heuristic — the SQL
      // only knows "at least one of the three OR branches matched" — but it
      // reproduces user-visible intent for the SRCH-13 corpus:
      //   토스       → display match on display_name_ko
      //   토스뱅크   → alias match (not in display_name_ko)
      //   비바리퍼블리카 → alias match (legal type)
      //   쿠팡       → display match
      //   Coupang    → display match on display_name_en
      const hitDisplay =
        (r.display_name_ko ?? '').includes(q) ||
        (r.display_name_en ?? '').toLowerCase().includes(q.toLowerCase());
      return {
        companyId: r.id,
        slug: r.slug,
        displayNameKo: r.display_name_ko,
        matchedAlias: hitDisplay ? null : r.matched_alias,
        matchedAliasType: hitDisplay ? null : r.matched_alias_type,
      };
    });
  },
};
