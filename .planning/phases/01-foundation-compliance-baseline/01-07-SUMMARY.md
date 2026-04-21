---
phase: 01-foundation-compliance-baseline
plan: 07
subsystem: observability
tags: [sentry, vercel-analytics, speed-insights, heartbeat, storage-budget, pii-scrubbing, github-actions]

# Dependency graph
requires:
  - phase: 01-foundation-compliance-baseline
    provides: "Plan 01 next.config.ts + src/instrumentation.ts hook + [locale]/layout.tsx (Sentry wraps existing tree)"
  - phase: 01-foundation-compliance-baseline
    provides: "Plan 02 supabase migrations (storage-check & heartbeat queries assume schema exists)"
provides:
  - "Sentry SDK wired across client, server, edge runtimes with PII scrubbing (FOUND-13)"
  - "Vercel Analytics + Speed Insights injected in root layout (FOUND-13)"
  - "/api/health endpoint that touches Postgres (heartbeat keep-alive against Supabase 7-day pause — D-02.4)"
  - "/api/storage-check endpoint reporting DB size vs Supabase free-tier 500 MB ceiling"
  - ".github/workflows/heartbeat.yml — every 6 days against /api/health (D-02.4)"
  - ".github/workflows/storage-monitor.yml — daily storage-check, fail at 70% (PITFALLS #11)"
  - "src/app/[locale]/(public)/_debug/sentry-test/* — deliberate runtime + server-action error pages for Sentry verification (Phase 1 success criterion #5)"
  - "src/app/global-error.tsx — Next.js global error boundary that re-throws into Sentry (otherwise React render errors silently bypass Sentry)"
  - ".env.example entries: NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_TRACES_SAMPLE_RATE_(DEV|PROD), HEARTBEAT_SECRET"
affects:
  - "Plan 08 (deploy + smoke test): live Sentry + Analytics activate only when env vars are populated in Vercel; smoke test verifies the runtime + server-action error events arrive"
  - "Phase 4c (production hardening): adjust SENTRY_TRACES_SAMPLE_RATE_PROD if quota pressure observed; harden heartbeat secret rotation"
  - "Phase 8 (LAUNCH-01): _debug/sentry-test route should be removed or gated behind admin-only before public traffic"

# Tech tracking
tech-stack:
  added:
    - "@sentry/nextjs (v9.x line) — error tracking SDK with Next.js App Router integration"
    - "@vercel/analytics — pageview + custom event tracking"
    - "@vercel/speed-insights — Core Web Vitals reporting"
  patterns:
    - "Sentry init in src/instrumentation-client.ts (Turbopack-compatible) instead of legacy sentry.client.config.ts"
    - "PII defense in depth: sendDefaultPii: false + beforeSend custom scrubber + explicit delete on request.headers"
    - "global-error.tsx mandatory for Next.js App Router — without it React render errors bypass Sentry"
    - "Storage check + heartbeat run as Next API routes guarded by HEARTBEAT_SECRET — GitHub Actions cron invokes via Authorization: Bearer header"

key-files:
  created:
    - "sentry.client.config.ts (legacy stub — policy doc only; real init in instrumentation-client.ts)"
    - "sentry.server.config.ts — server runtime Sentry init"
    - "sentry.edge.config.ts — edge runtime Sentry init"
    - "src/instrumentation.ts — Next.js instrumentation hook bridging server/edge configs"
    - "src/instrumentation-client.ts — Turbopack-compatible client init + onRouterTransitionStart export"
    - "src/app/global-error.tsx — global error boundary calling Sentry.captureException"
    - "src/app/api/health/route.ts — Postgres-touching health endpoint"
    - "src/app/api/storage-check/route.ts — DB size endpoint, fails over 70% threshold"
    - "src/app/[locale]/(public)/_debug/sentry-test/page.tsx — runtime error trigger button"
    - "src/app/[locale]/(public)/_debug/sentry-test/actions.ts — server action error trigger"
    - ".github/workflows/heartbeat.yml — */6d cron against /api/health"
    - ".github/workflows/storage-monitor.yml — daily storage-check"
  modified:
    - "next.config.ts — withSentryConfig wrapper + tunnel route /monitoring"
    - "src/app/[locale]/layout.tsx — <Analytics /> + <SpeedInsights /> injected"
    - "src/middleware.ts — added /api/storage-check + /monitoring exceptions to matcher (Sentry tunnel + storage check would otherwise hit i18n routing)"
    - ".env.example — Sentry + heartbeat env vars"
    - "package.json + package-lock.json — added @sentry/nextjs, @vercel/analytics, @vercel/speed-insights"

