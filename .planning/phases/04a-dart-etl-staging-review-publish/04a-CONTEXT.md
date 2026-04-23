# Phase 4a: DART ETL + Staging→Review→Publish - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning
**Goal from ROADMAP:** A scheduled GitHub Actions cron (daily 02:00 KST) invokes a Fly.io Python 3.12 worker that pulls DART financial statements + executive info + disclosure events into `staging.*`, reconciles identities, and stages rows for Phase 4b admin approval before promoting via `publish()` with atomic canonical upsert + audit_log + `revalidateTag` webhook.

<domain>
## Phase Boundary

**In scope (Phase 4a):**
- Python 3.12 ETL service on Fly.io (separate service from the Next.js app)
- GitHub Actions daily cron at 02:00 KST triggering the Fly.io worker via HTTP
- DART Open API integration via OpenDartReader — 연간 사업보고서 (revenue / 영업이익 / 자산 / 부채) + 임원 정보 + 주요 수시공시(증자/감자/임원 변경)
- `staging.*` tables: `staging.financial_statements`, `staging.executives`, `staging.disclosures`, `staging.etl_review_queue`
- `public.company_identifiers(kind=dart_corp_code)` bootstrap for Phase 2 외감-대상 seed companies (Wave 0)
- Identity matching via `corp_code → company_identifiers → company_id` with manual-review queue for unmatched rows
- `publish()` Postgres function — atomic staging → canonical upsert + `data_sources` provenance row + `audit_log` entry
- `revalidateTag(company:${id})` webhook call from Next.js on publish
- Sentry integration (Python SDK) for error logging
- CI grep check enforcing `thevc.kr` source-code ban (DATA-11)
- ETL smoke tests against a pinned corp_code list in `tests/etl/`

**Out of scope (other phases):**
- Admin curation UI (`/admin/curation` review queue, diff view, approve/reject) — **Phase 4b**
- VC portfolio page scraping (Altos, IMM, Kakao Ventures etc.) — **Phase 5** (DATA-05)
- Press-release / tech-media RSS ingestion — **Phase 7** (DATA-06)
- 분기/반기보고서 parsing — deferred to post-launch (daily cadence for 연간 보고서 is sufficient v1 cadence; quarterly cadence adds 3× ETL complexity for marginal freshness gain in Phase 4a)
- 비외감 (non-external-audit) companies — DART has no structured data for them; covered by manual curation in Phase 4b
- User-submission flow (공개 제보 폼) — Phase 5 (DATA-07, TRUST-08)
- Watchlist alert emails when publish fires — Phase 7 (USER-05)

</domain>

<decisions>
## Implementation Decisions

### Identity Matching (D-01 — **user decision, locked**)

