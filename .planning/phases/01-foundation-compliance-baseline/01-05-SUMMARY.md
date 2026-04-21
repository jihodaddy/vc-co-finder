---
phase: 01-foundation-compliance-baseline
plan: 05
subsystem: ui
tags: [next-intl, app-router, pipa, trust-provenance, robots, typedroutes, server-only]

# Dependency graph
requires:
  - phase: 01-foundation-compliance-baseline
    provides: "Plan 01 i18n + locale routing scaffolding (next-intl, /[locale]/* layout, ko.json/en.json baseline)"
  - phase: 01-foundation-compliance-baseline
    provides: "Plan 03 admin role gate (requireAdminOrEditor 404-on-deny layout that wraps /admin/*)"
  - phase: 01-foundation-compliance-baseline
    provides: "Plan 04 OAuth login route + UserMenu component referenced by header"
provides:
  - "Real /ko/ landing — hero + value props + locale-aware OAuth CTA (D-06.1)"
  - "/ko/sources TRUST-07 sources index (1 active + 5 planned + excluded note)"
  - "/ko/privacy 10-section Korean PIPA-compliant policy (FOUND-11 / D-04.2 KISA skeleton)"
  - "/ko/terms 4-section Korean ToS (D-04.6)"
  - "/ko/admin Phase 1 stub gated by Plan 03 layout (D-06.3)"
  - "src/lib/data/_meta.ts — server-only SourceMeta + WithMeta + attachSource(All) for Phase 2 (TRUST-03 groundwork)"
  - "src/app/robots.ts — public allows + admin/api/auth/dsar disallows (PITFALLS #7)"
  - "117/117 ko.json/en.json key tree parity (D-05.2 — en values blank per source-of-truth rule)"
  - "Site chrome (Header/Footer/Disclaimer/CookieNotice) wired into (public)/layout.tsx — TRUST-06 disclaimer on every public page (Task 1)"
affects:
  - "Phase 2 (Read-Only Profiles): consumes attachSource() helper from src/lib/data/_meta.ts on every fact-bearing query"
  - "Phase 4b (Admin UI): replaces /[locale]/admin stub with real curation UI behind same role gate"
  - "Phase 6 (DSAR Handler) / Plan 06: implements /[locale]/contact/dsar — footer link is already live (cast through Route until route exists)"
  - "Phase 7+ (translation): seeds ko.json source-of-truth tree; en.json structural stub awaits localization"
  - "Phase 8 (Launch): replaces privacy.cpoBody '[도메인]' placeholder with bound domain; adds dynamic sitemap.xml (currently absent by design)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public pages use `getTranslations()` (RSC) with root-scoped translator when iterating over key arrays (sources/privacy/terms)"
    - "Provenance helper enforced server-only via `import 'server-only'`; data layer rows decorated with `WithMeta<T>` so call sites can't forget _meta"
    - "robots.txt as Next.js metadata route (`src/app/robots.ts` exporting `MetadataRoute.Robots`) — co-located with app code"
    - "Routes not yet implemented but linked must cast through `Route` from 'next' (typedRoutes opt-out at the call-site, not project-wide)"

key-files:
  created:
    - "src/app/[locale]/(public)/sources/page.tsx — TRUST-07 source index"
    - "src/app/[locale]/(public)/privacy/page.tsx — 10-section PIPA policy"
    - "src/app/[locale]/(public)/terms/page.tsx — 4-section ToS"
    - "src/app/[locale]/(admin)/admin/page.tsx — D-06.3 stub"
    - "src/lib/data/_meta.ts — TRUST-03 SourceMeta / attachSource helper"
    - "src/app/robots.ts — Phase 1 robots.txt"
    - "src/components/site/header.tsx (Task 1)"
    - "src/components/site/footer.tsx (Task 1)"
    - "src/components/site/disclaimer.tsx (Task 1)"
    - "src/components/site/cookie-notice.tsx (Task 1)"
  modified:
    - "src/app/[locale]/(public)/page.tsx — replaced Plan 01 placeholder with real D-06.1 landing"
    - "src/components/site/footer.tsx — Route cast on /contact/dsar link (deviation Rule 3)"
    - "src/components/site/header.tsx — Route cast on /${locale}/ root link (deviation Rule 3)"
    - "src/components/site/disclaimer.tsx — removed Korean disclaimer string from JSDoc (deviation Rule 2 hygiene)"
    - "src/messages/ko.json (Task 1)"
    - "src/messages/en.json (Task 1)"
    - "src/app/[locale]/(public)/layout.tsx (Task 1)"

