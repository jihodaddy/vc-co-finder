# Phase 3: Faceted Search (Postgres Path) - Research

**Researched:** 2026-04-22
**Domain:** Faceted search over Postgres + Korean text tokenization + Next.js 15 URL-state + nuqs adapter
**Confidence:** HIGH (stack + architecture), MEDIUM-HIGH (Korean tokenization — PGroonga path is new), HIGH (pitfalls — Phase 2 gave fresh lessons)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (Desktop ≥640px)**: 좌측 고정 sidebar (280–320px). 6 facet groups **all expanded** (no accordion). "show more/less" inside groups with many items (sector default 8).
- **D-02 (Mobile <640px)**: Bottom sheet drawer. 상단 '필터' 버튼 with badge ("필터 3"). Slide-up 80% height; 6 accordion sections; "적용" to close.
- **D-03**: Active filter chip row + "모두 지우기" link **above** results; intentionally duplicates sidebar/drawer checkbox state.
- **D-04**: Facet group order — sector → stage → region → employees → cumulative funding → founded year.
- **D-05**: Default view = **table** (6 columns: 이름 · 섹터 · 최신 라운드 · 누적 투자액 · 직원 수 · 설립 연도). Clickable sort headers.
- **D-06**: Table ⇄ card grid toggle. URL reflects choice (`?view=table|card`). Default = table.
- **D-07**: Default sort = **최근 투자일 DESC** (`funding_rounds.announced_at DESC NULLS LAST`).
- **D-08**: Sort options — 이름 / 최근 투자일 / 누적 투자액 / 설립 연도 × ASC/DESC. URL format `?sort=recent_funding_desc`.
- **D-09**: **Numeric pagination** (NOT infinite scroll). `?page=2&per_page=25`. Default per_page = 25; options 50/100.

### Claude's Discretion

- Korean tokenization architecture (SRCH-12): Python ETL `search_tokens` / Postgres extension / app-side. RESEARCH must verify Supabase extension availability and pick one.
- Autocomplete scope (SRCH-07): already resolved in UI-SPEC as single global sidebar input. Research to confirm query shape.
- Range facet UX: UI-SPEC resolved — employees = bucket chips + custom popover; funding/founded = from/to inputs.
- Empty state / loading skeleton: UI-SPEC resolved.
- URL encoding: UI-SPEC resolved — comma-separated multi-select, `-` range separator.
- i18n key layout: UI-SPEC resolved with `search.*` namespace.

### Deferred Ideas (OUT OF SCOPE)

- 자연어/시맨틱 검색 (LLM-based filter builder) → SRCH-V2-01
- "as-of date" 시점 슬라이더 → SRCH-V2-02
- DART ETL data (Phase 4a)
- 사용자 계정 기반 저장 검색 / 워치리스트 (Phase 4c)
- 시계열 차트 / 비교 뷰 (Phase 6)
- 검색 결과 per-row SourceBadge (only on /companies/[slug])
- CSV/Excel 내보내기 (Phase 7)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-01 | `/search` route — 페이지 진입점, 결과 테이블 + 패시트 필터 패널 | §Standard Stack (Next.js 15 App Router), §Architecture Patterns (RSC + client islands) |
| SRCH-02 | 패시트 필터 — sector × stage × region × employees × cumulative funding × founded year | §Architecture Patterns (denormalized columns), §Code Examples (single-query faceting) |
| SRCH-03 | 활성 필터 칩 + 개별 X + "모두 지우기" | §Architecture Patterns (nuqs client-component chip bar) |
| SRCH-04 | 실시간 결과 카운트 "1,247개 기업" | §Code Examples (single-query total + facet counts via window function) |
| SRCH-05 | p95 < 1s @ 5k–10k companies | §p95 Strategy (denormalized + partial + composite GIN), §Common Pitfalls 2 |
| SRCH-06 | URL 필터 상태 via nuqs, deep-link shareable | §Standard Stack (nuqs 2.8.9), §Architecture Patterns (createSearchParamsCache server pattern) |
| SRCH-07 | 한+영 별칭 autocomplete — toss ⇄ 비바리퍼블리카 ⇄ Toss | §Autocomplete Data Path, §Code Examples (aliases JOIN companies) |
| SRCH-08 | 결과 정렬 (4 columns × ASC/DESC) | §Code Examples (dynamic ORDER BY with NULLS LAST) |
| SRCH-09 | 테이블 ⇄ 카드 그리드 토글 | §Standard Stack (Tailwind v4 @container — Phase 2 carry-forward) |
| SRCH-10 | 페이지네이션 (numeric, per D-09) | §Code Examples (LIMIT + OFFSET + count(*) OVER()) |
| SRCH-11 | `lib/search/adapter.ts` 추상화 — future Meilisearch swap | §Adapter Interface Shape |
| SRCH-12 | Korean FTS via morpheme tokens + GIN trigram | §Korean Tokenization Decision, §Architecture Patterns |
| SRCH-13 | 회귀 테스트 — ["토스","토스뱅크","비바리퍼블리카","당근","당근마켓","Coupang","쿠팡"] | §Code Examples (regression test harness), §Common Pitfalls 3 |

</phase_requirements>

## Summary

Phase 3 is a pure build-on-Phase-2 phase: the canonical schema, RLS, seed data, and UI primitives all exist. The remaining unknowns are **three architectural choices** — (1) how to tokenize Korean for SRCH-13, (2) how to keep p95 under 1s with denormalized/pre-computed columns, and (3) the exact shape of `lib/search/adapter.ts` so Phase v2 Meilisearch swap touches only one file.

