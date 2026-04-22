---
phase: 03-faceted-search-postgres-path
plan: 06
subsystem: search
tags: [a11y, live-region, sentry, smoke-tests, polish]
requires:
  - 03-05-SUMMARY  # SearchPage composition, error.tsx scaffold, ResultsEmpty stub
  - 01-07-SUMMARY  # Sentry client instrumentation
provides:
  - live-count-announcer         # sr-only aria-live=polite, 300ms debounce
  - sentry-forwarded-error-boundary  # /search error.tsx → Sentry.captureException
  - per-page-aware-skeleton      # ResultsSkeleton accepts perPage, caps at 10 rows
  - phase3-live-smoke-suite      # ≥12 live it() assertions (was 20 todo)
affects:
  - src/lib/data/freshness.ts    # dropped 'server-only' import to unblock client use
tech-stack:
  added:
    - nuqs/useQueryStates        # debounce key-list for LiveCountAnnouncer
  patterns:
    - node-fs-walker-for-portable-codegrep  # filesImporting() — no shell grep
key-files:
  created:
    - src/components/search/LiveCountAnnouncer.tsx
  modified:
    - src/components/search/SearchPage.tsx
    - src/components/search/ResultsSkeleton.tsx
    - src/app/[locale]/(public)/search/page.tsx
    - src/app/[locale]/(public)/search/error.tsx
    - src/lib/data/freshness.ts
    - src/messages/ko.json
    - src/messages/en.json
    - tests/smoke/phase3-success-criteria.test.ts
    - .planning/phases/03-faceted-search-postgres-path/deferred-items.md
decisions:
  - "300ms debounce keyed on individual URL params, not a stable snapshot — `useQueryStates` returns a fresh object each render so identity checks would re-fire"
  - "Skeleton rows capped at max 10 even when per_page=100, to prevent DOM bloat during a <200ms loading flash"
  - "Sentry tag allowlist = { route, phase } only — T-03-06-01 Information Disclosure mitigation; error.message is additionally scrubbed by instrumentation-client beforeSend hook"
  - "SC #6 adapter-boundary checks use Node fs/promises walker (filesImporting) not shell grep — T-03-06-05 cross-platform guarantee"
  - "freshness.ts demoted from server-only to universal — the helper is pure (differenceInDays + Tailwind class map); server-only was overly restrictive and blocked Plan 05 client components from using the shared palette"
metrics:
  duration: ~25 minutes
  completed: 2026-04-22
  tasks: 2
  files_touched: 9 (1 created, 8 modified)
  smoke_stubs_flipped: 12 / 20  (8 remaining deferred to Plan 07)
---

# Phase 3 Plan 06: Polish — Live Region, Sentry Forwarding, Smoke Assertions Summary

Wave 5 polish pass — added screen-reader live-count announcer with 300ms debounce (UI-SPEC §Accessibility Contract + §Interaction Timing), wired `/search` error boundary to `Sentry.captureException`, taught `ResultsSkeleton` about `per_page` so `per_page=50` shows a proportional-but-bounded skeleton, and flipped 12 of the 20 Wave 0 smoke-suite `it.todo` stubs into live assertions — with SC #6 filesystem checks using a portable Node `fs/promises` walker instead of shell `grep` to stay Windows 11 cmd.exe safe.

## Tasks Executed

### Task 1 — LiveCountAnnouncer + Sentry error forwarder + ResultsSkeleton perPage wiring (commit `0a5b20a`)

Created `src/components/search/LiveCountAnnouncer.tsx` — a `'use client'` component reading `useQueryStates(searchParsers)` so its `useEffect` fires whenever any facet/URL param changes, then `setTimeout(..., 300)` defers the announcement by 300ms to coalesce rapid toggles (T-03-06-02 DoS mitigation). The visually-hidden `<div role="status" aria-live="polite" aria-atomic="true">` renders `search.results.liveRegion` ("`{count}개 기업이 표시됩니다`").

First-render caveat documented in-component: initial `announced` state equals `count`, so the very first paint does NOT emit an SR announcement — only CHANGES do. This matches how assistive technologies expect polite live regions to behave and avoids spamming users who just navigated to the page.

Wired into `SearchPage.tsx` right after the sr-only `<h1>` with `count={result.total}`. Added `search.results.liveRegion` to `ko.json` and empty-string stub to `en.json` (Phase 1 convention — Korean is the translation authority).

Modified `src/app/[locale]/(public)/search/error.tsx` — imports `* as Sentry from '@sentry/nextjs'` and calls `Sentry.captureException(error, { tags: { route: '/search', phase: '3' } })` inside `useEffect([error])`. Explicit tag allowlist = no query params, no user data → T-03-06-01 (Information Disclosure via Sentry leak) mitigated. Carries forward Phase 1 instrumentation-client `beforeSend` PII scrubber as a second line of defense.