- **D-01.1 — corp_code direct match is the primary path.** ETL pulls DART rows by `corp_code`; matches to `company_id` via `public.company_identifiers(kind='dart_corp_code', value=corp_code)` lookup. This is O(1), deterministic, zero false matches.
- **D-01.2 — Unmatched or ambiguous rows go to `staging.etl_review_queue`, NEVER to canonical.** No fuzzy fallback in Phase 4a ETL. Phase 4b admin UI will surface the queue. This makes false-match impossible at the cost of some legitimate-but-unmapped rows sitting in queue until admin maps them.
- **D-01.3 — Wave 0 bootstrap task**: `etl/bootstrap_corp_codes.py` — uses DART 명칭 검색 API (or OpenDartReader's `OpenDartReader().find_corp_code(name)`) to resolve `corp_code` for each of the Phase 2 외감-대상 seed companies, then writes `company_identifiers(kind='dart_corp_code', value=corp_code, source_id=manual_curation_source)` rows. Bootstrap must complete successfully before the main ETL can be scheduled. Idempotent — re-running is safe.

### DART Coverage Scope (D-02 — **user decision, locked**)

- **D-02.1 — First-scope reports**: (a) 연간 사업보고서 (annual business report) for revenue / 영업이익 / 자산 / 부채, (b) executive roster via `임원 및 직원` section, (c) 주요 단일보고서 (증자/감자/임원 변경/합병 등) via DART 공시검색 API filtered to the seeded corp_codes.
- **D-02.2 — Seed validation set**: Phase 2's **외감 대상 companies only** (estimated 8–10 of 15 seeded). Non-외감 companies are explicitly skipped with log entry `{skip_reason: 'non_external_audit'}`. The ≥95% matching success criterion is measured against the 외감 subset, NOT all 15 seeds. Documented in SUMMARY at Phase 4a completion.
- **D-02.3 — 분기/반기보고서 deferred**: 4a ships 연간 only. Quarterly/semi-annual ingestion is a Phase 4a.1 (if needed) or folded into LAUNCH scope.
- **D-02.4 — 수시공시 filter**: limit to specific report types (증자, 감자, 임원변경, 합병분할, 해산) — not a firehose. Other disclosure types ignored in Phase 4a.

### ETL Cadence & Execution Strategy (D-03 — **user decision, locked**)

- **D-03.1 — Full sweep daily, not delta**: daily 02:00 KST cron runs the full bootstrap-resolved corp_code list. Idempotent upsert ensures 대부분의 날은 no-op. This simplifies ETL code + avoids last_verified_at edge cases. Future Phase 8 may switch to delta if DART rate limits become a concern.
- **D-03.2 — DART API rate limits**: DART Open API allows 20,000 calls/day per API key — zero concern for Phase 4a scale (10 companies × 3-5 report types = ≤50 calls/day). No backoff logic needed in v1.
- **D-03.3 — Cron trigger path**: GitHub Actions workflow at `.github/workflows/etl-daily.yml` on schedule `0 17 * * *` (UTC 17:00 = KST 02:00). Triggers a `POST /run` on the Fly.io worker's HTTP endpoint with a shared secret. Fly VM wakes on demand (scale-to-zero), runs the ETL synchronously, returns 200 + result summary, then idles back to zero. **Fly.io worker stays auto-scaled to 0 when idle** — cost stays at ~$0/mo within the free tier.
- **D-03.4 — Timeout**: GitHub Actions job timeout = 30 min (ETL should complete in < 2 min for Phase 4a scale). Fly-side timeout = same.

### Repo & Deployment Layout (D-04 — **Claude's Discretion**)

- **D-04.1 — Monorepo, `etl/` subdirectory**: ETL Python service lives at `etl/` at the repo root. Shared: reads `supabase/migrations/` for schema truth (via SQL), imports nothing from `src/`. Shared DB credentials via `.env.local` + Fly.io secrets. Dockerfile + `fly.toml` at `etl/` root.
- **D-04.2 — PR flow**: ETL changes can be reviewed in the same PR as Next.js code. CI job runs `pytest etl/tests` + `ruff check etl/` on any PR touching `etl/**`. Fly deploy on main branch merge via GitHub Actions.
- **D-04.3 — Python dependency management**: `uv` (fast Python package manager) for lockfile. `etl/pyproject.toml` + `etl/uv.lock`. This avoids pip-tools / poetry complexity. Researcher confirms current (2026-04) best practice.
- **D-04.4 — Deps (pinned versions researcher confirms)**: `OpenDartReader`, `httpx`, `supabase-py` (for Supabase service-role writes), `sentry-sdk[fastapi]`, `apscheduler` (in-process scheduler NOT used — GH Actions is the scheduler of truth), `fastapi` + `uvicorn` (HTTP endpoint for GH Actions to trigger), `pytest`.

### Staging Table Design (D-05 — **Claude's Discretion**)

- **D-05.1 — Entity-typed staging tables (not raw JSON only)**: each DART entity type maps to a typed staging table. Raw JSON payload stored alongside as `raw_payload jsonb` column for re-parseability. This balances type safety (publish() logic stays simple) with schema evolution freedom.
  - `staging.financial_statements(corp_code, fiscal_year, fiscal_period, revenue_minor, operating_income_minor, total_assets_minor, total_liabilities_minor, currency_code='KRW', original_text, raw_payload, source_url, fetched_at, PRIMARY KEY (corp_code, fiscal_year, fiscal_period))`
  - `staging.executives(corp_code, exec_name, position, appointed_date, is_current, raw_payload, fetched_at, PRIMARY KEY (corp_code, exec_name, position, appointed_date))`
  - `staging.disclosures(corp_code, disclosure_id, disclosure_type, disclosure_date, title, raw_payload, fetched_at, PRIMARY KEY (corp_code, disclosure_id))`
  - `staging.etl_review_queue(id, corp_code, reason, first_seen_at, raw_payload, resolved_at, resolved_by)`
- **D-05.2 — RLS**: all `staging.*` tables accessible only by `service_role`. No anon / authenticated access. Continues Phase 1 D-03.7 baseline.
- **D-05.3 — currency triple**: monetary columns use `{amount}_minor BIGINT` + `currency_code CHAR(3)` + `original_text TEXT` per Phase 1 D-03.8. KRW-only in Phase 4a.

### Publish() Semantics (D-06 — **Claude's Discretion**)

- **D-06.1 — `publish()` is a Postgres function (not app-layer code)**: lives in a new migration, SQL-level. Takes `(staging_corp_code TEXT)` argument, runs in a single transaction: (1) copy staging row(s) to canonical with upsert, (2) insert `data_sources` row(s) with provenance, (3) append `audit_log` row for each canonical upsert, (4) update `last_verified_at`. On success returns a list of affected company_ids. On failure rolls back the transaction.
- **D-06.2 — publish() invoked from admin UI (Phase 4b)**, NOT from the ETL worker. Phase 4a only proves `publish()` works end-to-end via an integration test. ETL only lands rows in staging.
- **D-06.3 — Cache invalidation webhook**: publish() writes a `cache_invalidation_events` row; a small Next.js cron Route Handler (`/api/cache/drain`) polls that table and calls `revalidateTag(company:${id})` for each. Poll cadence = per minute (Vercel Cron free tier minimum). Clean async boundary — DB doesn't need to call out to HTTP.
- **D-06.4 — Atomicity**: single-company publish is transactional. Batch publish (Phase 4b bulk approve) is per-company transactional — partial success is allowed and reported.

### Observability & Safety (D-07 — **Claude's Discretion**)

- **D-07.1 — Sentry Python SDK** wired into FastAPI app — every uncaught exception + explicit `sentry_sdk.capture_exception` for DART API errors with `corp_code` + `report_type` tags. DSN from Fly secret.
- **D-07.2 — Run log**: each cron run writes a row to `public.etl_runs(id, started_at, finished_at, status, processed_count, new_count, updated_count, skipped_count, error_count, corp_codes text[])`. Surfaces in `/admin/etl` stub.
- **D-07.3 — CI grep ban on `thevc.kr`**: GitHub Actions workflow step `grep -r "thevc\.kr" .` — exit 1 if any match outside `.planning/` or node_modules. Implements DATA-11 + goal success-criterion #5.
- **D-07.4 — Secrets handling**: DART API key, Supabase service-role key, Sentry DSN all stored as Fly.io secrets + GitHub Actions repository secrets. Never checked into repo. `.env.example` lists key names.

### Validation & Testing (D-08 — **Claude's Discretion** + Nyquist)

- **D-08.1 — Unit tests**: Python `pytest` suite for (a) corp_code resolver (mocked DART), (b) staging upsert idempotency (real Supabase test DB), (c) publish() SQL function (pgtap or plain SQL fixtures), (d) ≥95% match rate assertion against pinned 외감 seed list.
- **D-08.2 — Smoke test**: `tests/etl/test_phase4a_e2e.py` — end-to-end against one canonical company (토스) — bootstrap → daily run → verify staging row appears with expected fields.
- **D-08.3 — Load test is OUT OF SCOPE**: Phase 4a scale (≤10 companies) is tiny. Scale testing = Phase 8 LAUNCH-03 concern.

### Documentation (D-09 — **Claude's Discretion**)

- **D-09.1 — `etl/README.md`**: local dev setup (uv + Supabase local + DART API key), architecture overview, how to add a new corp_code, how to manually trigger a run.
- **D-09.2 — Update `/ko/sources` (Phase 1 D-06.2 stub)**: change "DART Open API (Phase 4a 연동 예정)" → live entry with last ETL run timestamp from `etl_runs` table.

</decisions>

<deferred>
## Deferred Ideas (not this phase)

- 분기/반기보고서 parsing (quarterly/semi-annual DART reports) — higher cadence freshness, covered by Phase 4a.1 or scaled-up phase.
- Delta-sweep ETL (only changed companies) — Phase 8 LAUNCH perf concern.
- Multi-region Fly.io deployment — 1 region (Tokyo/nrt) fine for v1.
- ETL webhook for real-time DART notifications — DART doesn't offer push; polling is the only option.
- Admin UI approve/reject review queue — **Phase 4b**.
- thevc.kr scraping — permanent out-of-scope (DATA-11 / ToS violation).
- Fuzzy-match identity reconciliation — explicitly excluded (D-01.2); manual-review-only is the policy.
- USD financial figures / FX conversion — KRW-only in v1; companies with USD reports get their original_text preserved but amount_minor in KRW via DART's canonical data.

</deferred>

<specifics>
## User-Specific References

- **User-locked decisions (D-01, D-02, D-03)** come from the /gsd-discuss-phase 4a interview 2026-04-23. The user explicitly chose corp_code-direct + manual-review-only + Wave-0 bootstrap + 연간 보고서 + 외감-only seed + full-sweep daily cadence. These are NOT Claude's Discretion — downstream agents must honor them.
- `/ko/sources` (Phase 1 D-06.2) is the user-visible provenance page; it names "DART Open API" as a source and must reflect reality once 4a lands.
- CLAUDE.md Technology Stack explicitly lists `Python 3.12 + OpenDartReader + Fly.io + GitHub Actions cron` — no deviation allowed.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md` — vision, constraints (Python 3.12, Fly.io, OpenDartReader)
- `.planning/REQUIREMENTS.md` — DATA-01..04, DATA-08..11 (this phase's requirement IDs)
- `.planning/ROADMAP.md` — Phase 4a goal + success criteria
- `.planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md` — D-03.6 (data_sources), D-03.7 (staging schema from Day 1), D-03.8 (currency triple), D-03.9 (last_verified_at), D-03.10 (soft-delete), D-06.2 (/ko/sources stub)
- `.planning/phases/02-read-only-profiles-manual-seed/02-CONTEXT.md` — Phase 2 seed list + 외감 subset
- `supabase/migrations/0009_staging_schema.sql` — staging schema grants baseline
- `supabase/migrations/0008_audit_log.sql` — audit_log table schema
- `supabase/migrations/0014_audit_triggers.sql` — existing audit trigger pattern to follow
- `src/lib/db/schema/companies.ts` — `company_identifiers` table + `identifierKind` enum with `dart_corp_code` / `business_registration_number`
- `src/lib/db/schema/data-sources.ts` — provenance row shape
- `CLAUDE.md` — Technology Stack section (Python + OpenDartReader + Fly.io + GitHub Actions + Drizzle)
- `scripts/seed/companies/` — Phase 2 seed script patterns (for Wave 0 bootstrap reference)

</canonical_refs>

---

**Ready for planning:** All 3 user-selected gray areas (B, E, G) answered and locked. Remaining 4 areas (A/C/D/F) covered as Claude's Discretion with explicit recommended defaults that researcher + planner can refine. Downstream agents have enough to produce a detailed Wave-structured plan.
