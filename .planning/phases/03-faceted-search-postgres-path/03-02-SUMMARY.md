---
phase: 03-faceted-search-postgres-path
plan: 02
subsystem: database

tags: [postgres, pgroonga, supabase, korean-tokenization, faceted-search, denormalization, triggers, integration-testing]

requires:
  - phase: 01-foundation-compliance-baseline
    provides: companies/aliases/funding_rounds/company_facts schema, RLS canonical_select_public policies, deleted_at soft-delete discipline, data_sources.id=00000000-0000-0000-0000-000000000001 manual-curation seed row
  - phase: 02-read-only-profiles-manual-seed
    provides: 15 seeded companies covering SRCH-13 cold-start set (토스/당근/쿠팡/배민 + 11 diversity rows), aliases populated, scripts/seed/_push_migrations.cjs helper
  - phase: 03-01
    provides: test harness layout (tests/unit, tests/rls, tests/smoke), @vitejs/plugin-react vitest config, search-fixtures.ts + SRCH-13 stubs, search.* i18n namespace

provides:
  - pgroonga extension (v3.2.5) enabled on live Supabase project
  - 7 denormalized columns on public.companies (cumulative_funding_minor, latest_round_stage, latest_round_announced_at, employees_latest, founded_year, hq_region, search_doc)
  - fn_refresh_company_search_fields(uuid) idempotent refresh function
  - 3 AFTER INSERT/UPDATE/DELETE triggers on funding_rounds, aliases, company_facts
  - 2 pgroonga GIN indexes (ix_companies_search_doc_pgroonga, ix_aliases_alias_pgroonga)
  - 6 partial B-tree facet indexes for sort + range facets
  - Backfill of 16 existing seeded companies (all have search_doc, 15/16 have hq_region)
  - Live-DB integration test harness (tests/unit/search-schema.test.ts + tests/integration/search-drift.test.ts)

affects: [03-03, 03-04, 03-05, 03-06, 03-07, 4a-dart-etl]

tech-stack:
  added: [pgroonga@3.2.5, pg node driver usage in tests, dotenv in test harness, tests/integration/ directory]
  patterns:
    - "Live-DB integration tests via pg client using DATABASE_URL (parallel to scripts/seed/_push_migrations.cjs wire-parse shim) — enables pg_catalog meta-queries that PostgREST cannot reach"
    - "describe.skip gating on DATABASE_URL / SUPABASE_SERVICE_ROLE_KEY absence — tests stay green in CI environments without DB credentials without flagging false failures"
    - "Denormalized columns refreshed by a single source-of-truth function (re-reads source tables, no incremental math) — Pitfall 2 mitigation; drift-free by construction"
    - "Three separate trigger shim functions (not one multiplex with TG_ARGV) — each trigger is independently auditable"

key-files:
  created:
    - supabase/migrations/0017_pgroonga_and_denormalized_columns.sql
    - tests/unit/search-schema.test.ts
    - tests/integration/search-drift.test.ts
  modified:
    - .env.local (copied from main checkout into worktree; already gitignored)

key-decisions:
  - "Went with Option 2 (pgroonga native extension) since Supabase managed Postgres preinstalls it — confirmed via Task 2 human checkpoint ('pgroonga ready') and SELECT on pg_available_extensions"
  - "hq_region added to companies table (resolves RESEARCH Open Q #3 option (a)) rather than deferring — 15 seed rows already carry 시/도 prefix derivable from hq_address"
  - "KRW-only cumulative_funding_minor per RESEARCH Assumption A6 — USD/FX excluded in v1, flagged in column comment for Phase 4a to revisit"
  - "Refresh function triggered on ALL funding_rounds and aliases writes; company_facts trigger gated to fact_type='employees' only to avoid unnecessary refresh cost when revenue/MAU rows churn"
  - "Partial indexes carry `WHERE deleted_at IS NULL` predicate on every new index (T-03-02-01 mitigation) — matches migration 0010 discipline"
  - "Live-DB tests use pg client for pg_catalog assertions + anon Supabase JS client for RLS-gated read path — both prove migration landed AND the Plan 03 adapter will see the columns it expects"