Modified `src/components/search/ResultsSkeleton.tsx` — added `perPage?: number` prop alongside the existing `rows?: number`; implemented `const count = Math.max(1, Math.min(requested, MAX_SKELETON_ROWS))` where `MAX_SKELETON_ROWS = 10`. When a caller passes `perPage=100`, the skeleton still renders 10 rows — that's enough visual feedback during the <200ms loading flash without paying the DOM cost of 100 skeleton rows. `src/app/[locale]/(public)/search/page.tsx` Suspense fallback now passes `perPage={Number(raw.per_page)}`.

`ResultsEmpty.tsx` was already correct per Plan 05 (uses `useQueryStates` + a `clearAll` that preserves `view` / `sort` / `per_page` via explicit omission) — no change needed; plan's acceptance criteria verified against the existing code.

### Task 2 — Flip Wave 0 smoke stubs to live assertions (commit `c3e9888`)

Rewrote `tests/smoke/phase3-success-criteria.test.ts`. Now contains 12 live `it(...)` tests (non-todo) organized by Phase 3 ROADMAP success criterion:

| SC | Lives | Kind | What it checks |
|---|---|---|---|
| #1 Multi-facet | 4 | HTTP | 200 status; `{count}개 기업`; 6 facet labels; filtered count ≤ unfiltered count |
| #2 URL shareable | 2 | HTTP | Full-shape share URL renders card-grid class; past-end `page=999` renders empty-state `0개 기업` |
| #5 Sort/view/pagination | 3 | HTTP | `?view=card` renders container-query grid; `?per_page=50` reflects selection; `?sort=name_asc` renders Korean label copy |
| #6 Adapter abstraction | 3 | Filesystem | `adapter.ts` exports interface+singleton; no `src/app`/`src/components` import of `@/lib/search/postgres`; no `src/lib/search`/`src/components/search` import of `@/lib/supabase/server` |

8 remaining `it.todo` stubs preserved for Plan 07:
- SC #3 SRCH-13 Korean corpus (7 todos) — separate file `tests/smoke/phase3-srch13.test.ts` owns these per 03-VALIDATION.md §Per-Task Verification Map
- SC #4 p95 < 1s load test (2 todos) — Plan 07's `tests/load/phase3-load.ts`

Cross-platform portability gate (T-03-06-05): SC #6 uses a Node `fs/promises` walker `filesImporting(pattern, roots)` — zero `execSync(grep/…)`, zero `2>/dev/null`, zero `|| true`. Windows 11 cmd.exe (no grep) and bash both run the same code path. Plan's `<verify>` grep-bans the forbidden patterns and returned clean.

## Verification Summary

**Filesystem checks (always green, no dev server required):**
- `test -f src/components/search/LiveCountAnnouncer.tsx` ✅
- `grep "aria-live" LiveCountAnnouncer.tsx` ✅
- `grep "captureException" search/error.tsx` ✅
- `grep "useQueryStates" ResultsEmpty.tsx` ✅
- `grep "perPage" ResultsSkeleton.tsx` ✅
- `ko.json.search.results.liveRegion` key present ✅
- `grep -cE "^[[:space:]]*it\(" phase3-success-criteria.test.ts` → **12** ✅
- No forbidden shell patterns in smoke test source ✅
- `grep "filesImporting"` in smoke test source → hit ✅
- `npx tsc --noEmit` → exit 0 ✅
- Unit suite: **133 passed, 4 skipped** (4 skipped = DB-INFRA-01; search-schema.test.ts fails on missing `pg` package, pre-existing, not a regression) ✅

