---
phase: 01-foundation-compliance-baseline
plan: 02
subsystem: database
tags: [supabase, postgres, migrations, rls-ready, audit-log, provenance, currency-triple, pipa, dsar, gin, tsvector]

requires:
  - phase: 01-01
    provides: "Next.js + @supabase/ssr + Drizzle client split; empty repo ready to host supabase/ migrations directory"
provides:
  - 11 sequential SQL migrations under supabase/migrations/ authoring the complete canonical schema
  - 13 canonical tables per FOUND-06 (companies, aliases, company_identifiers, company_relations, funding_rounds, investors, round_investors, persons, person_roles, data_sources, company_facts, audit_log, news_mentions)
  - User-scoped tables (profiles, user_watchlists, user_watchlist_companies, user_saved_searches, user_submissions) created in Phase 1 per D-03.2 so Phase 4c ships features without a schema migration wave
  - dsar_requests table for FOUND-12 PIPA DSAR endpoint (wired by Plan 06)
  - Empty staging schema with PUBLIC access revoked (D-03.7) — Phase 4a ETL can land tables without schema-creation privileges
  - Append-only audit_log table + fn_audit_log_write() trigger function (FOUND-09) ready for Plan 03 per-table trigger attach
  - Currency-triple invariant enforced via 4 chk_*_triple CHECK constraints (FOUND-14, PITFALLS #5)
  - Per-fact provenance enforced at DB level — every fact-bearing table has source_id UUID NOT NULL REFERENCES data_sources(id) (TRUST-01, PITFALLS #3)
  - Freshness marker last_verified_at TIMESTAMPTZ NOT NULL distinct from updated_at on every canonical table (TRUST-02)
  - Soft-delete column deleted_at TIMESTAMPTZ on every canonical table (D-03.10)
  - GIN trigram indexes on companies.display_name_ko/en and aliases.alias + GENERATED STORED tsvector column on companies (PITFALLS #9, SRCH-12 seed)
  - Helper functions format_krw(BIGINT) for 조/억/만 rendering, fn_touch_updated_at(), fn_handle_new_user() + on_auth_user_created trigger, custom_access_token_hook(JSONB) with supabase_auth_admin EXECUTE grant (D-03.3)
  - Seed UUID 00000000-0000-0000-0000-000000000001 reserved for manual curation source rows
affects: [01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 02-all, 03-all, 04a-all, 04b-all, 04c-all, 05-all, 06-all, 07-all]

tech-stack:
  added:
    - supabase CLI (local init — config.toml + migrations/ directory)
    - pgcrypto extension
    - pg_trgm extension
    - btree_gin extension
  patterns:
    - "data_sources-first migration order: 0003 creates provenance root before any fact-bearing table so FK constraint compiles"
    - "Currency triple (amount_minor BIGINT, currency_code CHAR(3), original_text TEXT) with chk_*_triple CHECK constraint — applied on every monetary column"
    - "TRUST-01 per-fact provenance: source_id UUID NOT NULL REFERENCES data_sources(id) on every canonical fact-bearing table"
    - "TRUST-02 freshness: last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW() distinct from updated_at"
    - "D-03.10 soft-delete: deleted_at TIMESTAMPTZ on canonical tables; partial indexes WHERE deleted_at IS NULL to keep reads fast"
    - "Identity-aware core (Pitfalls #8): aliases + company_identifiers + company_relations tables exist Phase 1, not retrofitted"
    - "D-03.3 role-in-JWT via custom_access_token_hook — RLS policies (Plan 03) read (auth.jwt() ->> 'user_role') with zero per-query join"
    - "D-03.4 audit_log single table (NOT partitioned) with append-only shape; partitioning retrofit documented for 10M-row trigger"
    - "D-03.7 staging schema empty Day 1 with PUBLIC revoked — ETL migrations (Phase 4a) don't need CREATE SCHEMA privilege"
    - "PITFALLS #9 GIN index strategy: trigram on Korean alias columns + GENERATED STORED tsvector on companies"

key-files:
  created:
    - supabase/config.toml
    - supabase/.gitignore
    - supabase/migrations/0001_extensions.sql
    - supabase/migrations/0002_enums.sql
    - supabase/migrations/0003_data_sources.sql
    - supabase/migrations/0004_companies_and_identity.sql
    - supabase/migrations/0005_funding_investors_persons.sql
    - supabase/migrations/0006_company_facts_and_news.sql
    - supabase/migrations/0007_user_scoped_tables.sql
    - supabase/migrations/0008_audit_log.sql
    - supabase/migrations/0009_staging_schema.sql
    - supabase/migrations/0010_indexes_and_tsvector.sql
    - supabase/migrations/0011_helper_functions.sql
  modified:
    - .gitignore

key-decisions:
  - "Migration order — 0003_data_sources.sql runs before any fact-bearing table so source_id FK compiles on first apply"
  - "Currency triple CHECK constraints explicitly named (chk_amount_triple, chk_valuation_triple, chk_ri_amount_triple, chk_fact_amount_triple) so Plan 03 verifiers and future audits can assert presence by name"
  - "Soft-delete indexes partial (WHERE deleted_at IS NULL) to keep hot-path reads fast without UNIQUE-constraint interference"
  - "Seed manual-curation data_sources UUID 00000000-0000-0000-0000-000000000001 reserved Day 1 so Phase 2 seed data has a stable source_id target"
  - "Audit log not partitioned yet — single table + (occurred_at DESC) + (entity_schema, entity_table, entity_id) indexes; partitioning threshold documented in comment per D-03.4"
  - "custom_access_token_hook EXECUTE revoked from authenticated/anon/public; only granted to supabase_auth_admin — prevents client-side role spoofing (T-01-02-01 mitigation)"

patterns-established:
  - "Migration numbering: 4-digit zero-padded sequential (0001_...sql through 0011_...sql). Plan 03 continues at 0012."
  - "SQL style: public.-prefixed schema, snake_case tables/columns, NOT NULL + DEFAULT NOW() on created_at/updated_at/last_verified_at, partial indexes on deleted_at"
  - "ENUM-first taxonomies live in 0002_enums.sql; open-ended TEXT fields (sector, sub_sector) get promoted to taxonomy tables in Phase 3 when facets stabilize"
  - "Trigger functions authored in the migration that creates the table they operate on (or adjacent) — Plan 03 only attaches CREATE TRIGGER statements per table"

requirements-completed: [FOUND-06, FOUND-09, FOUND-14, TRUST-01, TRUST-02, TRUST-03]

duration: 5min
completed: 2026-04-20
---

# Phase 01 / Plan 02: Canonical Schema Migrations Summary

**11 sequential SQL migrations authoring the complete Phase 1 schema — 13 canonical tables + user-scoped tables + empty staging schema + 10 Postgres ENUMs + currency-triple CHECK constraints + per-fact source_id provenance + last_verified_at freshness + soft-delete + append-only audit_log trigger function + GIN/trigram/tsvector index seeds + helper functions (format_krw, fn_handle_new_user, custom_access_token_hook).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-20T06:36Z (supabase init)
- **Completed:** 2026-04-20T06:41Z (Task 3 commit 7f6bf6f)
- **Tasks:** 3
- **Files created:** 13 (config.toml + .gitignore + 11 migrations)
- **Total SQL LOC:** 557

## Accomplishments

- **13 canonical tables authored** per FOUND-06: companies, aliases, company_identifiers, company_relations, funding_rounds, investors, round_investors, persons, person_roles, data_sources, company_facts, audit_log, news_mentions
- **TRUST-01 per-fact provenance enforced at DB level** — `source_id UUID NOT NULL REFERENCES public.data_sources(id)` on every fact-bearing canonical table (11 occurrences across migrations 0004–0006)
- **TRUST-02 freshness marker** — `last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` distinct from `updated_at` on all 12 canonical/root-provenance tables
- **FOUND-14 currency triple invariant** enforced via 4 `chk_*_triple` CHECK constraints on funding_rounds (2), round_investors (1), company_facts (1)
- **FOUND-09 audit trail** — append-only `audit_log` table + `fn_audit_log_write()` SECURITY DEFINER trigger function ready for Plan 03 to attach per canonical table
- **D-03.7 staging schema** — empty schema created with `REVOKE ALL ... FROM PUBLIC` so Phase 4a ETL can land tables without schema-creation privileges
- **D-03.2 user-scoped tables Day 1** — profiles + watchlists + saved_searches + submissions + dsar_requests so Phase 4c ships features without a schema migration wave
- **D-03.10 soft-delete** — `deleted_at TIMESTAMPTZ` on every canonical table with partial indexes `WHERE deleted_at IS NULL`
- **PITFALLS #9 index seeds** — pg_trgm GIN on companies.display_name_ko/en + aliases.alias, plus GENERATED STORED tsvector on companies for Phase 3 search
- **D-03.3 JWT role injection** — `custom_access_token_hook(JSONB)` with `GRANT EXECUTE ... TO supabase_auth_admin` + `REVOKE ... FROM authenticated, anon, public`; JWT claims readable by RLS via `(auth.jwt() ->> 'user_role')` in Plan 03

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-executor convention):

1. **Task 1: Initialize Supabase CLI + extensions + ENUMs + data_sources root** — `015eda2` (chore)
2. **Task 2: Canonical tables — companies, identity, funding, investors, persons, facts, news** — `fc42f98` (feat)
3. **Task 3: User-scoped tables + audit_log + staging + indexes + helpers** — `7f6bf6f` (feat)

_Plan metadata commit (this SUMMARY) follows._

## Canonical Table Inventory (13 confirmed per FOUND-06)

| # | Table | Migration | source_id FK | last_verified_at | deleted_at | Notes |
|---|-------|-----------|:------------:|:----------------:|:----------:|-------|
| 1 | `public.data_sources` | 0003 | (root) | yes | yes | Provenance root; seed UUID reserved |
| 2 | `public.companies` | 0004 | yes | yes | yes | Identity core; region CHAR(2) default 'KR' |
| 3 | `public.aliases` | 0004 | yes | yes | yes | UNIQUE (company_id, alias, alias_type) |
| 4 | `public.company_identifiers` | 0004 | yes | yes | yes | UNIQUE (kind, value) — no duplicate 사업자번호 |
| 5 | `public.company_relations` | 0004 | yes | yes | yes | CHECK parent_id <> child_id |
| 6 | `public.investors` | 0005 | yes | yes | yes | country CHAR(2) default 'KR' |
| 7 | `public.funding_rounds` | 0005 | yes | yes | yes | 2x currency triple + CHECKs |
| 8 | `public.round_investors` | 0005 | yes | yes | yes | PK (round_id, investor_id), currency triple + CHECK |
| 9 | `public.persons` | 0005 | yes | yes | yes | PII-minimal per PITFALLS #7 |
| 10 | `public.person_roles` | 0005 | yes | yes | yes | Started/ended_at for retention trigger in Phase 4a |
| 11 | `public.company_facts` | 0006 | yes | yes | yes | Currency triple + CHECK; partitioning deferred (D-03.5) |
| 12 | `public.news_mentions` | 0006 | yes | yes | yes | UNIQUE url for dedupe |
| 13 | `public.audit_log` | 0008 | — | — | — | Append-only (no soft-delete / no provenance FK by design) |

**source_id FK count:** 11 (data_sources is the root; audit_log is append-only append and carries its own provenance through the `source` column + actor_id).
**last_verified_at count:** 12 (all canonical + data_sources root).
**deleted_at count:** 12 (all canonical + data_sources root).

## Currency Triple Invariant Enforcement

Per FOUND-14 and PITFALLS #5, every monetary column is stored as the triple `(amount_minor BIGINT, currency_code CHAR(3), original_text TEXT)` with a named CHECK constraint enforcing all-null-or-all-present:

| Constraint | Table | Columns |
|------------|-------|---------|
| `chk_amount_triple` | funding_rounds | (amount_minor, currency_code) |
| `chk_valuation_triple` | funding_rounds | (post_money_valuation_minor, post_money_valuation_currency_code) |
| `chk_ri_amount_triple` | round_investors | (amount_minor, currency_code) |
| `chk_fact_amount_triple` | company_facts | (amount_minor, currency_code) |

`format_krw(BIGINT)` SQL helper (0011) renders 원-minor to Korean display string (조/억/만원). ETL writes `amount_minor` in 원 (not 억원/만원) and `currency_code` as ISO 4217 3-letter codes.

## User-Scoped + Compliance Tables

- **profiles** — 1:1 with `auth.users`, `role public.user_role NOT NULL DEFAULT 'user'` (D-03.3). Auto-populated via `on_auth_user_created` AFTER INSERT trigger on `auth.users`.
- **user_watchlists + user_watchlist_companies** — Phase 4c feature target, schema ready Day 1 (D-03.2).
- **user_saved_searches** — Phase 4c feature target.
- **user_submissions** — Phase 5 feature target; anonymous submissions allowed (user_id nullable, ON DELETE SET NULL).
- **dsar_requests** — FOUND-12 / D-04.3. Email verification token gates `status` transition; admin processes via Supabase Studio. SLA documented in table COMMENT.

## Decisions Made

- **Migration order — data_sources before fact-bearing tables.** `0003_data_sources.sql` creates the provenance root first so every downstream `source_id UUID NOT NULL REFERENCES public.data_sources(id)` compiles on first apply. This is non-obvious and intentional.
- **CHECK constraints explicitly named.** `chk_amount_triple`, `chk_valuation_triple`, `chk_ri_amount_triple`, `chk_fact_amount_triple` — so Plan 03 verifiers and future audits can assert presence by name (the plan's `<verification>` block queries constraint names).
- **Partial indexes on `deleted_at IS NULL`.** Keeps hot-path reads fast and ensures unique constraints like aliases(company_id, alias, alias_type) don't accidentally collide with soft-deleted rows.
- **Seed manual-curation source UUID.** `00000000-0000-0000-0000-000000000001` inserted in 0003 so Phase 2 seed data can reference a stable `source_id` without a separate bootstrap step.
- **Audit log not yet partitioned.** Per D-03.4, single table with `(occurred_at DESC)` + `(entity_schema, entity_table, entity_id)` indexes. Partitioning retrofit trigger documented (10M row threshold).
- **`custom_access_token_hook` locked down.** `GRANT EXECUTE` only to `supabase_auth_admin`, `REVOKE` from `authenticated/anon/public`. Mitigates T-01-02-01 (client-side role spoofing).

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks' automated verification blocks passed on the first run; plan-level aggregate checks (`source_id` count >= 11, `last_verified_at` count >= 11, `deleted_at` count >= 11, currency triple CHECKs >= 3) all passed with margin.

## Issues Encountered

None. `supabase init` completed cleanly. The local Supabase CLI was invoked via `npx supabase` (v2.92.1) since no global install is present — this is an acceptable DX baseline (documented for Plan 08 where `supabase link` / `supabase db push` will run).

## Threat Flags

None — this plan authors migration files only (no schema push). All threat-model entries (T-01-02-01 through T-01-02-10) are mitigated at the design level; actual enforcement via RLS + trigger attach + endpoint wiring lives in Plans 03/06/07.

## Known Stubs

None. These are SQL migration files only; no TypeScript/UI stubs exist that could render placeholder data.

## User Setup Required

None for Plan 02 — this plan authors SQL files only. Actual `supabase db push` to the remote project is owned by Plan 08 (schema_push_requirement).

## Next Phase Readiness

- **Plan 03 (RLS + audit triggers)** — ready to consume. 11 canonical tables + `audit_log` + `fn_audit_log_write()` + `fn_touch_updated_at()` + `custom_access_token_hook()` all exist. Plan 03 will (a) `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, (b) attach CREATE POLICY per anon-read/service-role-write and user-scoped `auth.uid()` patterns, (c) `CREATE TRIGGER` for audit + updated_at on each canonical table.
- **Plan 06 (PIPA / DSAR endpoint)** — `dsar_requests` schema ready; token flow + email challenge wiring remains.
- **Plan 08 (schema push)** — 11 migrations in lexical order ready for `supabase db push`. No cross-file ordering hazards.
- **Phase 2 (seed data)** — `data_sources` seed UUID `00000000-0000-0000-0000-000000000001` available as `source_id` target for manual-curation rows.
- **Phase 3 (search)** — `search_tsv TSVECTOR GENERATED ALWAYS AS ... STORED` column + GIN index + trigram indexes seeded; Phase 3 only needs to switch the `to_tsvector('simple', ...)` config to the app-side morpheme token column once the Korean tokenizer is selected.
- **Phase 4a (ETL)** — `staging` schema created empty with PUBLIC revoked. ETL Python worker can `CREATE TABLE staging.*` without schema-creation privilege.

## Self-Check: PASSED

**Files verified on disk:**
- FOUND: supabase/config.toml
- FOUND: supabase/.gitignore
- FOUND: supabase/migrations/0001_extensions.sql
- FOUND: supabase/migrations/0002_enums.sql
- FOUND: supabase/migrations/0003_data_sources.sql
- FOUND: supabase/migrations/0004_companies_and_identity.sql
- FOUND: supabase/migrations/0005_funding_investors_persons.sql
- FOUND: supabase/migrations/0006_company_facts_and_news.sql
- FOUND: supabase/migrations/0007_user_scoped_tables.sql
- FOUND: supabase/migrations/0008_audit_log.sql
- FOUND: supabase/migrations/0009_staging_schema.sql
- FOUND: supabase/migrations/0010_indexes_and_tsvector.sql
- FOUND: supabase/migrations/0011_helper_functions.sql

**Commits verified in git log:**
- FOUND: 015eda2 chore(01-02): init Supabase CLI + extensions + ENUMs + data_sources root
- FOUND: fc42f98 feat(01-02): canonical tables (companies, funding, investors, persons, facts, news)
- FOUND: 7f6bf6f feat(01-02): user-scoped tables + audit_log + staging + indexes + helpers

---
*Phase: 01-foundation-compliance-baseline*
*Completed: 2026-04-20*