key-decisions:
  - "Task 4 (live Sentry project + DSN issuance + Vercel env var population + GitHub Actions secrets HEARTBEAT_SECRET + variable VERCEL_HEALTH_URL) deferred to Plan 08 deploy time — Vercel project doesn't exist yet, so populating env vars now would only enable local Sentry not production"
  - "FOUND-13 code path satisfied without Task 4: Sentry/Analytics/Insights load conditionally — undefined DSN renders no-op, doesn't crash"
  - "Sentry init moved to src/instrumentation-client.ts because Turbopack ignores sentry.client.config.ts (legacy stub kept only to satisfy plan grep — does NOT call Sentry.init)"
  - "Added src/app/global-error.tsx because Next.js App Router routes React render errors through global-error component, NOT through standard Sentry error boundary — without this, success criterion #5 (capture runtime errors) fails silently"
  - "Heartbeat runs every 6 days (Supabase pauses at 7) — cushion for one missed run before pause"
  - "Storage budget threshold 70% (PITFALLS #11) — alert before hitting the 500 MB hard ceiling"

patterns-established:
  - "Defer-friendly observability: SDK loads conditionally on env var presence; missing DSN = no-op, build still green"
  - "Auth-gated internal API routes via shared HEARTBEAT_SECRET in Authorization Bearer header — uses constant-time comparison to prevent timing attacks"
  - "_debug/* route convention for diagnostic pages that should be removed or admin-gated before public launch (tracked in pre-launch checklist)"

requirements-completed: [FOUND-13]

# Metrics
duration: ~17min (Tasks 1-3 by gsd-executor a802fa445372b245a)
completed: 2026-04-21
---

# Plan 01-07: Observability Summary

**Sentry (client/server/edge) + Vercel Analytics + Speed Insights wired with PII scrubbing; heartbeat & storage workflows shipped — live activation deferred to Plan 08 deploy.**

## Performance

- **Duration:** ~17 min (Tasks 1-3 inside one executor agent)
- **Started:** 2026-04-21
- **Completed:** 2026-04-21 (Task 4 deferred — see below)
- **Tasks:** 3/4 executed in this session; Task 4 deferred per user decision
- **Files modified:** 10 created, 5 modified

## Accomplishments

- FOUND-13 satisfied: Sentry SDK + Vercel Analytics + Speed Insights wired across client/server/edge runtimes
- Phase 1 success criterion #5 groundwork: deliberate-error pages exist; runtime + server-action errors will reach Sentry once DSN is set
- D-02.4 satisfied: heartbeat workflow runs every 6 days against `/api/health` to prevent 7-day Supabase pause
- PITFALLS #11 groundwork: storage monitor workflow runs daily, fails at 70% of 500 MB ceiling
- PII scrubbing in defense-in-depth pattern: `sendDefaultPii: false` + `beforeSend` custom scrubber + explicit `delete headers`
- 4 auto-fixes applied during execution (see Auto-fix Log below)

## Task Commits

1. **Task 1: Sentry SDK + Vercel Analytics/Speed Insights init + PII scrubbing** — `78fb4cf`
2. **Task 2: /api/health + /api/storage-check + heartbeat.yml + storage-monitor.yml + middleware matcher exceptions** — `6320764`
3. **Task 3: Deliberate-error _debug/sentry-test pages + global-error.tsx + instrumentation-client.ts move** — `ce2a79e`
4. **Task 4: Sentry project + GitHub secrets + Vercel env vars + live smoke test** — **DEFERRED** (see below)

**Plan metadata:** _(this commit)_ — `docs(01-07): plan SUMMARY with deferred Task 4`

## Auto-fix Log