**Smoke-suite HTTP checks (dev server running on port 3001):**
- Phase 3 filesystem tests (SC #6, 3 tests) → **3 passed**
- Phase 3 HTTP tests (SC #1/#2/#5, 9 tests) → **9 failed**, all with HTTP 500 due to `TypeError: Invalid URL` inside `postgres.ts:52` — this is **DB-INFRA-01** (see Deferred Issues), not a Plan 06 regression.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `src/lib/data/freshness.ts` had `import 'server-only'` blocking client components from rendering `/search`**

- **Found during:** Task 2 (live smoke run against dev server)
- **Issue:** `ResultsTable.tsx` and `ResultsCards.tsx` (both `'use client'`) import `freshnessLevel` + `FRESHNESS_DOT_CLASS` from `@/lib/data/freshness.ts`. Because the module declares `import 'server-only'`, Turbopack refused to bundle it for the client graph, throwing `Invalid import: 'server-only' cannot be imported from a Client Component module` — `/ko/search` rendered HTTP 500 on every request. This was a Plan 05 regression surfaced by Plan 06's smoke suite being the first consumer that actually boots the page.
- **Fix:** Removed the `'server-only'` directive. The helper is a pure function (`differenceInDays` + a Tailwind class map) — no secrets, no server-only APIs, nothing to gate. Added an in-file doc-comment explaining the removal and the Plan 06 context so a future reader doesn't reintroduce it.
- **Files modified:** `src/lib/data/freshness.ts`
- **Commit:** `c3e9888`

### Deferred Issues

**DB-INFRA-01** — Pre-existing from Plan 03. `DATABASE_URL` in `.env.local` has URL-unsafe characters (`#`, `&`, `^`) in the password, so `postgres` library's `new URL(connectionString)` parse fails. Impact on Plan 06: the 9 HTTP-dependent smoke assertions fail with HTTP 500 instead of passing. Plan's `<verify>` block explicitly allowed this: "HTTP tests may require dev server running; filesystem tests must still pass." Fix belongs to DevOps (percent-encode password or rotate it).

**COOKIE-NOTICE-01** — Newly observed. `/ko/search` server logs emit `MISSING_MESSAGE: No messages were configured on the provider` from `src/components/site/cookie-notice.tsx:24` whenever the public layout renders. Copy exists in `ko.json` — likely a next-intl provider namespace scoping gap inherited from Phase 1. Users never see it because DB-INFRA-01 catches first, but should be resolved by the Phase 1 owner once DB-INFRA-01 clears.

Both recorded in `.planning/phases/03-faceted-search-postgres-path/deferred-items.md`.

## Authentication Gates

None. No auth flows touched.

## Known Live-Region Limitations

1. **First render does NOT announce** — initial `announced` state equals `count`, only CHANGES trigger the debounced message. This is intentional (assistive-tech best practice) but means a user who shares a URL with pre-applied filters won't hear a live-region announcement on first load; the `{count}개 기업` visible count carries that info instead.
2. **Debounce dependency list is hand-maintained** — if a future plan adds a new URL param to `searchParsers`, the `LiveCountAnnouncer` useEffect dependency array must be extended to match. A lint rule (`react-hooks/exhaustive-deps` on the `query.*` expansion) would catch drift.
3. **Storybook / snapshot testing is not wired** — Plan 06 verified via grep + live smoke, not DOM assertions. Full RTL coverage of the `aria-live` region's debounce timing belongs in Plan 07's harness.

## Known Stubs

None in files modified by this plan.

## Threat Flags

None. All new surface (LiveCountAnnouncer sr-only region, Sentry forwarding tags, smoke test fs walker) is covered by the threat model defined in the plan.

## Handoff to Plan 07

- **Load-test infrastructure + synthetic corpus generator** — Plan 07 owns `scripts/perf/search-load-test.mjs` + `tests/load/phase3-load.ts` + the 5k synthetic-company fixture. Current 15-seed dataset is too small to exercise SC #4's p95 < 1s claim.
- **SRCH-13 full regression (`tests/smoke/phase3-srch13.test.ts`)** — 7 Korean search strings must each return ≥1 result with the canonical resolution chain (`토스` / `토스뱅크` / `비바리퍼블리카` all → `toss`). Plan 06 preserved the 7 `it.todo` stubs in the main SC #3 describe block for phase-gate visibility; Plan 07 populates the separate file.
- **375 px mobile human-verify** — bottom-sheet drawer slide-up + accordion feel + "적용" dismissal — cannot be automated meaningfully per 03-VALIDATION.md §Manual-Only Verifications. Plan 07 is the phase-gate checkpoint.
- **DB-INFRA-01 resolution is a hard prerequisite** for Plan 07 HTTP tests to become green — without it, the HTTP smoke surface stays red regardless of code quality.

## Self-Check: PASSED

Verified all created / modified files exist on disk:

- FOUND: `src/components/search/LiveCountAnnouncer.tsx`
- FOUND: `src/components/search/SearchPage.tsx` (edited)
- FOUND: `src/components/search/ResultsSkeleton.tsx` (edited)
- FOUND: `src/app/[locale]/(public)/search/page.tsx` (edited)
- FOUND: `src/app/[locale]/(public)/search/error.tsx` (edited)
- FOUND: `src/lib/data/freshness.ts` (edited — `server-only` removed)
- FOUND: `src/messages/ko.json` (edited — `liveRegion` key)
- FOUND: `src/messages/en.json` (edited — `liveRegion` stub)
- FOUND: `tests/smoke/phase3-success-criteria.test.ts` (rewritten, 12 live)
- FOUND: `.planning/phases/03-faceted-search-postgres-path/deferred-items.md` (appended)

Verified all commits exist:

- FOUND commit `0a5b20a`: feat(03-06): live-count announcer + Sentry error forwarder + per_page-aware skeleton
- FOUND commit `c3e9888`: test(03-06): flip 12 Phase 3 smoke stubs to live assertions + unblock /search render