patterns-established:
  - "Pattern: Migration-driven denormalization. Source tables stay normalized; a refresh fn aggregates state onto the parent row. Triggers call the refresh fn with the parent UUID. Reads hit the denorm columns only (no runtime SUM/JOIN)."
  - "Pattern: Meta-query test layer. pg_extension/pg_indexes/pg_trigger/pg_proc queries via pg client are the canonical way to prove DDL landed — PostgREST alone is insufficient since the anon key cannot see system catalogs."
  - "Pattern: .env.local worktree import. Sibling worktrees need the main checkout's .env.local copied in (not symlinked — Windows). File stays gitignored."

requirements-completed: [SRCH-05, SRCH-12]

duration: ~18min
completed: 2026-04-22
---

# Phase 03 Plan 02: PGroonga + Denormalized Columns Summary

**pgroonga 3.2.5 Korean tokenization enabled on Supabase, 7 denormalized columns + 8 partial indexes + single-source-of-truth refresh function shipped with live-DB integration tests — all 16 seeded companies backfilled, 2/3 task commits atomic**

## Performance

- **Duration:** ~18 min (orchestrator continuation from Task 3 on)
- **Task 1 commit:** `11eee0a` (pre-existing in base HEAD — authored in prior run, merged into worktree base)
- **Task 2 (checkpoint):** resolved by user reply "pgroonga ready"
- **Task 3 started:** 2026-04-22T05:55Z (approx)
- **Task 3 completed:** 2026-04-22T06:10Z
- **Tasks:** 3 (1 auto + 1 checkpoint + 1 auto)
- **Files modified:** 2 created (tests), 1 already in HEAD (migration)

## Accomplishments

- **Migration 0017 applied to live Supabase.** `schema_migrations` now carries version `0017_pgroonga_and_denormalized_columns`, applied_at 2026-04-22T06:02:12.869Z. pgroonga extension registered at version 3.2.5.
- **Backfill verified end-to-end.** 16/16 non-deleted companies carry `search_doc`; 15/16 carry `hq_region` (1 row has NULL hq_address, expected). toss `search_doc` contains '비바리퍼블리카' — proves the aliases aggregation arm of `fn_refresh_company_search_fields` wired correctly.
- **8 tests green against live DB** (`tests/unit/search-schema.test.ts`) covering: pg_extension row, 7 denorm columns, 2 pgroonga GIN indexes, 6 B-tree partial indexes with deleted_at predicate, fn_refresh + 3 triggers, anon RLS read path, toss alias aggregation.
- **Trigger sanity proven** (`tests/integration/search-drift.test.ts`) via INSERT-probe-alias → assert search_doc contains probe → soft-delete probe → assert search_doc reverts. Uses service-role key (required for aliases write under canonical_no_insert RLS).
- **TypeScript clean** — `npx tsc --noEmit` exits 0 with both new test files included.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author migration 0017 — extension + columns + triggers + indexes** — `11eee0a` (feat, already in base HEAD)
2. **Task 2: [CHECKPOINT] Verify pgroonga extension** — no commit (human verification; user replied "pgroonga ready")
3. **Task 3: Push migration + create integration tests proving schema + trigger work** — `34fd720` (test)

**Plan metadata:** (to be written by orchestrator via final_commit step)

## Files Created/Modified

- `supabase/migrations/0017_pgroonga_and_denormalized_columns.sql` — 216 lines. Authored in Task 1 (commit 11eee0a, pre-HEAD), applied to live DB in Task 3.
- `tests/unit/search-schema.test.ts` — 8 live-DB assertions covering pg catalogs + RLS-gated anon reads.
- `tests/integration/search-drift.test.ts` — 1 trigger sanity test (service-role INSERT + soft-delete probe on aliases → search_doc refresh verified).
- `.env.local` — copied from main checkout (gitignored; not committed). Required for `scripts/seed/_push_migrations.cjs` and for the two test files to reach DATABASE_URL / service-role key.

## Decisions Made

- **Use the MANUAL_SOURCE_ID fixed UUID (`00000000-...-01`) in drift test** instead of a slug lookup. Migration 0003 reserves this UUID explicitly for internal-curation rows. Plan sample code assumed a `slug` column on data_sources that does not exist.
- **Meta-queries via pg client rather than Supabase RPC** in search-schema.test.ts. Plan sample assumed an `exec_sql` RPC that neither exists nor should be created (would be a blanket-SQL-execution security hole). Chose pg client talking directly to DATABASE_URL — same pattern the migration runner uses.
- **Partial-index WHERE predicate regex** must match both `WHERE (deleted_at IS NULL)` and `WHERE ((deleted_at IS NULL) AND (founded_year IS NOT NULL))` forms. Postgres normalizes multi-predicate partials with an extra layer of parens.

