---
phase: 01-foundation-compliance-baseline
plan: 08
subsystem: deploy
tags: [smoke-test, deploy-checklist, vitest, supabase-cli, vercel, github-actions]

# Dependency graph
requires:
  - phase: 01-foundation-compliance-baseline
    provides: "Plans 02 + 03 — 15 migrations (0001-0015) ready to push to remote Supabase"
  - phase: 01-foundation-compliance-baseline
    provides: "Plans 04 + 05 + 06 + 07 — runtime code (auth, public UI, DSAR, observability) shipped"
provides:
  - "tests/smoke/phase1-success-criteria.test.ts — 18 assertions across 5 describe blocks covering Phase 1 success criteria 1-5"
  - "tests/smoke/README.md — invocation pattern + skip matrix + per-criterion failure triage"
  - "package.json `test:smoke` npm script (graceful no-op when BASE_URL unset)"
  - "docs/deploy/PHASE1_DEPLOY_CHECKLIST.md — 384-line consolidated deploy runbook merging Plan 06/07/08 deferred items"
affects:
  - "User: actionable single-source-of-truth runbook for the live deploy session (Supabase project provisioning → migrations push → Vercel project + env vars → GitHub Actions secrets → DSAR Resend domain → Sentry project + DSN → smoke test execution)"
  - "Phase 8 LAUNCH-01: deploy checklist already drafted; only needs final domain/branding pass before public launch"
  - "CI: `npm run test:smoke` is safe to call from CI without BASE_URL (skips, exits 0) — can be wired into a future post-deploy GitHub Action"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Skip-aware smoke test pattern: `isValidBase()` helper validates `process.env.BASE_URL` (http/https + new URL() parse) before any test runs; missing or malformed → graceful 0-exit skip"
    - "Lazy Supabase client init inside `beforeAll` (not module top-level) so empty env vars never throw at evaluation time — mirrors tests/rls/rls.test.ts pattern"

key-files:
  created:
    - "tests/smoke/phase1-success-criteria.test.ts — Phase 1 success criteria E2E smoke suite"
    - "tests/smoke/README.md — invocation guide + skip behavior table + criterion-to-failure-mode triage"
    - "docs/deploy/PHASE1_DEPLOY_CHECKLIST.md — Sections 0-9 + Appendix A/B; consolidates ALL deferred work from Plans 06/07/08 in one runbook"
  modified:
    - "package.json — added `test:smoke` script"

key-decisions:
  - "Tasks 1, 2, 4 deferred to user-driven post-execution (no Supabase project, no Vercel project, no live env vars at execution time)"
  - "Task 3 + deploy runbook shipped autonomously — both are pure code/docs that ship value immediately and de-risk the eventual deploy session"
  - "Smoke test suite is graceful no-op without BASE_URL — `npm run test:smoke` is safe to call in any environment (CI, local, post-deploy) without configuration overhead"
  - "Deploy checklist is the single source of truth for resuming Phase 1 deploy — consolidates Plan 06 Resend setup, Plan 07 Sentry/Vercel/GitHub setup, Plan 08 Supabase push + Vercel deploy + smoke run"

patterns-established:
  - "Skippable E2E smoke suite: validate BASE_URL upfront with `isValidBase()`, lazy-init clients in beforeAll, prefer test.skipIf over conditional describe so vitest reporting shows skip count"
  - "Single-runbook deploy doc: one markdown consolidating env vars, CLI commands, dashboard configs, and verification steps — beats scattered per-plan SUMMARYs at deploy time"

requirements-completed: []

# Metrics
duration: ~33min (Task 3 code + deploy checklist by gsd-executor a5b33cd310da695e0)
completed: 2026-04-21
---

# Plan 01-08: Deploy Summary

**Smoke test suite + comprehensive deploy runbook shipped — live `supabase db push`, Vercel deploy, and smoke verification deferred to user-driven deploy session.**

## Performance

