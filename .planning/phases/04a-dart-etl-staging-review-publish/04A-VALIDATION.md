---
phase: 04a
slug: dart-etl-staging-review-publish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 04a — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | Python: pytest 8.x (etl/tests/) · JS: vitest 4.x (tests/) · SQL: plain pytest fixtures against Supabase local or staging test DB |
| **Config file** | etl/pyproject.toml (pytest config) + vitest.config.ts |
| **Quick run command** | `cd etl && uv run pytest -q` + `npx vitest run tests/unit` |
| **Full suite command** | `cd etl && uv run pytest && cd - && npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~60 seconds unit (Python+JS+tsc) |

---

## Sampling Rate

- **After every task commit:** `cd etl && uv run pytest -q` (if etl/ touched) OR `npx vitest run tests/unit` (if src/ touched)
- **After every plan wave:** Full suite + typecheck + a smoke run of bootstrap_corp_codes.py (Wave 0) or daily cron workflow_dispatch (Wave 4)
- **Before `/gsd-verify-work`:** Full suite green + manual DART sandbox run against 1 company (토스) + admin-ui stub publish() integration test
- **Max feedback latency:** 60 seconds (unit), ~5 min (smoke)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | pending |

(To be filled by gsd-planner — every task requires at least 1 automated check.)

---

## Goal-Backward Verification (≥95% match rate)

Phase 4a's binding success criterion is: ≥95% of seeded **외감** companies successfully reconcile via corp_code → company_id. This is the key acceptance gate:

- **Metric**: `SELECT count(*) FROM staging.financial_statements WHERE matched_company_id IS NOT NULL / count(*) all rows in latest ETL run`
- **Target**: ≥ 0.95 (of 외감-eligible rows)
- **Test location**: `etl/tests/test_match_rate.py`
- **Failure → auto-block phase completion** (planner must wire this assertion into the verify() gate)

---

## External-System Validation

Tests that hit live external systems (DART API, Supabase DB) are auto-skipped when API keys are missing — not hard-fail. Log skip reason to console.

| System | Required Env | Skip Behavior |
|--------|--------------|---------------|
| DART Open API | `DART_API_KEY` | Skip DART live tests; run mocked-response tests only |
| Supabase staging DB | `DATABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Skip DB integration tests; run pure-python unit tests only |
| Fly.io | `FLY_API_TOKEN` | Skip deploy smoke; run Dockerfile lint only |