## Deviations from Plan

Two Rule 3 (Blocking) auto-fixes to Task 3's sample test code. Both preserve the test's intent; neither alters the SRCH-05 / SRCH-12 contract.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan sample test used non-existent `data_sources.slug` column**

- **Found during:** Task 3 (writing tests/integration/search-drift.test.ts)
- **Issue:** Plan action block referenced `svc.from('data_sources').select('id').eq('slug', 'manual_curation').single()`. Migration 0003's `data_sources` table has no `slug` column — that call would return `{data: null, error: <column missing>}` and `.id!` would crash.
- **Fix:** Replaced with the fixed UUID `00000000-0000-0000-0000-000000000001` that migration 0003 seeds for manual-curation rows (documented as "Reserved UUID for manual curation rows; do not delete"). Added explicit comment to the test file documenting this deviation + rationale.
- **Files modified:** tests/integration/search-drift.test.ts
- **Verification:** Drift test passes (1/1) — the service-role INSERT succeeds with the fixed source_id.
- **Committed in:** `34fd720` (Task 3 commit)

**2. [Rule 3 - Blocking] Plan sample test assumed an `exec_sql` RPC and a `.fts()` filter that don't apply**

- **Found during:** Task 3 (writing tests/unit/search-schema.test.ts)
- **Issue:** Plan action block's pgroonga-extension check used `client.rpc('exec_sql', ...)`. Supabase does not ship an `exec_sql` RPC, and creating one would be a blanket-SQL security hole (granting anon the ability to run arbitrary SQL). The fallback `.filter('search_doc', 'fts', '토스')` targets a tsvector FTS operator but search_doc is plain TEXT — the call would error. Plan explicitly flagged this as "implementation-flexible".
- **Fix:** Replaced with a pg-wire-protocol client that reads DATABASE_URL from .env.local (same approach as scripts/seed/_push_migrations.cjs) and queries `pg_extension`, `pg_indexes`, `pg_proc`, `pg_trigger` directly. RLS-gated anon Supabase JS client still used for the read-path assertions (search_doc content, denorm columns) to prove the Plan 03 production read path works.
- **Files modified:** tests/unit/search-schema.test.ts
- **Verification:** All 8 tests pass against the live DB (pgroonga 3.2.5 detected, 7 denorm columns present, 2 pgroonga GIN indexes + 6 B-tree indexes all carry deleted_at IS NULL, fn_refresh + 3 triggers exist, anon read of search_doc returns '비바리퍼블리카' for toss).
- **Committed in:** `34fd720` (Task 3 commit)

**3. [Rule 3 - Blocking] .env.local missing in worktree**

- **Found during:** Task 3 (before running migration push)
- **Issue:** Worktree was newly created without .env.local. Migration runner and both integration tests need DATABASE_URL + NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY.
- **Fix:** Copied .env.local from main checkout (`C:/workspace/vc-co-finder/.env.local`) into worktree. File remains gitignored per Phase 1 config — confirmed via `git check-ignore .env.local` exit=0.
- **Files modified:** .env.local (gitignored — not committed)
- **Verification:** Migration runner connected successfully; both test suites reached DB; no secrets entered git history.

---

**Total deviations:** 3 auto-fixed (all Rule 3 — Blocking environment/sample-code issues)
**Impact on plan:** None of these changed SRCH-05 / SRCH-12 contract. All three were defects in plan sample code or worktree environment, not in the migration design. Refresh function, column list, index list, and trigger semantics remain exactly as specified in the plan's action block and acceptance criteria.

## Issues Encountered

- **Vitest filter path resolution.** First test run errored with "No test files found" because the two new files had been written to the main checkout (`C:/workspace/vc-co-finder/tests/`) instead of the worktree (`C:/workspace/vc-co-finder/.claude/worktrees/agent-a436cac1/tests/`) due to path normalization. Moved the files to the correct worktree with `mv` and cleaned up the empty `tests/integration/` directory left in the main checkout. No data loss; no commits polluted.
- **Partial-index regex form.** Initial assertion `/WHERE \(deleted_at IS NULL/` missed `WHERE ((deleted_at IS NULL) AND (founded_year IS NOT NULL))` — Postgres wraps multi-predicate partials in extra parens. Regex widened to `/WHERE \(\(?deleted_at IS NULL\)?/` to match both forms.