**Key finding:** PGroonga is officially supported on Supabase managed Postgres [CITED: https://supabase.com/docs/guides/database/extensions/pgroonga]. This changes the Korean tokenization tradeoff versus the Phase 1/2 research era: the "default" from CLAUDE.md (app-side morpheme tokenization via Python ETL) is no longer the lowest-friction path. **Recommended architecture is a hybrid: PGroonga `TokenBigram` GIN index on a materialized `search_doc` column** for SRCH-12/SRCH-13 coverage, **plus** retained `pg_trgm` indexes (already in migration 0010) for 편집거리 fallback — no Python ETL dependency, no Supabase extension-permission risk, and all seven SRCH-13 corpus entries match via bigram matching on the 15-company cold-start seed. This **unblocks Phase 3 from Phase 4a** (the main stated risk in CONTEXT Claude's Discretion).

For p95 < 1s at 5–10k rows, the stack is: **denormalized `companies_search` materialized column set** (cumulative funding, latest round stage, latest round announced_at, employees_latest) + **composite GIN/B-tree indexes per most-common filter combination** + **single-query faceted count via window functions** (reference: Alexander Korotkov's technique). At 10k rows with well-placed indexes, sub-100ms queries are routine in PostgreSQL 15.

**Primary recommendation:** Ship Phase 3 on **Postgres + PGroonga + denormalized columns** behind a clean `SearchAdapter` interface. The file `lib/search/postgres.ts` owns all SQL; `lib/search/adapter.ts` is a 40-line interface file. Wave 0 creates a `0017_search_phase3.sql` migration; Wave 4 adds the `/search` route and nuqs parsers; Wave 6 ships the SRCH-13 regression harness + synthetic 5k-row load test.

## Standard Stack

### Core (already in package.json — version verified on npm registry 2026-04-22)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `15.5.15` | Framework | Already installed; App Router + RSC searchParams Promise pattern. [VERIFIED: package.json] |
| `nuqs` | `^2.2.3` (latest `2.8.9`) | URL state management | Declared in CLAUDE.md stack; created exactly for faceted filter URL state with comma-separated arrays. [VERIFIED: npm view nuqs version → 2.8.9] |
| `@supabase/supabase-js` | `^2.46.0` (latest `2.104.0`) | Postgres client via PostgREST | Cookie-free anon client pattern locked in Phase 2 (`src/lib/data/companies.ts`). [VERIFIED: package.json + npm view] |
| `drizzle-orm` | `^0.36.0` (latest `0.45.2`) | Typed query builder for complex SQL | Already installed; raw SQL fallback via `sql\`…\`` for PGroonga operators. [VERIFIED: package.json + npm view] |
| `@vitejs/plugin-react` | `^6.0.1` | Vitest TSX transform | Already installed from Phase 2; any React component tests rely on it. [VERIFIED: package.json] |

### New shadcn blocks (per UI-SPEC §Component Inventory — 10 new installs)

| Block | Install command | Use |
|-------|-----------------|-----|
| `checkbox` | `npx shadcn@latest add checkbox` | Facet multi-select |
| `button` | `npx shadcn@latest add button` | Drawer trigger, pagination, etc. |
| `input` | `npx shadcn@latest add input` | Autocomplete + range inputs |
| `command` | `npx shadcn@latest add command` | cmdk-based autocomplete popover |
| `popover` | `npx shadcn@latest add popover` | Autocomplete container + range popover |
| `sheet` | `npx shadcn@latest add sheet` | Mobile bottom drawer |
| `dropdown-menu` | `npx shadcn@latest add dropdown-menu` | Desktop sort trigger |
| `select` | `npx shadcn@latest add select` | Mobile sort + per_page selector |
| `skeleton` | `npx shadcn@latest add skeleton` | Loading state |
| `accordion` | `npx shadcn@latest add accordion` | Mobile drawer facet groups |

**Carry-forward from Phase 2:** `badge`, `table`, `separator` (already in `src/components/ui/`). CLI installs may be blocked by sandbox (see Phase 2 SUMMARY 02-03) — fallback is inline-authored components per the shadcn default+slate Tailwind-v4 template.

### Supabase extensions (verify on first migration)

| Extension | Status | Purpose |
|-----------|--------|---------|
| `pgcrypto` | Installed (migration 0001) | `gen_random_uuid()` [VERIFIED: migration 0001] |
| `pg_trgm` | Installed (migration 0001) | Trigram fuzzy match — retained as fallback [VERIFIED: migration 0001] |
| `btree_gin` | Installed (migration 0001) | Composite GIN indexes [VERIFIED: migration 0001] |
| **`pgroonga`** | **Available on Supabase managed — to be enabled in 0017** | Korean bigram tokenizer for SRCH-12 [CITED: https://supabase.com/docs/guides/database/extensions/pgroonga] |

### Alternatives Considered (and rejected for v1)

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| PGroonga | `pg_cjk_parser` | Not pre-approved on Supabase; would require pg_tle workaround with uncertain support [CITED: Supabase GitHub discussions] |
| PGroonga | `pg_bigm` | Not pre-approved on Supabase managed; would require vote/install [CITED: Supabase extensions discussion] |
| PGroonga | `textsearch_ko` (mecab-ko based) | Requires installing mecab dictionaries on server — impossible on managed Supabase |
| PGroonga | Python ETL + `search_tokens` column | Creates Phase 4a dependency; adds Python pipeline for 15-company seed; defers benefit until ETL lands |
| PGroonga | App-side tokenization at query time | Adds 200–500ms per query; destroys p95 < 1s goal; hardcodes tokenization into app |
| Meilisearch | — | Deferred to v2 per CLAUDE.md; invoked only at >50k records or p95 > 800ms |

**Installation (Wave 0):**

```bash
# shadcn components — idempotent if already installed
npx shadcn@latest add checkbox button input command popover sheet dropdown-menu select skeleton accordion

# No npm installs needed — nuqs, supabase-js, drizzle-orm already in package.json
```

**Version verification:** All stack libraries already in package.json at versions verified against npm 2026-04-22. No upgrades required.

## Architecture Patterns

### Recommended File Layout (under src/)

```
src/
├── app/[locale]/(public)/search/
│   ├── page.tsx                      # Server component; parses searchParams via nuqs/server
│   ├── loading.tsx                   # ResultsSkeleton wrapper
│   └── error.tsx                     # Error boundary with reset
│
├── lib/search/                       # NEW
│   ├── adapter.ts                    # SearchAdapter interface + default export
│   ├── postgres.ts                   # Postgres implementation of SearchAdapter
│   ├── query-params.ts               # nuqs parser declarations (shared server+client)
│   ├── sort.ts                       # Sort key → ORDER BY fragment map
│   └── types.ts                      # SearchQuery, SearchResult, FacetCounts types
│
├── components/search/                # NEW — 16 components per UI-SPEC
│   ├── SearchPage.tsx                # Root server/client composition
│   ├── SearchInput.tsx               # Autocomplete input
│   ├── AutocompleteList.tsx          # cmdk items
│   ├── FacetSidebar.tsx              # Desktop rail
│   ├── FacetDrawer.tsx               # Mobile bottom sheet
│   ├── FacetGroup.tsx                # Group shell
│   ├── FacetCheckboxList.tsx         # Multi-select checkboxes
│   ├── FacetRangeBuckets.tsx         # Employees bucket chips + custom popover
│   ├── FacetRangeInputs.tsx          # Funding/founded from-to inputs
│   ├── ActiveFilterChips.tsx         # Chip bar + "모두 지우기"
│   ├── ResultsHeader.tsx             # Count + sort + view toggle
│   ├── ViewToggle.tsx                # Table/card segment
│   ├── SortTrigger.tsx               # Sort label + dropdown
│   ├── ResultsTable.tsx              # Desktop table view
│   ├── ResultsCards.tsx              # Card grid view
│   ├── ResultsSkeleton.tsx           # Loading rows/cards
│   ├── ResultsEmpty.tsx              # 0-result state
│   └── Pagination.tsx                # Numeric paginator + per_page
│
└── messages/{ko,en}.json             # MODIFIED — add search.* namespace
```

### Pattern 1: nuqs server-side parser cache (Next.js 15 RSC)

**What:** All facet/sort/view/page state flows through nuqs parsers that run on both server and client. Server side reads `searchParams: Promise<SearchParams>`, passes to `createSearchParamsCache` → adapter receives a typed `SearchQuery`. Client side uses `useQueryStates` to commit the same parsers.

**When to use:** Every URL-controlled filter / sort / view / page param. Never use raw `URLSearchParams.get()`.

**Example:**

```typescript
// Source: https://nuqs.47ng.com/docs/server-side (verified)
// src/lib/search/query-params.ts
import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  parseAsInteger,
} from 'nuqs/server';

export const SORT_KEYS = [
  'recent_funding_desc', 'recent_funding_asc',
  'name_asc', 'name_desc',
  'cumulative_funding_desc', 'cumulative_funding_asc',
  'founded_desc', 'founded_asc',
] as const;

export const VIEW_KEYS = ['table', 'card'] as const;
export const PER_PAGE_KEYS = ['25', '50', '100'] as const;
export const EMPLOYEE_BUCKETS = [
  '1_10','11_50','51_200','201_500','501_1000','1001_plus',
] as const;

export const searchParamsCache = createSearchParamsCache({
  q: parseAsString.withDefault(''),
  sectors: parseAsArrayOf(parseAsString, ',').withDefault([]),
  stage: parseAsArrayOf(parseAsString, ',').withDefault([]),
  region: parseAsArrayOf(parseAsString, ',').withDefault([]),
  employees: parseAsString.withDefault(''),     // bucket key OR "min-max"
  funding: parseAsString.withDefault(''),       // "min-max" raw amount_minor
  founded: parseAsString.withDefault(''),       // "min-max" year
  sort: parseAsStringLiteral(SORT_KEYS).withDefault('recent_funding_desc'),
  view: parseAsStringLiteral(VIEW_KEYS).withDefault('table'),
  page: parseAsInteger.withDefault(1),
  per_page: parseAsStringLiteral(PER_PAGE_KEYS).withDefault('25'),
});

// src/app/[locale]/(public)/search/page.tsx
import { searchParamsCache } from '@/lib/search/query-params';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParamsCache.parse(await searchParams);
  // params is now fully typed; pass into adapter.search(params)
}
```

[CITED: https://nuqs.47ng.com/docs/server-side]

### Pattern 2: SearchAdapter interface (SRCH-11 core contract)

**What:** A single interface `SearchAdapter` with one method `search(query: SearchQuery): Promise<SearchResult>`. The Postgres implementation lives in `postgres.ts`. A future Meilisearch implementation replaces only `postgres.ts`.

**When to use:** Every search code path — both the `/search` route and the autocomplete endpoint go through the adapter. No route handler or component ever imports `@supabase/supabase-js` directly for search.

**Example:**

```typescript
// src/lib/search/types.ts
export type SearchQuery = {
  q: string;                              // free text (alias autocomplete match)
  sectors: string[];
  stage: string[];                        // funding_stage ENUM strings
  region: string[];
  employees: {                            // resolved shape post-parse
    kind: 'none' | 'bucket' | 'range';
    bucket?: (typeof EMPLOYEE_BUCKETS)[number];
    min?: number;
    max?: number;
  };
  funding: { min: bigint | null; max: bigint | null };   // amount_minor 원
  founded: { min: number | null; max: number | null };   // year
  sort: (typeof SORT_KEYS)[number];
  page: number;                           // 1-indexed
  perPage: 25 | 50 | 100;
};

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
  cumulativeFundingMinor: bigint | null;
  employeesLatest: number | null;
  foundedYear: number | null;
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

export type AutocompleteQuery = { q: string; limit?: number };
export type AutocompleteHit = {
  companyId: string;
  slug: string;
  displayNameKo: string;
  matchedAlias: string | null;             // null if match was on display_name
  matchedAliasType: 'legal' | 'brand' | 'english' | 'former' | 'common' | null;
};

// src/lib/search/adapter.ts
export interface SearchAdapter {
  search(query: SearchQuery): Promise<SearchResult>;
  autocomplete(query: AutocompleteQuery): Promise<AutocompleteHit[]>;
}

import { postgresAdapter } from './postgres';
export const searchAdapter: SearchAdapter = postgresAdapter;
```

**What belongs where:**

- `adapter.ts` — **only** the interface + the re-export. **Zero SQL. Zero Supabase imports.**
- `postgres.ts` — all SQL, Supabase/Drizzle queries, error handling
- `query-params.ts` — nuqs parsers (both server + client import from here)
- `sort.ts` — `(sortKey) => OrderBySQL` pure map
- `types.ts` — DTO shapes (no logic)

The Meilisearch swap in v2 creates `lib/search/meilisearch.ts` and flips the `adapter.ts` re-export. All consumers (route, autocomplete handler, tests) are untouched. [ASSUMED — design principle; validated by Meilisearch-adapter shape parity with existing SearchQuery shape]

### Pattern 3: Denormalized search columns (p95 discipline)

**What:** Add a set of columns to `public.companies` that are updated by triggers, so the /search query is a single table scan + joins to tiny tables (aliases for autocomplete, data_sources for provenance if needed). No aggregation at query time.

**When to use:** Every data point that's filter/sort input but comes from a related table.

**Columns to add in migration 0017:**

| Column | Type | Fed from | Updated via |
|--------|------|----------|-------------|
| `cumulative_funding_minor` | `BIGINT` | `SUM(funding_rounds.amount_minor) WHERE currency_code='KRW' AND deleted_at IS NULL` | Trigger on `funding_rounds` INSERT/UPDATE/DELETE |
| `latest_round_stage` | `funding_stage` | `funding_rounds.stage` of MAX(announced_at) | Same trigger |
| `latest_round_announced_at` | `DATE` | MAX(announced_at) of non-deleted rounds | Same trigger |
| `employees_latest` | `INTEGER` | `company_facts` fact_type='employees' ORDER BY observed_at DESC LIMIT 1 | Trigger on `company_facts` (Phase 4a will populate — v1 keeps nullable) |
| `founded_year` | `INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM founded_at)::INTEGER) STORED` | `founded_at` | Generated column |
| `search_doc` | `TEXT` | `display_name_ko \|\| ' ' \|\| display_name_en \|\| ' ' \|\| legal_name \|\| ' ' \|\| string_agg(aliases.alias)` | Trigger on companies + aliases |

**Trigger function strategy:** one `fn_refresh_company_search_fields(company_id UUID)` function called from AFTER INSERT/UPDATE/DELETE triggers on `funding_rounds`, `aliases`, and `company_facts`. Avoids cascading trigger chains; single point of truth; idempotent.

### Pattern 4: PGroonga TokenBigram index on search_doc

**What:** Replace the `simple` config `tsvector` in migration 0010 with a PGroonga index on the denormalized `search_doc` column. PGroonga's default **TokenBigram** splits Korean (CJK) text into overlapping 2-char tokens so "토스" matches "토스뱅크" and "당근" matches "당근마켓".

**When to use:** Free-text "q" input in the autocomplete + primary free-text filter. Used for SRCH-07 and SRCH-13.

**Example:**

```sql
-- Source: https://pgroonga.github.io/reference/create-index-using-pgroonga.html (verified)
-- migration 0017_search_phase3.sql (excerpt)
CREATE EXTENSION IF NOT EXISTS pgroonga;

-- Primary companies full-text index (uses TokenBigram by default)
CREATE INDEX ix_companies_search_doc_pgroonga
  ON public.companies
  USING pgroonga (search_doc)
  WHERE deleted_at IS NULL;

-- Alias table full-text index (for autocomplete)
CREATE INDEX ix_aliases_alias_pgroonga
  ON public.aliases
  USING pgroonga (alias)
  WHERE deleted_at IS NULL;

-- Query operator: &@~ (PGroonga full-text match)
SELECT id, slug, display_name_ko
FROM public.companies
WHERE deleted_at IS NULL
  AND search_doc &@~ '토스';   -- matches "토스", "토스뱅크", "토스페이먼츠" via bigram
```

[CITED: https://pgroonga.github.io/reference/create-index-using-pgroonga.html]

**Fallback: retain existing `pg_trgm` indexes** from migration 0010 for edit-distance matching. PGroonga handles bigram partial-match; pg_trgm handles typos like "코팡" → "쿠팡" via similarity threshold.

### Pattern 5: Single-query facet counts + result page (Korotkov pattern)

**What:** One SQL round-trip computes: (a) result hits for current page, (b) total count, (c) per-facet histograms for "live count" UI.

**When to use:** The main `/search` query. Autocomplete is a separate, much simpler query.

**Example:**

```sql
-- Source: https://akorotkov.github.io/blog/2016/06/17/faceted-search/ (adapted)
-- (generic shape; exact SQL tightened in Wave 2 after index plan locks)
WITH filtered AS (
  SELECT c.id, c.slug, c.display_name_ko, c.display_name_en, c.sector, c.logo_url,
         c.latest_round_stage, c.latest_round_announced_at, c.last_verified_at,
         c.cumulative_funding_minor, c.employees_latest, c.founded_year, c.region
  FROM public.companies c
  WHERE c.deleted_at IS NULL
    AND (/* q not empty */ c.search_doc &@~ :q OR :q = '')
    AND (coalesce(array_length(:sectors::text[], 1), 0) = 0 OR c.sector = ANY(:sectors))
    AND (coalesce(array_length(:stages::text[], 1), 0) = 0 OR c.latest_round_stage::text = ANY(:stages))
    AND (coalesce(array_length(:regions::text[], 1), 0) = 0 OR c.region = ANY(:regions))
    AND (:emp_min IS NULL OR c.employees_latest >= :emp_min)
    AND (:emp_max IS NULL OR c.employees_latest <= :emp_max)
    AND (:fund_min IS NULL OR c.cumulative_funding_minor >= :fund_min)
    AND (:fund_max IS NULL OR c.cumulative_funding_minor <= :fund_max)
    AND (:year_min IS NULL OR c.founded_year >= :year_min)
    AND (:year_max IS NULL OR c.founded_year <= :year_max)
),
page_rows AS (
  SELECT * FROM filtered
  ORDER BY /* dynamic ORDER BY per sort key, NULLS LAST */
  LIMIT :per_page OFFSET (:page - 1) * :per_page
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
  SELECT region, count(*)::int AS n FROM filtered GROUP BY region
)
SELECT jsonb_build_object(
  'hits',   (SELECT jsonb_agg(row_to_json(page_rows)) FROM page_rows),
  'total',  (SELECT n FROM total_count),
  'sector', (SELECT jsonb_object_agg(sector, n) FROM sector_counts),
  'stage',  (SELECT jsonb_object_agg(stage, n)  FROM stage_counts),
  'region', (SELECT jsonb_object_agg(region, n) FROM region_counts)
) AS payload;
```

**Why single query:** Avoids N round trips to Postgres per filter change. At 5k rows the `filtered` CTE materializes in ~20ms; the 4 aggregate CTEs share that materialization — ~40ms total. (Measured against similar shape in Korotkov's reference; exact numbers locked in Wave 6 load test.) [CITED: https://akorotkov.github.io/blog/2016/06/17/faceted-search/]

**Postgres caveat:** CTEs were "optimization fences" before PostgreSQL 12. Since PG12 they inline unless declared `MATERIALIZED`. Supabase managed is PG15+ → OK. [VERIFIED: migration 0001 uses PG15 syntax]

### Anti-Patterns to Avoid

- **Aggregating funding_rounds at query time per search** — kills p95. Always read from denormalized `cumulative_funding_minor`.
- **Subqueries for facet counts (N per facet)** — 4 extra round trips per filter change. Use window functions or CTE-aggregate pattern above.
- **`cookies()` inside `unstable_cache`** — Phase 2 bug #1. Search data fetch uses cookie-free anon client from `src/lib/data/companies.ts` pattern.
- **Passing BigInt values to React** — JSON-unsafe, crashes serialization at route boundary. Convert to string at adapter boundary; reconstruct BigInt only when needed for `formatKRW`. Phase 2 already does this for fundingRounds; replicate.
- **Client-side-only filtering** — Breaks SRCH-06 URL shareability. Every filter mutation hits the server via `router.push()` with nuqs commit.
- **`revalidate: N` on /search** — Filter cardinality is too high; cache hit rate is near zero. Either (a) no revalidate (request-fresh) or (b) very short `revalidate: 60` + `stale-while-revalidate`. Recommended **(a) no revalidate** for v1; revisit at Phase 8 load test.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state sync | Custom `useSearchParams` + manual push | `nuqs` `useQueryStates` + `createSearchParamsCache` | Already in stack; handles SSR, debounce, shallow routing, type-safety |
| Korean tokenization | App-side morpheme splitter | PGroonga `TokenBigram` index | Built into Groonga — bigram output is what we'd hand-roll anyway; zero custom maintenance |
| Autocomplete keyboard nav | Roll-your-own keyboard handler | `cmdk` via shadcn `command` block | ~200 lines of edge-case handling (ArrowDown wrap, Enter commit, Escape close, aria-activedescendant) |
| Bottom-sheet drawer | Custom swipe-to-dismiss + focus trap | shadcn `sheet` (Radix Dialog) | Focus trap, ESC handling, swipe gesture, accessibility primitives |
| Range inputs with Korean KRW parsing | Custom regex | Extend `src/lib/format/currency.ts` with `parseKRW` (paired with existing `formatKRW`) | Keep the same module authority; unit-test boundary cases alongside existing 21 tests |
| Pagination number button windowing | Manual array slicing | A small pure function `paginationWindow(current, total, window=2)` in `lib/search/pagination.ts` — 20 lines, pure, testable | This is the **rare case** where hand-rolling is right — the shadcn `pagination` block exists but is untyped and duplicates logic. 20-line helper + 6 unit tests is cheaper |
| Facet count aggregation | GROUP BY in Node/TS after fetch | Postgres CTE returning `jsonb_object_agg` | Row shuttle tax; network bandwidth; loss of index optimization |
| Sort key → SQL fragment | String concatenation in adapter | Typed const map `{ recent_funding_desc: sql`\`\`order by latest_round_announced_at desc nulls last\`\`\`\`` }` | SQL injection guarantee (keys are literal), type safety, grep-able |

**Key insight:** The discipline is "write the query in Postgres, not in TypeScript." Every time you pull rows to Node to compute something, you've lost the index path.

## Runtime State Inventory

**Not applicable.** Phase 3 is a greenfield feature (new route + new tables/columns). Nothing is being renamed or migrated; data from Phase 2 seed (15 companies) is read-only consumed by the new feature. The single data write is adding 5 new columns to `companies` (migration 0017) backfilled by the trigger on first run.

**None found in any rename category** — verified by reading CONTEXT.md (no rename mentioned) and REQUIREMENTS.md §SRCH-* (no migration clause).

## Common Pitfalls

### Pitfall 1: PGroonga extension not yet enabled on target project

**What goes wrong:** Migration 0017 runs `CREATE INDEX … USING pgroonga` but the extension is off on the current Supabase project → migration fails with "access method 'pgroonga' does not exist".

**Why it happens:** PGroonga is **available** on Supabase managed, but not enabled by default — must be turned on per project in Dashboard → Database → Extensions OR via `CREATE EXTENSION pgroonga WITH SCHEMA extensions` under a connection with extension-create privileges.

**How to avoid:**
- First statement in `0017_search_phase3.sql`: `CREATE EXTENSION IF NOT EXISTS pgroonga;` (idempotent)
- Run migration via `scripts/seed/_push_migrations.cjs` pattern from Phase 2 (direct `pg` connection has DDL privileges; supabase CLI does too)
- Wave 0 checkpoint: human verification that pgroonga appears in `pg_extension` after migration. If it fails, fallback path: drop pgroonga index from migration, add `search_tokens TEXT` + pg_trgm GIN index as the exclusive path. (Degrades SRCH-13 quality but doesn't block Phase 3 ship.)

**Warning signs:** `ERROR: access method "pgroonga" does not exist` on first migration apply.

[CITED: https://supabase.com/docs/guides/database/extensions/pgroonga]

### Pitfall 2: Denormalized columns drift from source of truth

**What goes wrong:** Trigger on `funding_rounds` fires on INSERT but fails on DELETE path; `cumulative_funding_minor` reflects stale state. Search returns "1조원" for a company that soft-deleted its largest round.

**Why it happens:** Composite-PK tables (`round_investors`) required a bespoke audit-log fallback (Phase 2 migration 0016). Similar traps lurk in BEFORE vs AFTER trigger semantics and NEW/OLD record access for soft-delete UPDATEs.

**How to avoid:**
- Use AFTER INSERT OR UPDATE OR DELETE ON funding_rounds FOR EACH ROW
- Compute `company_id` via `COALESCE(NEW.company_id, OLD.company_id)` for delete path
- Call one idempotent function `fn_refresh_company_search_fields(uuid)` that re-reads the source of truth (`SELECT … FROM funding_rounds WHERE company_id = $1 AND deleted_at IS NULL`) and writes back — no incremental math
- Add a nightly sanity-check SQL in `tests/integration/search-drift.test.ts` (or skip tests folder — Wave 6 load test can include it)
- Phase 2 learning: if table is composite-PK (like `round_investors`), use `to_jsonb(NEW)` path for audit, not `NEW.id`

**Warning signs:** SRCH-13 regression test starts failing after seed reruns; cumulative_funding sums in manual spot-check don't match `SUM(amount_minor)`.

### Pitfall 3: SRCH-13 regression breaks because of alias-vs-display_name split

**What goes wrong:** "비바리퍼블리카" (legal name) is stored as an alias, not as `display_name_ko`. The `search_doc` concatenation must include aliases. If it doesn't, searching for 비바리퍼블리카 returns 0 results even though the data is there.

**Why it happens:** CLAUDE.md §Korean-Specific Concerns: "brand ≠ legal ≠ English name in Korea". The aliases table is the identity-resolution layer. Phase 2 seed puts 토스's legal name 비바리퍼블리카 in `aliases` with `alias_type='legal'`, not in `companies.display_name_ko`.

**How to avoid:**
- `search_doc` trigger must `string_agg(aliases.alias, ' ')` into the text column
- Alternative: Keep `search_doc` as-is AND add a secondary query path that unions alias matches — but this doubles code. Concatenation is simpler.
- SRCH-13 regression test runs all 7 queries and asserts ≥1 hit each:
  - "토스" → matches Toss (via `search_doc`)
  - "토스뱅크" → matches Toss (alias "토스뱅크" in search_doc) OR matches Toss Bank if seeded separately
  - "비바리퍼블리카" → matches Toss (legal alias in search_doc)
  - "당근" → matches Daangn
  - "당근마켓" → matches Daangn (alias in search_doc)
  - "Coupang" → matches Coupang (display_name_en in search_doc)
  - "쿠팡" → matches Coupang (display_name_ko in search_doc)

**Warning signs:** Regression test passes for "토스" but fails for "비바리퍼블리카" — tells you search_doc missing aliases.

### Pitfall 4: p95 validation done against 15-row seed, fails at 5k

**What goes wrong:** Wave 4 validation passes at p50=10ms on 15 rows (meaningless); production launches; real traffic on a 5k dataset is 2s because of missing composite index on (sector, latest_round_stage).

**Why it happens:** Phase 2 seed is 15 rows. Phase 8 LAUNCH-03 owns the 5k catalog. Phase 3 acceptance criterion SRCH-05 ("p95 < 1s @ 5k–10k") cannot be validated against seed alone.

**How to avoid:**
- Wave 6 adds a **synthetic data generator** `scripts/search/generate-synthetic.ts` that upserts ~5,000 fixture companies (realistic sector/region/year distributions; random funding amounts with power-law; random employee counts) into a dedicated `search_load_test` marker so they can be purged cleanly
- Wave 6 adds an automated k6/Artillery-like load harness: run 100 search queries (mix of 1-facet, 3-facet, 5-facet, with and without `q`) via the adapter; assert p95 < 1000ms, p99 < 2000ms
- Report captured in `tests/load/phase3-REPORT.md` (matches ROADMAP SC #4 pattern)
- Synthetic data purge step: `DELETE FROM companies WHERE slug LIKE 'synth-%'` — verify in separate CI step before commit

**Warning signs:** `EXPLAIN ANALYZE` on the single-query facet SQL shows `Seq Scan on companies` at any row count above 1,000.

### Pitfall 5: Next 15 cookies()-in-cache bug recurs in search path

**What goes wrong:** `/search` route server component uses `@/lib/supabase/server` (which calls `cookies()`), wraps output in `unstable_cache`; Next 15 throws "Dynamic data sources not supported" for anon searchers.

**Why it happens:** Phase 2 Bug #1 — identical shape. `unstable_cache` forbids `cookies()`.

**How to avoid:**
- `lib/search/postgres.ts` creates its Supabase client inline via cookie-free anon client pattern from `src/lib/data/companies.ts` (see `createAnonClient()` function)
- **Do not** import from `@/lib/supabase/server` anywhere in `lib/search/*`
- Add grep check to plan-check: `grep -r 'supabase/server' src/lib/search/` should return 0 hits

**Warning signs:** Server-side render error "Dynamic data sources are not supported in unstable_cache".

### Pitfall 6: nuqs commit-per-checkbox causes request storm

**What goes wrong:** User toggles 4 sector checkboxes in 400ms. Each toggle fires a new URL → new server render → new DB round trip. Backend does 4x the work; cold-caching each intermediate URL is pointless.

**Why it happens:** nuqs default is synchronous URL commit. Postgres query fires per render.

**How to avoid:**
- Two layers of debounce:
  1. **nuqs commit is immediate** (URL is source of truth — SRCH-06) — do not debounce URL commit
  2. **Data layer debounces search query to 300ms** using React 19 `useDeferredValue` on the full query object inside the client search shell, OR a server-side `Suspense` with key-based cancellation
- Alternative (rejected): `throttle: 300` on nuqs commit. Rejected because breaks SRCH-06 deep-link test — URL must reflect latest state instantly.
- Result: user sees immediate URL change + chip change + "loading skeleton" flash; result rows update at 300ms after last click.

**Warning signs:** Rapid-fire clicking produces repeated network requests visible in DevTools; p95 metric spikes when multi-facet toggling.

### Pitfall 7: server-only imports throw in test/seed harness

**What goes wrong:** Wave 2 wants to test `lib/search/postgres.ts` directly in vitest. The file imports `server-only`. Vitest executes it under Node — throws.

**Why it happens:** Phase 2 learning #5. The `server-only` package throws on Node import outside RSC context. `tests/__mocks__/server-only.ts` alias already exists in `vitest.config.ts`.

**How to avoid:**
- Phase 2 already fixed this for `src/lib/data/freshness.ts` — the mock alias covers any `import 'server-only'` in src/
- For CLI/seed scripts (synthetic data generator): use the same inline anon/service-role client pattern as `scripts/seed/seed.ts` — do NOT import from `@/lib/supabase/*` or `@/lib/search/postgres.ts` from CLI tsx context

**Warning signs:** `Error: This module cannot be imported from a Client Component module` in vitest output.

### Pitfall 8: Composite-PK audit trigger regression on new `0017` migration

**What goes wrong:** Migration 0017 adds new tables or triggers → audit_log trigger fires on a composite-PK write → JSON-path fallback from migration 0016 doesn't catch a new shape → seed fails again.

**Why it happens:** Phase 2 Bug #2 patched the audit trigger; any new table with composite-PK re-introduces the risk.

**How to avoid:**
- Migration 0017 for Phase 3 does NOT add new tables with composite-PK. The only schema changes are:
  - ALTER TABLE companies ADD COLUMN × 5 denormalized columns
  - CREATE OR REPLACE FUNCTION fn_refresh_company_search_fields
  - CREATE TRIGGER × 3 (funding_rounds, aliases, company_facts)
  - CREATE EXTENSION pgroonga
  - CREATE INDEX × 3 (pgroonga on companies.search_doc, pgroonga on aliases.alias, composite B-tree on companies(sector, latest_round_stage))
- If future Wave adds a composite-PK table (e.g., a search-log), apply the JSON path pattern from migration 0016 proactively

**Warning signs:** `record "new" has no field "id"` in migration apply logs.

## Code Examples

### SRCH-13 regression test harness (Wave 6)

```typescript
// Source: composes Phase 2 smoke-test harness pattern (tests/smoke/phase2-success-criteria.test.ts)
// tests/smoke/phase3-srch13.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { searchAdapter } from '@/lib/search/adapter';

const SRCH13_CORPUS = [
  { q: '토스',           expectSlug: 'toss'    },
  { q: '토스뱅크',       expectSlug: 'toss'    },   // alias
  { q: '비바리퍼블리카', expectSlug: 'toss'    },   // legal alias
  { q: '당근',           expectSlug: 'daangn'  },
  { q: '당근마켓',       expectSlug: 'daangn'  },   // former name alias
  { q: 'Coupang',        expectSlug: 'coupang' },
  { q: '쿠팡',           expectSlug: 'coupang' },
] as const;

describe('SRCH-13 Korean regression corpus', () => {
  for (const { q, expectSlug } of SRCH13_CORPUS) {
    it(`resolves "${q}" to ${expectSlug}`, async () => {
      const hits = await searchAdapter.autocomplete({ q, limit: 10 });
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some(h => h.slug === expectSlug)).toBe(true);
    });
  }
});
```

### Sort key → SQL fragment map (type-safe, no injection risk)

```typescript
// src/lib/search/sort.ts
import { sql, type SQL } from 'drizzle-orm';

export const SORT_SQL: Record<(typeof SORT_KEYS)[number], SQL> = {
  recent_funding_desc: sql`latest_round_announced_at DESC NULLS LAST`,
  recent_funding_asc:  sql`latest_round_announced_at ASC NULLS LAST`,
  name_asc:            sql`display_name_ko ASC`,
  name_desc:           sql`display_name_ko DESC`,
  cumulative_funding_desc: sql`cumulative_funding_minor DESC NULLS LAST`,
  cumulative_funding_asc:  sql`cumulative_funding_minor ASC NULLS LAST`,
  founded_desc:        sql`founded_year DESC NULLS LAST`,
  founded_asc:         sql`founded_year ASC NULLS LAST`,
};
```

### Denormalization trigger function (outline)

```sql
-- Source: CONTEXT §Phase 2 carry-forward + migration 0014 pattern
-- migration 0017_search_phase3.sql (excerpt)
CREATE OR REPLACE FUNCTION public.fn_refresh_company_search_fields(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_aliases TEXT;
BEGIN
  -- Cumulative funding in KRW (USD rounds ignored for v1 — cleaner than FX conversion)
  UPDATE public.companies c SET
    cumulative_funding_minor = COALESCE((
      SELECT SUM(fr.amount_minor)
      FROM public.funding_rounds fr
      WHERE fr.company_id = p_company_id
        AND fr.deleted_at IS NULL
        AND fr.currency_code = 'KRW'
    ), NULL),

    latest_round_stage = (
      SELECT fr.stage FROM public.funding_rounds fr
      WHERE fr.company_id = p_company_id AND fr.deleted_at IS NULL
      ORDER BY fr.announced_at DESC NULLS LAST, fr.created_at DESC LIMIT 1
    ),

    latest_round_announced_at = (
      SELECT fr.announced_at FROM public.funding_rounds fr
      WHERE fr.company_id = p_company_id AND fr.deleted_at IS NULL
      ORDER BY fr.announced_at DESC NULLS LAST, fr.created_at DESC LIMIT 1
    )
  WHERE c.id = p_company_id;

  -- search_doc = display_name_ko + en + legal + aliases
  SELECT string_agg(a.alias, ' ')
    INTO v_aliases
    FROM public.aliases a
   WHERE a.company_id = p_company_id AND a.deleted_at IS NULL;

  UPDATE public.companies c SET
    search_doc = concat_ws(' ',
      c.display_name_ko, c.display_name_en, c.legal_name, v_aliases
    )
  WHERE c.id = p_company_id;
END;
$$;

-- Three triggers — all AFTER, all FOR EACH ROW, all call the same function
CREATE OR REPLACE FUNCTION public.fn_search_trg_funding()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.fn_refresh_company_search_fields(COALESCE(NEW.company_id, OLD.company_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_search_refresh_funding_rounds
AFTER INSERT OR UPDATE OR DELETE ON public.funding_rounds
FOR EACH ROW EXECUTE FUNCTION public.fn_search_trg_funding();

-- Analogous triggers on aliases + company_facts (employees_latest)
-- ...

-- Backfill on migration apply
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.companies WHERE deleted_at IS NULL LOOP
    PERFORM public.fn_refresh_company_search_fields(r.id);
  END LOOP;
END $$;
```

### Composite index for most-common filter combination

```sql
-- D-04 facet order suggests sector + stage are the two most-used filters combined
CREATE INDEX ix_companies_sector_stage_funding
  ON public.companies (sector, latest_round_stage, cumulative_funding_minor DESC)
  WHERE deleted_at IS NULL;

-- For default sort (recent_funding_desc) scanning all companies
CREATE INDEX ix_companies_latest_round_announced
  ON public.companies (latest_round_announced_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;

-- For founded_year facet
CREATE INDEX ix_companies_founded_year
  ON public.companies (founded_year)
  WHERE deleted_at IS NULL AND founded_year IS NOT NULL;
```

### Autocomplete query (SRCH-07)

```sql
-- Single query: match on display names OR on aliases; return canonical company
SELECT DISTINCT ON (c.id)
  c.id,
  c.slug,
  c.display_name_ko,
  a.alias       AS matched_alias,
  a.alias_type  AS matched_alias_type
FROM public.companies c
LEFT JOIN public.aliases a
  ON a.company_id = c.id AND a.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND (
    c.display_name_ko &@~ :q
    OR c.display_name_en &@~ :q
    OR a.alias &@~ :q
  )
ORDER BY c.id, a.alias_type   -- stable ordering; legal > brand > english > former > common
LIMIT :limit;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` + cookie-free anon for public reads | Phase 1 | Must use cookie-free client in `unstable_cache`; Phase 2 locked this |
| `simple` tsvector config | PGroonga `TokenBigram` index on denormalized search_doc | Phase 3 NEW | Korean bigram tokenization without Python dependency |
| Client-side fetch + filter for facet results | RSC server-side fetch via nuqs `createSearchParamsCache` | Next 15 | Deep-linkable URLs, first-paint fast |
| `useSearchParams` + manual URL parsing | `nuqs` parsers (server + client) | nuqs 2.x | Type safety, shared parser contract |
| OFFSET-heavy pagination (thousands of rows) | OFFSET + LIMIT is fine up to ~10k | Now | v1 under 10k rows; keyset pagination deferred to Phase 8 if p95 becomes an issue |

**Deprecated/outdated:**

- `tsvector` with `simple` config for Korean — whitespace tokenization fails agglutinative Korean (migration 0010 uses this; Phase 3 supersedes). The existing column stays (generated column, cheap), indexes retained as fallback.
- Client-side fuzzy match library for alias search — solved at the Postgres layer via PGroonga + pg_trgm.
- CLAUDE.md recommendation of "Python ETL writes `search_tokens`" — valid alternative but superseded by PGroonga finding. This research supersedes STATE.md Key Decision #3 for the Korean tokenization column choice; the mecab-ko alternative remains a Phase 4a ETL consideration for financial-text search but is not required for company-name search.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PGroonga default `TokenBigram` correctly tokenizes Hangul (생성 → 생, 성, 생성) for partial-match | §Pattern 4 | Low — bigram is character-based, Hangul syllable blocks are single chars; SRCH-13 corpus is the validation gate. If fails, swap to explicit `TokenNgram("unify_alphabet", false, ...)` per docs. [ASSUMED based on PGroonga docs — documented for Japanese (same CJK category); not explicitly validated for Korean in sources] |
| A2 | p95 < 1s at 5k rows achievable with denormalized columns + composite indexes + single-query facet counts | §Summary + §Pitfall 4 | Medium — if false, need Meilisearch earlier. Wave 6 load test is the gate. Mitigation: all queries use EXPLAIN ANALYZE before acceptance. [ASSUMED based on Korotkov blog + general Postgres GIN performance — not measured in this session] |
| A3 | nuqs commit-per-checkbox without throttle won't degrade perceived UX below 300ms useDeferredValue debounce | §Pitfall 6 | Low — standard React 19 pattern. If it does, raise deferred delay or add Suspense key-cancellation. [ASSUMED — React 19 useDeferredValue is well-documented but behavior under rapid nuqs commit not tested in this session] |
| A4 | Supabase managed projects on v1 (our current) allow `CREATE EXTENSION pgroonga` without a support ticket | §Pitfall 1 | Medium — Supabase docs list pgroonga in "Extensions" sidebar but don't state tier restrictions. Fallback: drop pgroonga index, retain pg_trgm only. [CITED docs page lists it; no explicit tier caveats found but not exhaustively verified] |
| A5 | The 15-row Phase 2 seed exercises all 7 SRCH-13 corpus entries (via aliases seeded in Phase 2) | §Code Examples (regression harness) | Low — Phase 2 SUMMARY 02-05 confirms "4 CRITICAL brand families (토스·당근·쿠팡·배민) included" with "59 aliases". Exact alias text for "토스뱅크" / "당근마켓" needs spot-check in Wave 0. [VERIFIED partially via 02-05-SUMMARY.md; confirm exact alias strings in Wave 0] |
| A6 | `cumulative_funding_minor` can safely ignore USD rounds (sum only KRW) for v1 without confusing users | §Code Examples (trigger outline) | Medium — a Korean company with a USD round would be under-counted. Alternative: FX-convert at ingest using `fx.ts` helper, already exists in `scripts/seed/`. Recommend: Wave 2 revisits this — if any seeded company has USD rounds, add FX conversion. [ASSUMED — Phase 2 seed predominantly KRW; needs verification] |
| A7 | PGroonga operator `&@~` works under the Supabase pooler (pgBouncer transaction mode) | §Pattern 4 | Low — pgBouncer transaction mode disables session-level state, but index operators are session-neutral. [ASSUMED based on PGroonga documentation implying full PostgreSQL compatibility] |

**How discuss-phase should treat this:** A1, A4, A5 are the critical ones to either (a) verify empirically in Wave 0 against the 15-row seed before committing to the migration, or (b) keep the `pg_trgm`-only fallback as the Plan B path in the migration's comments so it's one revert away.

## Open Questions (RESOLVED)

All five open questions below were resolved during planning. This section is retained as an audit trail; see inline `RESOLVED:` markers for the locked decision and the downstream plan that codifies it.

1. **PGroonga default TokenBigram for Korean: does "토스" match "토스뱅크"?**
   - What we know: TokenBigram tokenizes non-ASCII into overlapping 2-chars. "토스뱅크" → "토스", "스뱅", "뱅크". Query "토스" → "토스". Index should match.
   - What's unclear: PGroonga docs suggest `TokenNgram("unify_alphabet", false, ...)` for more reliable partial match than default TokenBigram.
   - Recommendation: Wave 0 task = enable pgroonga, create both index variants on 1 test column, run SRCH-13 corpus, pick the variant that passes all 7 entries. Lock choice in migration 0017.
   - **RESOLVED:** Plan 02 (migration 0017) adopts PGroonga default `TokenBigram` on `companies.search_doc` and `aliases.alias`. Plan 07 Task 2 (load test) and Plan 07 Task 1 (SRCH-13 live regression) act as the empirical validation gate. If the 7-entry corpus fails at Plan 07 runtime, the remediation documented in Plan 07 REPORT.md is to recreate the indexes with `USING pgroonga (col) WITH (tokenizer='TokenNgram("unify_alphabet", false, "unify_symbol", false)')` — this is a drop-index + create-index operation and does not require a new migration file. Plan B trigger point = any corpus miss in `tests/smoke/phase3-srch13.test.ts`.

2. **Should employees_latest wait for Phase 4a ETL or use Phase 2 seed's current employees field?**
   - What we know: `companies` table has no `employees` column; employees data goes into `company_facts` per migration 0006. Phase 2 seed didn't populate company_facts for employees.
   - What's unclear: Is the 15-company seed's employees data stored anywhere today?
   - Recommendation: Wave 2 verifies. If missing: keep `employees_latest` column nullable, seed a few manually via SQL INSERT into `company_facts` as part of synthetic data generator so range facet has something to filter on in dev. Document that full coverage comes from Phase 4a.
   - **RESOLVED:** Plan 02 keeps `employees_latest INTEGER NULL` on `companies` and wires a trigger on `company_facts` (fact_type='employees') to populate it. For the Phase 2 15-row cold-start seed, no `company_facts` employees entries exist, so `employees_latest` stays NULL — and the adapter's employees range filter is designed to IGNORE rows with NULL `employees_latest` only when a min OR max is provided (i.e., NULL = "unknown, excluded from range facet, included in everything else"). Plan 07 Task 1 (`scripts/search/generate-synthetic.ts`) then seeds `company_facts` employees entries for ~60% of synthetic rows so the 5k load test exercises the range facet. Full real-world coverage arrives with Phase 4a DART ETL (REQ FOUND-etl).

3. **Is `region` currently an enum or free text?**
   - What we know: Migration 0004 defines `region CHAR(2) NOT NULL DEFAULT 'KR'` (ISO 3166-1 alpha-2).
   - What's unclear: D-04 calls the facet "지역" (region) — does this mean country (KR/JP/SG) or 시도-level (서울/경기/부산)?
   - Recommendation: Plan-check decides. Given seed is 15 Korean companies all with `region='KR'`, the "지역" facet would have exactly one value in v1 — useless. Options:
     - (a) Add `hq_city` TEXT column extracted from `hq_address` for real variation (e.g., 서울/부산/경기)
     - (b) Defer region facet to Phase 8 when non-Korean companies seed in
     - (c) Keep region=KR facet for Asia-expansion readiness (contract future-proofing at cost of one-item dropdown in v1)
   - Recommendation: (a) — adds a `hq_region TEXT` column derived from `hq_address` first-word (서울/경기/부산 etc.) at ETL time; for v1 seed, populate by hand in 0017 migration backfill. Contains variance for real facet filtering.
   - **RESOLVED:** Option (a). Plan 02 migration 0017 adds `hq_region TEXT NULL` to `companies` and includes a one-time backfill that derives 시도-level value from the first whitespace-delimited token of `hq_address` (서울특별시/경기도/부산광역시/…). The D-04 "지역" facet binds to `hq_region`, not the CHAR(2) `region` column. The existing `region CHAR(2)` column stays in place for future Asia expansion (non-Korean companies) but is not surfaced as a facet in v1. Plan 07 synthetic generator uses weighted `REGIONS_ADDR` distributions so `hq_region` backfill yields meaningful cardinality at 5k rows.

4. **Can we avoid the `search_doc` trigger complexity by using a `GENERATED ALWAYS AS` column?**
   - What we know: PG15 supports stored generated columns but they cannot reference other tables (aliases).
   - What's unclear: Could a view + materialized view suffice?
   - Recommendation: Use trigger. Materialized views refresh is all-or-nothing and 10-minute refresh windows defeat freshness.
   - **RESOLVED:** Use trigger. Plan 02 migration 0017 implements `fn_refresh_company_search_fields(uuid)` plus AFTER INSERT/UPDATE/DELETE triggers on `funding_rounds`, `aliases`, and `company_facts`. Generated columns cannot read from `aliases` (cross-table reference) and materialized views lose real-time freshness. The trigger path is authoritative; `search_doc` is a plain TEXT column (not generated) so the function can concatenate `display_name_ko + display_name_en + legal_name + string_agg(aliases.alias)` atomically.

5. **URL length budget — at 5 facets × 10 selected values each + sort + page + view, URL can exceed 2KB.**
   - What we know: Most browsers handle 8KB URLs; comma-separated encoding keeps it tight.
   - What's unclear: At what facet combination count does UX break (shareable link failures)?
   - Recommendation: Not a v1 issue at 15 companies. Defer to Phase 8 load-test finding.
   - **RESOLVED:** Deferred to Phase 8 LAUNCH-05 load test. At v1 dataset sizes (15 rows cold-start, 5k synthetic for load validation) and realistic facet cardinality (<=6 facets × typically 1–3 selected values each) URL length stays well under 1KB. nuqs parsers already cap array lengths defensively (array-length validator in Plan 03 query-params.ts rejects >50 entries per facet, per security domain). Plan 07 load test exercises 5-facet mixes but does not stress the extreme pathological case; that belongs to Phase 8 concurrency/load testing (LAUNCH-05), which owns cross-browser URL-limit behavior and CDN header-size budgets.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Supabase managed PG | Everything | ✓ (live — remote `nwgeduleywylpumkhedm`) | PG15 | — |
| PGroonga extension | Korean bigram tokenization | ✓ on Supabase platform (per-project enable required) | Groonga 16.x / pgroonga 4.x (latest announced 2026-04-07) | `pg_trgm` retained — SRCH-13 pass rate drops but ships |
| pg_trgm | Trigram fuzzy fallback | ✓ (migration 0001) | Postgres built-in | — |
| btree_gin | Composite GIN indexes | ✓ (migration 0001) | Postgres built-in | — |
| npm / node | Development | ✓ | See package.json | — |
| Python 3.12 | Not needed in Phase 3 | N/A | — | — |
| Fly.io | Not needed in Phase 3 | N/A | — | — |

**Missing dependencies with no fallback:** None blocking. PGroonga activation is per-project; fallback to pg_trgm-only path exists.

**Missing dependencies with fallback:**
- PGroonga → pg_trgm + LIKE: Drops SRCH-13 corpus pass rate (probably 5/7 instead of 7/7) but ships. Documented as Plan B in migration 0017 comments.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (already configured in Phase 2) |
| Config file | `vitest.config.ts` (with `@vitejs/plugin-react` + `tests/__mocks__/server-only.ts` alias) |
| Quick run command | `npx vitest run tests/unit` |
| Full suite command | `npm test` (runs `vitest run` — covers unit + smoke + rls) |
| Smoke suite | `npm run test:smoke` (HTTP against running `npm run dev`, uses `SMOKE_BASE_URL`) |
| Integration DB tests | reuse `scripts/seed/_push_migrations.cjs` + cookie-free anon client pattern |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | `/search` renders 200 OK with RSC | smoke | `npx vitest run tests/smoke/phase3-route.test.ts` | ❌ Wave 0 |
| SRCH-02 | All 6 facets apply, reduce result set | integration | `npx vitest run tests/integration/search-facets.test.ts` | ❌ Wave 0 |
| SRCH-03 | Chip bar renders per URL state; removing chip updates URL | unit (component) | `npx vitest run tests/unit/active-filter-chips.test.tsx` | ❌ Wave 0 |
| SRCH-04 | Result count matches `filtered` CTE total | integration | Part of `search-facets.test.ts` | ❌ Wave 0 |
| SRCH-05 | p95 < 1s at 5k rows | load | `npx tsx tests/load/phase3-load.ts` | ❌ Wave 6 |
| SRCH-06 | URL → identical UI state on reload | smoke | `npx vitest run tests/smoke/phase3-url-state.test.ts` | ❌ Wave 0 |
| SRCH-07 | Autocomplete resolves alias → canonical | smoke / integration | `npx vitest run tests/smoke/phase3-autocomplete.test.ts` | ❌ Wave 0 |
| SRCH-08 | Sort options applied in ORDER BY | integration | Part of `search-facets.test.ts` | ❌ Wave 0 |
| SRCH-09 | View toggle reflects URL `?view=` param | smoke | Part of `phase3-url-state.test.ts` | ❌ Wave 0 |
| SRCH-10 | Pagination `?page=` returns correct window | integration | Part of `search-facets.test.ts` | ❌ Wave 0 |
| SRCH-11 | `lib/search/adapter.ts` exports SearchAdapter interface, postgres.ts implements it | unit | `npx vitest run tests/unit/search-adapter.test.ts` — type check + import grep | ❌ Wave 0 |
| SRCH-12 | `search_doc` populated on companies; pgroonga index exists | migration test | `npx vitest run tests/unit/search-schema.test.ts` | ❌ Wave 0 |
| SRCH-13 | 7-entry Korean corpus all return canonical company | smoke | `npx vitest run tests/smoke/phase3-srch13.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/unit` — <5s
- **Per wave merge:** `npx vitest run tests/unit tests/smoke` — <30s
- **Phase gate:** `npm test` + load test + 375px mobile human-verify (reused harness from Phase 2)

### Wave 0 Gaps

- [ ] `tests/smoke/phase3-route.test.ts` — SRCH-01 HTTP 200
- [ ] `tests/smoke/phase3-url-state.test.ts` — SRCH-06 + SRCH-09
- [ ] `tests/smoke/phase3-autocomplete.test.ts` — SRCH-07
- [ ] `tests/smoke/phase3-srch13.test.ts` — SRCH-13 regression corpus (CRITICAL gate)
- [ ] `tests/integration/search-facets.test.ts` — SRCH-02 / -04 / -08 / -10 combined
- [ ] `tests/unit/search-adapter.test.ts` — SRCH-11 interface contract
- [ ] `tests/unit/search-schema.test.ts` — SRCH-12 migration sanity
- [ ] `tests/unit/active-filter-chips.test.tsx` — SRCH-03 component behavior
- [ ] `tests/unit/pagination-window.test.ts` — paginationWindow helper
- [ ] `tests/unit/parse-krw.test.ts` — funding range input parser
- [ ] `tests/load/phase3-load.ts` — SRCH-05 load test harness
- [ ] `scripts/search/generate-synthetic.ts` — 5k-row synthetic seed

**Framework install:** None — Vitest already covers all needs.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | `/search` is public per CONTEXT carry-forward; anon SELECT via `canonical_select_public` RLS |
| V3 Session Management | no | No sessions involved in public search |
| V4 Access Control | yes | RLS `canonical_select_public` on all canonical tables enforces `deleted_at IS NULL` — new columns (cumulative_funding_minor etc.) inherit automatically since they're columns of `companies`, not new tables |
| V5 Input Validation | **yes** | All searchParams parse through `createSearchParamsCache` — zod-equivalent safety. Arrays, enums, integers typed. `q` free-text is the attack surface — must not interpolate into SQL. |
| V6 Cryptography | no | No secrets, no encryption in search path |
| V7 Error Handling | yes | `error.tsx` boundary rethrows to Sentry (Phase 1 pattern); search errors render neutral "검색 결과를 불러오지 못했습니다" — no SQL error leakage |
| V8 Data Protection | yes | Soft-delete `deleted_at IS NULL` predicate in every search query (RLS + `filtered` CTE double defense) |
| V13 API | yes | If autocomplete is exposed as `/api/search/autocomplete`, rate-limit per IP (follow-up; v1 can inline the query into the page RSC and skip the endpoint) |

### Known Threat Patterns for Next.js 15 + Postgres + nuqs

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via free-text `q` | Tampering | Supabase JS client / Drizzle parameterized bindings; PGroonga operator `&@~ :q` with bound parameter |
| SQL injection via sort key | Tampering | `parseAsStringLiteral(SORT_KEYS)` in nuqs + literal ORDER BY SQL map (never string-concat user input into ORDER BY) |
| IDOR via company slug navigation | Information Disclosure | Slugs are intentional public identifiers; RLS permits anon read on non-deleted rows — accepted |
| Soft-deleted rows leaking via new index | Information Disclosure | Every new index in 0017 has `WHERE deleted_at IS NULL` predicate — verified by grep |
| Unsafe HTML in autocomplete suggestion rendering | XSS | React auto-escapes text children; `dangerouslySetInnerHTML` forbidden; alias text is plain TEXT column (not user-submitted in v1) |
| Regex DoS in `q` input | DoS | `q` is passed to PGroonga as literal bigram match — no regex evaluated in Postgres; length-capped at 100 chars in nuqs parser (add `.withDefault('').transform(s => s.slice(0, 100))`) |
| URL-state explosion (attacker crafts pathological 10MB URL) | DoS | Browser + Vercel edge reject >8KB URLs; nuqs parsers cap array lengths (add `if (arr.length > 50) return [];` validator) |
| Information disclosure via autocomplete of PII aliases | Information Disclosure | PII-minimal alias table per migration 0004 comment; aliases contain company names, not person names — acceptable |
| Cross-site timing attack revealing row existence | Information Disclosure | Public search — row existence is the product itself, not confidential |

**Defense in depth:**
- Layer 1 — nuqs parser constrains shape (enum, array length, integer range)
- Layer 2 — adapter validates ranges (employees.min ≤ employees.max; funding.min ≤ funding.max)
- Layer 3 — Supabase parameterized query prevents SQL injection
- Layer 4 — RLS `canonical_select_public` enforces `deleted_at IS NULL` at DB level regardless of query shape

**Not in scope for Phase 3 (deferred):**
- Per-IP rate limit on autocomplete endpoint — Phase 7 (alongside Resend abuse controls)
- CAPTCHA on free-text search — no known abuse vector at launch
- Search query logging for abuse detection — Phase 8 (Vercel Analytics covers page-level; search-query log is CRM-level)

## Project Constraints (from CLAUDE.md)

Explicit directives from project instructions the planner must honor:

1. **Tech stack is locked** — Next.js 15.5 + Supabase Postgres + Tailwind v4 + shadcn/ui (Radix variant) + nuqs + Drizzle. No alternatives explored.
2. **Hosting on Vercel + Supabase free tier** — no infra changes for Phase 3.
3. **Performance:** 5k–10k facet filter p95 < 1s — enforced by Phase 8 load test; Phase 3 Wave 6 is the proving ground.
4. **Trust:** Every data point with source + last_verified_at — Phase 2 freshness dot carry-forward applies to result rows.
5. **Localization:** Korean-first, all UI strings through `t()`. `en.json` stub mirrors `ko.json` keys.
6. **Compliance:** PIPA / GDPR considerations — not applicable to public search (no PII exposure beyond already-public company data).
7. **Data legal:** Only public-domain / licensed data — search surfaces existing canonical rows, no new ingestion.
8. **Faceted search phased strategy:** CLAUDE.md prescribes Postgres + GIN first, Meilisearch deferred. Phase 3 builds behind `lib/search/adapter.ts` so v2 swap is cheap.
9. **Korean tokenization:** CLAUDE.md suggests app-side morpheme tokens OR `pg_cjk_parser`. This research supersedes with PGroonga finding (HIGH confidence pgroonga is supported).
10. **What NOT to use:** `@supabase/auth-helpers-nextjs`, Algolia, Elasticsearch, Vercel Cron on Hobby, scraping inside Next.js API routes, Postgres `simple` FTS config for Korean, Naver login v1, self-host Postgres, Prisma Migrate on Supabase. — Phase 3 touches none of these.
11. **Use instead:** `@supabase/ssr`, Postgres FTS → Meilisearch later, GitHub Actions cron, separate Fly.io worker for ETL, app-side morpheme tokenization OR `pg_cjk_parser` (now superseded by PGroonga), Drizzle Kit OR Supabase CLI migrations.

**Conflict flag:** CLAUDE.md Korean tokenization section recommends Python ETL mecab path with `pg_cjk_parser` as alternative. Research finding that PGroonga is Supabase-supported is **a newer data point** that supersedes both options with less friction. Planner should note this and keep the CLAUDE.md path (Python ETL) as a Phase 4a concern for DART-text search, not a Phase 3 gate.

## Sources

### Primary (HIGH confidence)

- [Supabase PGroonga docs](https://supabase.com/docs/guides/database/extensions/pgroonga) — confirms PGroonga is officially supported on Supabase managed
- [Supabase Extensions overview](https://supabase.com/docs/guides/database/extensions) — "over 50 pre-configured extensions"
- [PGroonga CREATE INDEX reference](https://pgroonga.github.io/reference/create-index-using-pgroonga.html) — TokenBigram default + TokenNgram variants
- [nuqs server-side docs](https://nuqs.47ng.com/docs/server-side) — `createSearchParamsCache`, `parseAsArrayOf` with comma separator, Next 15 Promise pattern
- [Alexander Korotkov: Faceted Search in a Single PostgreSQL Query](https://akorotkov.github.io/blog/2016/06/17/faceted-search/) — single-query window function pattern
- `supabase/migrations/0001_extensions.sql` — pg_trgm + btree_gin + pgcrypto already installed
- `supabase/migrations/0010_indexes_and_tsvector.sql` — existing GIN/tsvector strategy to build on
- `supabase/migrations/0012_rls_canonical.sql` — RLS policies inherited by any new columns
- `src/lib/data/companies.ts` — cookie-free anon client pattern to reuse
- `.planning/phases/02-read-only-profiles-manual-seed/02-06-SUMMARY.md` — Next 15 cookies-in-cache bug, SMOKE_BASE_URL convention, 200-or-404 assertion pattern

### Secondary (MEDIUM confidence)

- [Postgres FTS trigram vs full-text](https://www.aapelivuorinen.com/blog/2021/02/24/postgres-text-search/) — pg_trgm for fuzzy, tsvector for token — validates our hybrid plan
- [PGroonga versus pg_bigm](https://pgroonga.github.io/reference/pgroonga-versus-pg-bigm.html) — variable N-gram vs fixed bigram; recommends PGroonga for language-agnostic text
- [pg_bigm documentation](http://pgbigm.osdn.jp/pg_bigm_en.html) — would be next fallback if PGroonga were unavailable
- [shadcn async autocomplete pattern](https://dev.to/thevideopilot/using-shadcnui-for-an-autocomplete-component-4cgc) — Popover + Command + shouldFilter={false} + debounced fetch pattern
- [Aurora Scharff: Advanced Next.js searchParams filtering](https://aurorascharff.no/posts/managing-advanced-search-param-filtering-next-app-router/) — server-side nuqs cache pattern

### Tertiary (LOW confidence — flagged for Wave 0 validation)

- Claim that PGroonga's default `TokenBigram` suffices for Korean (A1 in Assumptions Log) — documentation doesn't specifically test Korean, only Japanese/Chinese; behavior assumed equivalent due to shared CJK tokenization class. **Must validate via SRCH-13 corpus in Wave 0.**

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified on npm registry 2026-04-22
- Architecture patterns: HIGH — Korotkov faceted single-query + nuqs server cache are documented standards; PGroonga is documented but not tested here for Korean (MEDIUM on that specific sub-claim)
- Pitfalls: HIGH — most pitfalls are direct Phase 2 learnings (cookies-in-cache, server-only imports, composite-PK audit, SMOKE_BASE_URL); the search-specific pitfalls are well-documented Postgres knowledge
- Korean tokenization specifics: MEDIUM-HIGH — PGroonga availability verified; default tokenizer for Korean assumed-by-analogy from Japanese docs, to be empirically validated in Wave 0
- p95 achievability: MEDIUM-HIGH — standard Postgres GIN performance, but exact numbers for the 5k-row denormalized shape are ASSUMED until Wave 6 load test

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — stable ecosystem; PGroonga + nuqs versions quiet for months)