key-decisions:
  - "Route casts confined to call-site (`href={... as Route}`) — keeps typedRoutes safety on every other link; lifts only where the target page lands in a later plan"
  - "Sources page uses root translator + dotted-key lookup so the SOURCES[] array drives both copy and structure (one place to add Phase 5 sources later)"
  - "Privacy / terms pages iterate over a SECTIONS[] array of {heading, body} pairs — translators only touch ko.json, never the page"
  - "Provenance type ships with discriminator `sourceType` enum mirroring D-03.6; matches the data_sources.source_type Postgres ENUM exactly"

patterns-established:
  - "RSC page + `getTranslations()`: server-side i18n with parallel locale fetch (no `'use client'` boundary needed for static-content pages)"
  - "Externalize Korean copy: every user-facing string lives in `src/messages/ko.json`; pages and JSDoc never embed the literal text"
  - "Page-level SECTIONS[] + key array pattern for multi-section legal pages — translator-friendly, structurally diff-able"

requirements-completed: [FOUND-10, FOUND-11, TRUST-03, TRUST-06, TRUST-07]

# Metrics
duration: ~25min (Task 2 only — Task 1 was committed in a prior agent session)
completed: 2026-04-21
---

# Phase 1 Plan 05: Site Population + PIPA Privacy + Provenance Helper Summary

**Real /ko/ marketing site (landing + sources + Korean PIPA privacy + ToS + admin stub) with TRUST-03 server-only `attachSource()` helper ready for Phase 2 data wrappers.**

## Performance

- **Duration:** ~25 min (Task 2 execution by this agent; Task 1 was completed earlier and committed as `c36a43f`)
- **Started (Task 2):** 2026-04-21T09:35:00Z
- **Completed (Task 2):** 2026-04-21T10:00:00Z
- **Tasks:** 2 / 2 (Task 1 prior, Task 2 this session)
- **Files modified (Task 2):** 10 (7 new + 3 modified)

## Accomplishments