| # | Rule | Issue | Fix |
|---|------|-------|-----|
| 1 | Bug (1) | `beforeSend` signature collided with `Sentry.ErrorEvent` type → `tsc --noEmit` failed | Aligned `scrubPii` to `Sentry.ErrorEvent`, used `unknown` cast (Task 1) |
| 2 | Blocking (3) | `/api/storage-check` + Sentry tunnel `/monitoring` intercepted by i18n middleware → 401 / redirect | Added matcher exceptions in `src/middleware.ts` (Task 2) |
| 3 | Missing critical functionality (2) | Sentry build warning: `global-error.js` missing → React render errors silently bypass Sentry, breaking success criterion #5 | Added `src/app/global-error.tsx` calling `Sentry.captureException` (Task 3) |
| 4 | Missing critical functionality (2) | Sentry deprecation: Turbopack ignores `sentry.client.config.ts` → dev Sentry uninitialized → smoke test unreliable | Moved real init to `src/instrumentation-client.ts` + `onRouterTransitionStart` export; legacy file kept as policy stub for grep compatibility (Task 3) |

## Files Created/Modified

(See `key-files` block above for the full list.)

## Verification Evidence

- `npx tsc --noEmit` → clean
- `npm run build` → success; routes `/api/health`, `/api/storage-check`, `/[locale]/_debug/sentry-test` registered
- `TASK1_OK`, `TASK2_OK`, `TASK3_OK` grep markers all present
- 1 residual build warning (`[@sentry/nextjs] DEPRECATION ... sentry.client.config.ts`) — intentional policy stub, no Sentry.init invocation, harmless. Can clean up in Phase 4c.

## Deferred Work — Task 4 (REQUIRED before public launch / Plan 08 smoke test)

User chose `defer` at the human-action checkpoint on 2026-04-21. Vercel project does not exist yet (Plan 08 deploys it), so populating Sentry env vars in `.env.local` only would enable Sentry locally without exercising the Vercel/GitHub paths. Better to bundle Task 4 with Plan 08's deploy step.

**Tracked items (must complete during Plan 08):**

1. **Sentry account + Next.js project** — sign up at sentry.io, create project (`Next.js` template), grab DSN
2. **Sentry Auth Token** — Settings → Auth Tokens → Create with scopes `org:read` + `project:releases` (sourcemap upload)
3. **Generate `HEARTBEAT_SECRET`** — `openssl rand -hex 32` (or PowerShell equivalent on Windows)
4. **Vercel Project Env Vars** (Production + Preview):
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`
   - `HEARTBEAT_SECRET`
5. **GitHub Actions secrets/variables** (`Repo → Settings → Secrets and variables → Actions`):
   - Secret: `HEARTBEAT_SECRET` (same value as #3)
   - Variable: `VERCEL_HEALTH_URL` = `https://YOUR_PROJECT.vercel.app` (set after Plan 08 deploys)
6. **Live smoke verification** (Plan 08 task or Phase verification):
   - Visit `https://YOUR_PROJECT.vercel.app/ko/_debug/sentry-test` → click both buttons → confirm 2 events in Sentry (1 runtime + 1 server-action)
   - GitHub Actions UI → "Free-tier Heartbeat" → "Run workflow" → green check + log shows `"dbReachable":true`
   - Vercel Analytics dashboard shows pageview counts

**Why deferring is safe:**
- Sentry SDK loads conditionally — undefined DSN = no-op, no crash
- Vercel Analytics + Speed Insights — same conditional load behavior
- Heartbeat + storage-monitor workflows simply fail with clear "401 Unauthorized" until `HEARTBEAT_SECRET` is set in both places — no silent data loss

**Surfacing mechanism:** Captured here in `key-decisions` and `Deferred Work`; Phase VERIFICATION.md will list under `human_verification`; Phase 8 LAUNCH-01 pre-launch checklist must treat all 6 items as blocking before public traffic.

## Handoff to Plan 08

Plan 08 (deploy + smoke test) is the natural place to:
1. Provision Vercel project and link the GitHub repo
2. Populate the 5 Sentry env vars + HEARTBEAT_SECRET in Vercel
3. Add HEARTBEAT_SECRET as GitHub Actions secret + VERCEL_HEALTH_URL as variable
4. Trigger the smoke verification (steps under Deferred Work item #6)

## Known Utility Routes (Pre-Launch Cleanup)

- `/[locale]/_debug/sentry-test` — deliberate-error pages used for Sentry SDK verification. Should be either:
  - **Removed** before launch (cleanest), OR
  - **Gated** to admin/editor role via Plan 03 layout pattern (preserve for ongoing diagnostics)

  Decision tracked for Phase 8 LAUNCH-01 checklist.

## Threat Model Status

All Plan 07 threats from PLAN.md remain mitigated as designed. PII scrubbing exercised: explicit removal of `request.headers`, `data.email`, custom redaction list. No new threats discovered.