## Auth Gates / Checkpoints

**Task 2 — `checkpoint:human-verify` (pgroonga availability).** Resolved by user reply "pgroonga ready" (continuation prompt). Not a deviation; expected workflow step. No secondary verification needed since migration push itself would have failed with "access method pgroonga does not exist" if the extension had been unavailable — successful push is the de-facto confirmation.

## Known Stubs

None. `employees_latest` column was backfilled to NULL for every company because Phase 2 seed did not populate `company_facts` with fact_type='employees' rows — this is a deliberate plan decision (Phase 4a DART ETL will start writing employees fact rows). Documented in the migration column comment.

## Threat Flags

None. Migration adds no new network endpoints, no new trust boundaries, no schema changes at trust boundaries beyond what the plan's `<threat_model>` already enumerates (T-03-02-01 through T-03-02-06, all mitigate/accept dispositions).

## User Setup Required

None for this plan. The one-time pgroonga enable was the Task 2 checkpoint which the user cleared with "pgroonga ready". Future plans in Phase 3 (03-03 and later) operate on the columns/indexes this plan ships; no further Supabase dashboard action.

## Next Phase Readiness

**Plan 03-03 (search adapter + postgres implementation) can now:**

- `SELECT slug, search_doc, cumulative_funding_minor, latest_round_stage, latest_round_announced_at, employees_latest, founded_year, hq_region FROM companies WHERE deleted_at IS NULL` returns all columns for all 16 seeded rows.
- Use pgroonga's `&@~` match operator on `companies.search_doc` and `aliases.alias` for Korean faceted search — both indexes exist with `WHERE deleted_at IS NULL` partial predicate (RLS-compatible).
- Rely on the 6 partial B-tree indexes for sort/range facets (sector + stage + funding composite; latest_round_announced for default sort; cumulative_funding, founded_year, hq_region, employees_latest for range/equality facets).
- Trust that any write through service-role to funding_rounds / aliases / company_facts (employees fact_type only) auto-refreshes the parent companies row. No application-level cache invalidation needed between writes and search index.

**Handoff contract for Plan 03-03 adapter (src/lib/search/postgres.ts):**

- Primary search clause: `companies.search_doc &@~ $1` (pgroonga match-any operator — see RESEARCH for TokenBigram behavior on '토스' → '토스뱅크').
- Fallback alias clause for exact brand matching: `EXISTS (SELECT 1 FROM aliases WHERE aliases.company_id = companies.id AND aliases.alias &@~ $1 AND aliases.deleted_at IS NULL)`.
- Facet WHERE clauses map 1:1 to column names: `sector`, `latest_round_stage`, `hq_region`, `employees_latest` (range), `cumulative_funding_minor` (range), `founded_year` (range).
- Default sort: `ORDER BY latest_round_announced_at DESC NULLS LAST` hits ix_companies_latest_round_announced partial index directly.
- All queries MUST include `WHERE deleted_at IS NULL` (RLS canonical_select_public enforces this; indexes also filter on it).

**Plan 03-07 load test (SRCH-05 + SRCH-13)** can use the backfilled 16 seeds + a synthetic generator to reach 5k rows; the trigger cascade was timed during backfill (216-line migration applied in ~9s including backfill DO-loop over 16 rows) and the per-row cost appears linear — extrapolation to 5k inserts is the planner's concern, not this plan's.

## Self-Check: PASSED

- File `supabase/migrations/0017_pgroonga_and_denormalized_columns.sql` — FOUND
- File `tests/unit/search-schema.test.ts` — FOUND
- File `tests/integration/search-drift.test.ts` — FOUND
- Commit `11eee0a` (Task 1, pre-HEAD) — FOUND in git log
- Commit `34fd720` (Task 3) — FOUND in git log (HEAD)
- schema_migrations row for `0017_pgroonga_and_denormalized_columns` — FOUND via pg query (applied_at 2026-04-22T06:02:12.869Z)
- pgroonga extension v3.2.5 — FOUND via pg_extension
- 16/16 companies carry search_doc, 15/16 carry hq_region — FOUND via COUNT(*) FILTER
- 8 expected indexes present — FOUND via pg_indexes

---
*Phase: 03-faceted-search-postgres-path*
*Completed: 2026-04-22*