- **Duration:** ~33 min (Task 3 + deploy checklist inside one executor agent)
- **Started:** 2026-04-21
- **Completed:** 2026-04-21 (Tasks 1, 2, 4 deferred — see below)
- **Tasks:** 1/4 executed (Task 3); 3/4 deferred (Tasks 1, 2, 4)
- **Files modified:** 3 created, 1 modified

## Accomplishments

- Phase 1 success criteria smoke suite ready for one-command verification once deployed (`BASE_URL=https://... npm run test:smoke`)
- Single-runbook deploy checklist (`docs/deploy/PHASE1_DEPLOY_CHECKLIST.md`) consolidates Plan 06/07/08 deferred items so the user has ONE document to follow during deploy
- 2 auto-fixes applied (lazy client init pattern, BASE_URL validation) — see Auto-fix Log
- `npm run test:smoke` proven safe in unconfigured environments (skips cleanly, exits 0)

## Task Commits

1. **Task 1: [BLOCKING] supabase db push** — **DEFERRED** (no Supabase project linked)
2. **Task 2: [CHECKPOINT] Vercel deploy** — **DEFERRED** (no Vercel project)
3. **Task 3: Smoke test suite (5 success criteria)** — `46f6f46`
4. **Task 4: [CHECKPOINT] Run smoke tests against prod + Sentry/heartbeat verify** — **DEFERRED** (depends on Tasks 1-2)

**Plan metadata:** `c2fe614` (deploy runbook), _(this commit)_ (`docs(01-08): plan SUMMARY with deferred Tasks 1/2/4`)

## Auto-fix Log

| # | Rule | Issue | Fix |
|---|------|-------|-----|
| 1 | Bug (1) | `createClient(supabaseUrl, ...)` at module top-level threw immediately when env vars empty → criterion #2/#3 suite failed before vitest could skip | Wrapped in `let anon: SupabaseClient` + `beforeAll(() => { anon = createClient(...) })` — mirrors rls.test.ts pattern |
| 2 | Bug (1) | npm script env propagation injected stray `BASE_URL='/'` → 11 tests fired with `Failed to parse URL from //` | Added `isValidBase()` helper enforcing http(s) protocol + `new URL()` parse before deciding `hasBaseUrl`. Result: 18/18 graceful skip → exit 0 |

## Files Created/Modified

### Created
- `tests/smoke/phase1-success-criteria.test.ts` — 5 describe blocks × 18 assertions
- `tests/smoke/README.md` — invocation + skip matrix + failure triage
- `docs/deploy/PHASE1_DEPLOY_CHECKLIST.md` — 384-line deploy runbook (Sections 0-9 + Appendix A/B)

### Modified
- `package.json` — added `test:smoke` npm script

## Verification Evidence (offline)

- `npx tsc --noEmit` → clean
- `npm run test:smoke` → `Test Files 1 skipped (1)` / `Tests 18 skipped (18)` → exit 0 (graceful no-op without BASE_URL)
- `TASK3_OK` grep marker present
- Deploy checklist completeness:
  - `supabase db push` referenced 3× (preflight, push, post-push verification)
  - RESEND_* env vars referenced 3×
  - HEARTBEAT_SECRET referenced 5× (.env.local + Vercel + GitHub secret + workflow + manual dispatch)
  - VERCEL_HEALTH_URL referenced 1× (GitHub Actions variable)
  - SENTRY_* env vars referenced 10× (DSN + auth token + org + project across .env.local + Vercel + smoke verification)

## Live Verification Evidence (online)

**NOT YET RUN** — see Deferred Work below. Tracked under Phase 1 `human_verification` items.

## Deferred Work — Tasks 1, 2, 4 (REQUIRED before Phase 1 closure)

User chose option `1` ("continue") at the Plan 08 decision gate on 2026-04-21: ship Task 3 code + deploy runbook now, defer the live deploy + smoke verification (Tasks 1, 2, 4) to a future user-driven session. The full Phase 1 codebase is shipped and `npx tsc --noEmit` + `npm run build` are green; only the live infra provisioning + verification remains.

**The runbook (`docs/deploy/PHASE1_DEPLOY_CHECKLIST.md`) is the authoritative checklist for completing the deferred work.** When the user is ready to deploy, follow it section-by-section. Below is a high-level inventory of what remains:

### Task 1 — Supabase push (BLOCKING per `must_haves.truths`)
- Create Supabase project at https://app.supabase.com
- Install + log in to Supabase CLI
- `supabase link --project-ref <REF>` (interactive — DB password prompt)
- `supabase db push --linked` to apply 15 migrations (0001-0015)
- `supabase gen types typescript --linked > src/lib/db/database.types.ts`
- Confirm canonical tables, RLS policies, audit triggers all live in Supabase Studio

### Task 2 — Vercel deploy (BLOCKING)
- Create Vercel project + link GitHub repo (Hobby plan free tier)
- Populate ALL env vars in Vercel Production + Preview:
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
  - App: `NEXT_PUBLIC_APP_URL` (= deployed URL)
  - Kakao flag: `NEXT_PUBLIC_KAKAO_ENABLED=false` (until Business app approved)
  - Resend (Plan 06): `RESEND_API_KEY`, `DSAR_FROM_EMAIL`, `DSAR_ADMIN_NOTIFY_EMAIL`, `DSAR_RATE_LIMIT_PER_HOUR=5`
  - Sentry (Plan 07): `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  - Heartbeat: `HEARTBEAT_SECRET` (generate via `openssl rand -hex 32`)
  - Revalidate (Phase 4a placeholder): `REVALIDATE_SECRET`
- `vercel deploy --prod`

### Task 4 — Live smoke + verification (BLOCKING)
- `BASE_URL=https://YOUR_PROJECT.vercel.app npm run test:smoke` → all 18 assertions green
- Visit `https://YOUR_PROJECT.vercel.app/ko/_debug/sentry-test` → click both buttons → confirm 2 events in Sentry dashboard (1 runtime + 1 server-action)
- GitHub Actions UI → "Free-tier Heartbeat" → "Run workflow" → green check + log shows `"dbReachable":true`
- Vercel Analytics dashboard shows pageview counts after a few visits

### Cross-Plan Deferred Items (also gated by deploy)
From Plan 06 SUMMARY:
- Resend account + sending domain DNS verification (SPF + DKIM + Return-Path)
- `privacy@YOUR_DOMAIN` forwarding alias setup (per `docs/compliance/CPO_FORWARDING_ALIAS.md`)
- `src/messages/ko.json` `privacy.cpoBody` literal `[도메인]` substitution
- Live DSAR submit + email verification + replay-prevention + rate-limit smoke test

From Plan 07 SUMMARY:
- Sentry account + Next.js project provisioning + DSN + Auth Token issuance
- GitHub Actions secret `HEARTBEAT_SECRET` + variable `VERCEL_HEALTH_URL`
- Live Sentry + heartbeat + Analytics verification (already covered in Task 4 above)

### Why Deferring Was Safe
- All runtime code is shipped — `npx tsc --noEmit` and `npm run build` both green
- All deferred items have ungrudging-graceful-degradation paths in code (Resend lazy-init, Sentry conditional load, smoke tests skip-aware)
- Build artifacts ready: 15 migrations + 7 build routes + 4 GitHub workflows + smoke suite + deploy runbook
- Single-source-of-truth runbook means no scattered hunting at deploy time

## Handoff to User-Driven Deploy Session

When the user is ready (Supabase MCP unblocked OR Supabase project ready):
1. Open `docs/deploy/PHASE1_DEPLOY_CHECKLIST.md`
2. Work through Sections 0 → 9 in order
3. After Section 9 passes (smoke tests green + Sentry events visible + heartbeat green), update this SUMMARY's "Live Verification Evidence" section
4. Re-run `node $HOME/.claude/get-shit-done/bin/gsd-tools.cjs phase complete 01` to mark Phase 1 fully closed (or run `/gsd-execute-phase 1 --gaps-only` if gap-closure plans are needed)

## Threat Model Status

No new threats introduced. Existing Plan 06/07 threat models still apply when their deferred items activate. The smoke test suite itself is read-only against deployed routes — no write, no PII, no security boundary crossing.
