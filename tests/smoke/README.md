# Phase 1 Smoke Tests

End-to-end verification that all **5 Phase 1 success criteria** hold on a deployed (or local) environment. Source: `.planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md` Phase Boundary.

## Prerequisites

- A reachable URL (deployed Vercel project **or** `npm run dev` running locally on `http://localhost:3000`)
- Supabase project with all 15 migrations applied (`supabase db push --linked` from `docs/deploy/PHASE1_DEPLOY_CHECKLIST.md`)
- Anon key for that Supabase project (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Optional: `HEARTBEAT_SECRET` to exercise the authenticated `/api/health` path

## Run against local dev

```bash
# Terminal 1 — start the app
npm run dev

# Terminal 2 — run the smoke suite
BASE_URL=http://localhost:3000 \
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
npm run test:smoke
```

## Run against production (after Vercel deploy)

```bash
BASE_URL=https://YOUR_PROJECT.vercel.app \
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
HEARTBEAT_SECRET=... \
npm run test:smoke
```

The legacy alias `npm run test:smoke:prod` (which sets `SMOKE_BASE_URL` for you) is also accepted — both env names resolve to the same test runner.

## Skip behaviour (CI safety)

| State | Behaviour |
|---|---|
| Neither `BASE_URL` nor `SMOKE_BASE_URL` set | All 5 describe blocks are skipped via `describe.skipIf`. Vitest exits 0 — does **not** fail CI. |
| `BASE_URL` set but Supabase env missing | Criterion #1, #4, #5 still run (HTTP-only). Criterion #2, #3 are skipped (need anon key). |
| `HEARTBEAT_SECRET` missing | Public `/api/health` check still runs; the authenticated `dbReachable:true` assertion logs a warning and returns early. |
| All env present | Full 15+ assertion suite runs end-to-end. |

This mirrors the env-gating used by `tests/rls/rls.test.ts` so test commands are always safe to invoke from any environment.

## Success criteria covered

| # | Criterion | Tests |
|---|---|---|
| 1 | Dev bootstrap + session persistence | root → `/ko/` redirect, `/ko/` hero, `/ko/login` OAuth buttons |
| 2 | Canonical schema (provenance + currency triple) | `companies` selectable, `data_sources` seed row, `funding_rounds` columns |
| 3 | RLS enforcement + audit triggers | anon INSERT companies blocked, `audit_log` empty, `dsar_requests` insert allowed |
| 4 | i18n + privacy + DSAR routes | `/ko/privacy` (CPO), `/ko/terms`, `/ko/sources` (DART), `/ko/contact/dsar` (4 types), footer disclaimer |
| 5 | Sentry + Analytics + heartbeat | `/api/health` public+authenticated, `robots.txt` disallow, Vercel Analytics script |

## When to run

- **After every Vercel deploy** (Production or Preview) before declaring the deploy good
- **After any Phase 1 schema or route change**
- **In CI** as a post-deploy job once `BASE_URL` is wired up (CI without `BASE_URL` no-ops by design)

## Failure triage

| Failure | Likely cause |
|---|---|
| Criterion #1 redirect missing | `next-intl` middleware regression or `src/middleware.ts` matcher misconfigured |
| Criterion #2 column-not-found | Migration not pushed (`supabase db push --linked` skipped) |
| Criterion #3 anon insert succeeds (no error) | RLS policy missing — re-run Plan 03 migrations |
| Criterion #4 Korean text missing | i18n message regression or RSC streaming dropped strings |
| Criterion #5 `/api/health` 500 | DB connection failed or `HEARTBEAT_SECRET` mismatch |
| Criterion #5 Analytics fingerprint missing | `<Analytics />` removed from `[locale]/layout.tsx` or production build flag dropped |

Route smoke failures into `/gsd-plan-phase 1 --gaps` per Plan 08 Task 4 resume-signal protocol.