- **`/ko/` landing replaced** the Plan 01 placeholder with hero + 3-up value props + locale-aware OAuth CTA — every string via `getTranslations('landing')` (D-06.1, FOUND-10)
- **`/ko/privacy` ships 10-section Korean PIPA-compliant policy** authored against the KISA 표준 개인정보처리방침 skeleton, covering items / purpose / retention / 3rd-party / international transfer / rights / cookies / CPO / changes (FOUND-11 / D-04.2)
- **`/ko/sources` lists TRUST-07 source registry** — manual curation (active) + DART, K-Startup, user submissions, VC portfolio, news RSS (planned with phase attribution) + excluded-source note (the VC) per the no-scrape policy
- **`/ko/terms` ships 4-section Korean ToS** — data accuracy, no-warranty, anti-scraping/redistribution, contact + governing law (D-04.6)
- **`/ko/admin` stub renders only for admins** — Plan 03's `requireAdminOrEditor` layout 404s everyone else; this validates the role-gating pipeline end-to-end before Phase 4b builds the real UI (D-06.3)
- **`src/lib/data/_meta.ts` ships `SourceMeta`, `WithMeta<T>`, `attachSource()`, `attachSourceAll()`** — server-only barrier prevents accidental client import; Phase 2 data wrappers will decorate every fact-bearing row (TRUST-03)
- **`src/app/robots.ts` allows public marketing routes**, disallows `/admin/`, `/ko/admin/`, `/api/`, `/auth/`, `/ko/contact/dsar` (PITFALLS #7 keeps DSAR form out of search index)
- **Site chrome wired in Task 1** — Header + Footer + Disclaimer + CookieNotice render on every (public) route via the layout, so every page automatically picks up TRUST-06 disclaimer

## Task Commits

1. **Task 1: Site chrome + i18n key tree** — `c36a43f` (feat) — committed by prior agent session
2. **Task 2: Public pages + admin stub + provenance helper + robots** — `30e49bd` (feat) — this session

## Files Created/Modified (Task 2)

**Created**
- `src/app/[locale]/(public)/sources/page.tsx` — TRUST-07 sources index
- `src/app/[locale]/(public)/privacy/page.tsx` — FOUND-11 10-section PIPA policy
- `src/app/[locale]/(public)/terms/page.tsx` — D-04.6 4-section ToS
- `src/app/[locale]/(admin)/admin/page.tsx` — D-06.3 admin stub
- `src/lib/data/_meta.ts` — TRUST-03 SourceMeta / WithMeta / attachSource helpers
- `src/app/robots.ts` — Phase 1 robots.txt metadata route

**Modified**
- `src/app/[locale]/(public)/page.tsx` — replaced placeholder with real D-06.1 landing
- `src/components/site/footer.tsx` — added `Route` import + cast on `/contact/dsar` link (deviation Rule 3)
- `src/components/site/header.tsx` — added `Route` import + cast on `/${locale}/` root link (deviation Rule 3)
- `src/components/site/disclaimer.tsx` — removed literal Korean disclaimer from JSDoc (FOUND-10 hygiene)

## Decisions Made

- **Route cast pattern at call-site, not project-wide.** Two link templates (`/contact/dsar` from Plan 06, `/${locale}/` locale root) are not in Next.js's typedRoutes registry yet. Instead of disabling typedRoutes globally, cast `as Route` only at the two call-sites — preserves type safety on every other link. Both call-sites have explanatory comments pointing to the plan that delivers the real route.
- **Provenance helper API surface = `attachSource` + `attachSourceAll`.** Exposing both forms means Phase 2 query wrappers don't need to manually map; `attachSourceAll(rows, sharedSource)` handles the common case (one DART filing → many funding_rounds) cheaply.
- **`SourceType` exported as discriminator union.** Mirrors the `data_sources.source_type` Postgres ENUM (D-03.6). Future ETL upserts can `as const` against this type so a typo at the SQL boundary surfaces at compile time.
- **`disclaimerNote` in privacy frontmatter, not policy section count.** Privacy iteration covers 10 sections per FOUND-11, but the KISA-skeleton attribution lives at the bottom as a separate `<p>` so it doesn't pollute section enumeration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] typedRoutes rejected `/${locale}/contact/dsar` Link in footer.tsx**
- **Found during:** Task 2 verification (`npm run build`)
- **Issue:** Next.js 15.5 `typedRoutes: true` (next.config.ts) compares Link `href` template literals against the route registry. `/contact/dsar` is delivered by Plan 06; the build fails with TS2322 because there is no matching `RouteImpl` yet. Footer link must be live in Phase 1 per FOUND-11 / D-04.7.
- **Fix:** Added `import type { Route } from 'next'`; cast `href={\`/\${locale}/contact/dsar\` as Route}`. Comment at the call-site points to Plan 06.
- **Files modified:** `src/components/site/footer.tsx`
- **Verification:** `npm run build` no longer errors on footer; the second build surfaced the next typedRoutes mismatch (header.tsx).
- **Committed in:** `30e49bd`

**2. [Rule 3 - Blocking] typedRoutes rejected `/${locale}/` root link in header.tsx**
- **Found during:** Task 2 verification (re-running `npm run build` after fix #1)
- **Issue:** Same TS2322 — the locale root template `/${locale}/` (with trailing slash) is not in the typedRoutes registry; only registered child routes (`/${locale}/sources`, etc.) qualify.
- **Fix:** Same pattern as #1 — `import type { Route } from 'next'`; cast `href={\`/\${locale}/\` as Route}` with explanatory comment.
- **Files modified:** `src/components/site/header.tsx`
- **Verification:** `npm run build` passes (7 routes generated incl. `/[locale]`, `/[locale]/admin`, `/[locale]/privacy`, `/[locale]/sources`, `/[locale]/terms`, `/robots.txt`).
- **Committed in:** `30e49bd`

**3. [Rule 2 - FOUND-10 hygiene] Removed literal Korean disclaimer from disclaimer.tsx JSDoc**
- **Found during:** Task 2 verification (running `rg "데이터 완전성" src/`)
- **Issue:** Task 1's JSDoc contained the literal `"데이터 완전성을 보장하지 않습니다"` for documentation. The plan-level invariant ("string must be externalized") greps `rg "데이터 완전성" src/` — JSDoc match is technically not a JSX leak, but it weakens the invariant signal for future code review.
- **Fix:** Replaced the literal with a key reference: `TRUST-06 disclaimer (footer.disclaimerText)`.
- **Files modified:** `src/components/site/disclaimer.tsx`
- **Verification:** `rg "데이터 완전성" src/` now returns zero matches; `t('disclaimerText')` continues to render the live copy.
- **Committed in:** `30e49bd`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 invariant hygiene)
**Impact on plan:** Both blocking fixes were necessary to clear the `npm run build` gate. Hygiene fix preserves the externalize-Korean invariant for future contributors. No scope creep — every change traces to a plan acceptance criterion or verification step.

## Issues Encountered

- **Verification script regex precision.** The plan's verification text reads `rg "데이터 완전성" src/ src/messages/` returns matches ONLY in `src/messages/ko.json`. The actual ko.json string is `"데이터의 완전성·정확성"` (Korean particle + middle-dot list), not the literal `"데이터 완전성을 보장하지 않습니다"` from the plan acceptance copy. Both forms convey the same meaning — the actual ko.json wording is more idiomatic Korean — and the externalize-via-`t()` invariant holds either way. Documenting here so a future reviewer doesn't bisect a non-issue.

## User Setup Required

None — no external service configuration introduced by this plan. (Plan 04 already documented Kakao Business + Supabase Auth Hook setup for OAuth; nothing new added here.)

## Known Placeholders (resolve before public deploy)

- **`privacy.cpoBody`** in `src/messages/ko.json` contains `privacy@[도메인]` placeholder — Plan 06 (DSAR handler) or Plan 08 (LAUNCH-04 smoke test) replaces `[도메인]` with the bound production domain.
- **`/[locale]/contact/dsar` Link target** does not exist yet — footer link is cast through `Route` until Plan 06 delivers the page. robots.txt already disallows the path; visiting it before Plan 06 returns 404, which is the expected pre-launch posture.
- **Sitemap intentionally absent** — Phase 8 (LAUNCH-01) adds dynamic `sitemap.xml`. robots.txt does not declare a sitemap to avoid pointing bots at a non-existent file.

## Next Phase Readiness

- **Phase 2 (Read-Only Profiles) unblocked**: `src/lib/data/_meta.ts` provides `attachSource(row, source)` and `attachSourceAll(rows, source)` for every `lib/data/companies.ts` query wrapper to decorate fact-bearing rows. The `WithMeta<T>` type makes provenance compile-checked.
- **Plan 06 (DSAR handler) unblocked**: footer link is already live (cast through `Route`). Plan 06 delivers the actual `/[locale]/contact/dsar` page; the cast can be removed once typedRoutes picks up the new route.
- **Phase 4b (Admin UI) unblocked**: `/[locale]/admin` stub validates the Plan 03 role gate end-to-end. Phase 4b replaces the stub body with the curation UI behind the same `requireAdminOrEditor()` boundary.
- **Phase 7+ translation unblocked**: ko.json holds 117 source-of-truth keys; en.json mirrors the same 117 keys with blank values. Translators (Plan 7+) only need to fill values, never restructure.

## Self-Check: PASSED

Files exist:
- `src/app/[locale]/(public)/page.tsx` — FOUND
- `src/app/[locale]/(public)/sources/page.tsx` — FOUND
- `src/app/[locale]/(public)/privacy/page.tsx` — FOUND
- `src/app/[locale]/(public)/terms/page.tsx` — FOUND
- `src/app/[locale]/(admin)/admin/page.tsx` — FOUND
- `src/lib/data/_meta.ts` — FOUND
- `src/app/robots.ts` — FOUND

Commits exist:
- `c36a43f` (Task 1) — FOUND in git log
- `30e49bd` (Task 2) — FOUND in git log

Build gate:
- `npm run build` — PASSED (7 routes including `/robots.txt`)

Invariants:
- `rg "lorem|Lorem" src/` — zero matches
- `rg "데이터 완전성" src/` — zero matches (string only via `t()`)
- ko.json/en.json key parity — 117 / 117 (verified via Node script)
- `<Disclaimer` in footer.tsx — 1 match

---
*Phase: 01-foundation-compliance-baseline*
*Completed: 2026-04-21*
