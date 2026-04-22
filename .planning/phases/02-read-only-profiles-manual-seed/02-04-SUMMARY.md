---
phase: 02-read-only-profiles-manual-seed
plan: 04
subsystem: profile-route
tags: [wave-4, app-router, isr, rsc, not-found, error-boundary, slug-regex-v5]
dependency-graph:
  requires:
    - 02-01 (vitest config + i18n profile.* keys + @vitest-environment pragma)
    - 02-02 (formatKRW for render-test assertion)
    - 02-03 (getCompanyBySlug + 4 profile components Hero/AliasList/FundingRoundsTable/IdentifierList)
  provides:
    - src/app/[locale]/(public)/companies/[slug]/page.tsx (PROF-01 ISR route)
    - src/app/[locale]/(public)/companies/[slug]/loading.tsx (SSR skeleton)
    - src/app/[locale]/(public)/companies/[slug]/error.tsx (client error boundary)
    - src/app/[locale]/(public)/companies/[slug]/not-found.tsx (404 target)
    - tests/unit/company-page.render.test.tsx (7 RSC composition tests)
  affects:
    - 02-05 (seed data renders into live route)
    - 02-06 (phase verification HTTP smoke lands here)
    - Phase 4a (ETL webhook → revalidateTag('company:${slug}') contract satisfied)
tech-stack:
  added: []
  patterns:
    - Next 15.5 App Router Promise<params> with `await params`
    - Dual notFound() call-sites — regex-reject path BEFORE DB + DB-miss path AFTER
    - `export const revalidate = 3600 + dynamicParams = true` without generateStaticParams
      (Research A6 on-demand ISR resolution)
    - Locale-aware outbound links via `as Route` cast for typedRoutes routes
      not yet declared in this phase (pattern inherited from Phase 1 footer)
    - RSC render tests in happy-dom require async children stubbed as sync components
key-files:
  created:
    - src/app/[locale]/(public)/companies/[slug]/page.tsx
    - src/app/[locale]/(public)/companies/[slug]/loading.tsx
    - src/app/[locale]/(public)/companies/[slug]/error.tsx
    - src/app/[locale]/(public)/companies/[slug]/not-found.tsx
    - tests/unit/company-page.render.test.tsx
  modified: []
decisions:
  - "Slug regex `^[a-z0-9]+(-[a-z0-9]+)*$` lives as a route-module constant SLUG_REGEX and fires BEFORE getCompanyBySlug — satisfies RESEARCH §V5 (fast-404 + abuse reject) + T-02-04-01 defense-in-depth."
  - "Research Open Question A6 resolved in the simplest way: no generateStaticParams declared at all; Next 15.5 defaults dynamicParams to true so on-demand ISR is automatic. Route module is clean of static-param pre-generation."
  - "Child async RSCs are stubbed as sync components in the render test — happy-dom + react-testing-library cannot render async Server Components. Live route behavior validated by Plan 02-06 HTTP smoke tests against a running server."
  - "Phase 8 scope (PROF-09 JSON-LD + per-page metadata) explicitly deferred — Phase 2 page emits no generateMetadata export."
metrics:
  completed: "2026-04-22"
  duration-min: 10
  tasks: 2
  files-created: 5
  files-modified: 0
  commits: 3
  tests-added: 7
  tests-green: 64 (57 prior + 7 new)
requirements:
  - PROF-01
  - PROF-08
  - TRUST-04
  - TRUST-05
---

# Phase 2 Plan 04: Wave 4 Company Profile Route — Summary

Wave 2 components composed into the production ISR route. No new UI decisions, no new data access — pure composition + the Next App Router surface (loading/error/not-found boundaries + segment config). The slug regex gate from RESEARCH §V5 is the only new piece of logic in the route module, and it runs before any DB round-trip.

## One-liner

Next 15.5 App Router route `/[locale]/companies/[slug]` with `revalidate = 3600` + `dynamicParams = true` on-demand ISR (A6), dual `notFound()` call-sites (regex-reject gate before DB + DB-miss after), Hero→AliasList→FundingRoundsTable→IdentifierList D-03 order, aria-busy skeleton in `loading.tsx`, `profile.error.*` client boundary, `profile.notFound.*` with locale-aware `/search` link, and a 7-test happy-dom render spec covering section order + V5 slug enumeration + revalidate export + display name/KRW/identifier text.

## What Shipped

### Task 1 — 4 App Router files for `/companies/[slug]`

**Commit:** `bab2d79`

- `src/app/[locale]/(public)/companies/[slug]/page.tsx` — async RSC. Awaits `params` (Next 15.5 Promise params API). Runs `SLUG_REGEX.test(slug)` FIRST; failure → `notFound()` (V5 abuse reject, fast-404). Only on a valid slug does it call `getCompanyBySlug`; null → `notFound()` (DB-miss). Composes Hero → AliasList → FundingRoundsTable → IdentifierList inside a `<main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">` per UI-SPEC §Responsive Contract. Exports `revalidate = 3600` + `dynamicParams = true`. No `generateStaticParams` declared.
- `src/app/[locale]/(public)/companies/[slug]/loading.tsx` — SSR skeleton matching the section rhythm (logo + name block, divider, two description lines, aliases/rounds/identifiers blocks). `aria-busy="true" aria-live="polite"` on the outer container. Neutral `bg-muted` blocks only — no custom keyframe animations (UI-SPEC Phase 2 constraint).
- `src/app/[locale]/(public)/companies/[slug]/not-found.tsx` — async RSC. `getLocale + getTranslations('profile.notFound')` in parallel. Renders `heading + body + searchCta` from the `profile.notFound` i18n namespace. `<Link href={`/${locale}/search` as Route}>` for the search CTA — currently 404s in Phase 2, unblocks once Phase 3 lands the route.
- `src/app/[locale]/(public)/companies/[slug]/error.tsx` — `'use client'` module. `useTranslations('profile.error')`. `useEffect(() => console.error(...))` for dev visibility; Sentry picks up via Phase 1 instrumentation. Renders `heading + body + retryCta` with a `<button onClick={reset}>` focus-visible ring.

### Task 2 — RSC render test

**Commit:** `9e758fc`

- `tests/unit/company-page.render.test.tsx` — 7 happy-dom tests:
  1. D-03 section order: reads `container.innerHTML`, greps `id="hero"` < `id="aliases"` < `id="funding-rounds"` < `id="identifiers"`.
  2. DB-miss → `notFound()`: slug `__missing__` passes the regex but `getCompanyBySlug` is mocked to return null.
  3. V5 abuse reject: 7 malformed slugs (`Foo` uppercase, `foo_bar` underscore, `..` path traversal, `bad'OR1=1` SQL-shape, `a--b` double hyphen, `-leading`/`trailing-` edge hyphens) all `.rejects.toBe(NOT_FOUND)`.
  4. Module-level exports `revalidate === 3600` and `dynamicParams === true`.
  5. Rendered DOM contains `토스` (PROF-02 sanity).
  6. Rendered DOM contains `1,000억원` via `formatKRW(100_000_000_000n)` (PROF-03 sanity).
  7. Rendered DOM contains `123-45-67890` (identifier value verbatim).

### Task 1.1 — D-04 guardrail docstring fix

**Commit:** `7fea829`

- Reworded `page.tsx` docstring to avoid collision with the plan's D-04 `grep` guardrail (`chart|news|similar|placeholder|coming.?soon|todo`). Same pattern as Plan 02-03 `font-mono` deviation; no runtime change.

## File Inventory

| Path | Purpose |
|------|---------|
| `src/app/[locale]/(public)/companies/[slug]/page.tsx` | PROF-01 ISR route — slug regex gate, data fetch, section composition |
| `src/app/[locale]/(public)/companies/[slug]/loading.tsx` | SSR skeleton with aria-busy |
| `src/app/[locale]/(public)/companies/[slug]/not-found.tsx` | 404 target (regex-reject + DB-miss) |
| `src/app/[locale]/(public)/companies/[slug]/error.tsx` | Client error boundary with retry |
| `tests/unit/company-page.render.test.tsx` | 7-test RSC composition spec |

## Test Counts

| File | Tests |
| ---- | ----- |
| `tests/unit/company-page.render.test.tsx` (new) | 7 |
| Prior unit tests (Plans 02-01 / 02-02 / 02-03) | 57 |
| **Total unit tests green** | **64** |

`npx vitest run tests/unit` → `Test Files 8 passed (8); Tests 64 passed (64)`.
`npx tsc --noEmit` → exit 0 (clean).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Async RSC children break react-testing-library in happy-dom**

- **Found during:** Task 2 first test run.
- **Issue:** The real profile components (`Hero`, `AliasList`, `FundingRoundsTable`, `IdentifierList`) are all `async` Server Components using `await getTranslations(...)`. When the Page output is handed to RTL's `render()` inside the happy-dom (client-side) environment, `react-dom` bails with `async/await is not yet supported in Client Components, only Server Components` and the container ends up empty. The plan's test draft assumed children would render directly — they cannot in client-side React.
- **Fix:** Added `vi.mock(...)` stubs for all four child components at the top of the test file. Each stub is a **sync** functional component that preserves the section `id` the real component uses (`id="hero"`, `id="aliases"`, `id="funding-rounds"`, `id="identifiers"`) and echoes the load-bearing data we assert on (display name, `formatKRW(amountMinor)`, identifier value). Commentary documents that full HTTP-level RSC behavior is validated by Plan 02-06's smoke tests against a running Next dev server.
- **Files modified:** `tests/unit/company-page.render.test.tsx`
- **Commit:** `9e758fc`
- **Impact:** Unit coverage now measures composition + regex gate + segment exports + data-threading. Behavioral fidelity for the real child RSCs stays covered by their own tests from Plan 02-03 (`source-badge.test.tsx`, `company-logo.test.tsx`, `companies-data.test.ts`). No production code changed.

**2. [Rule 3 — Blocking] `generateStaticParams` guardrail vs. documentation token**

- **Found during:** Task 1 verify sweep against the plan's automated check.
- **Issue:** The plan's verify contract requires `grep -q "generateStaticParams" page.tsx && exit 1 || exit 0`. My initial docstring contained "no `generateStaticParams()` — pages build on first visit", tripping the grep even though no declaration existed. Same class of issue as Plan 02-03's `font-mono` docstring collision.
- **Fix:** Replaced the documentation phrase with "no static-param pre-generation — pages build on first visit" so the guardrail grep returns zero matches while the rationale stays visible. Folded into the original Task 1 commit before commit-time.
- **Files modified:** `src/app/[locale]/(public)/companies/[slug]/page.tsx`
- **Commit:** `bab2d79`
- **Impact:** None to runtime. A6 resolution still documented.

**3. [Rule 3 — Blocking] D-04 placeholder-scan guardrail vs. documentation token**

- **Found during:** Final Plan-level verification sweep.
- **Issue:** Plan's verification block runs `! grep -qE "chart|news|similar|placeholder|coming.?soon|todo"` against `page.tsx` to enforce D-04 "no placeholders". My initial docstring enumerated the deferred sections ("(charts, news, similar companies)") for maintainer clarity, which matched three of the guardrail's alternations.
- **Fix:** Reworded to "Do NOT pre-reserve layout space for later-phase sections" — preserves the rule's intent, removes all trigger tokens.
- **Files modified:** `src/app/[locale]/(public)/companies/[slug]/page.tsx`
- **Commit:** `7fea829` (separate hot-fix commit per per-task commit protocol)
- **Impact:** None to runtime or to D-04 enforcement.

No Rule-1 (bug), Rule-2 (missing critical functionality), or Rule-4 (architectural) fixes were required.

## Authentication Gates

None. Route was built and unit-tested with Supabase entirely mocked at the `@/lib/data/companies` boundary. Live DB validation lands in Plans 02-05 (seed) + 02-06 (smoke).

## Threat-Model Coverage

| Threat ID | Disposition | Mitigation landed in this plan |
| --------- | ----------- | ------------------------------ |
| T-02-04-01 (Injection: slug → PostgREST `.eq`) | mitigate | Route-boundary `SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/` rejects with `notFound()` BEFORE reaching `getCompanyBySlug`; enumerated 7 malformed-input rejections in the render test (uppercase, underscore, path traversal, SQL-shape, double hyphen, leading/trailing hyphen). PostgREST `.eq('slug', slug)` stays as the parameterization fallback. |
| T-02-04-02 (Info-Disclosure: error.tsx rendering raw error) | mitigate | `error.tsx` renders only `t('heading')` + `t('body')` + retry button. `error.message`/stack are never displayed. `console.error` fires in dev; Sentry per Phase 1 config scrubs PII. |
| T-02-04-03 (DoS: BigInt overflow) | accept | `formatKRW` O(1) non-recursive with Plan 02-02 test coverage to 10^17 scale. |
| T-02-04-04 (Spoofing: path traversal) | mitigate | Next segment matching handles `..` at the router level; the regex gate ALSO rejects `..` explicitly (covered by the render test). |
| T-02-04-05 (Tampering: skeleton layout reveal) | accept | Public page. |
| T-02-04-06 (Elevation: hidden server action) | accept | No server actions defined in the route module. |

## Research Open Question Resolution

### A6 — On-demand ISR strategy → **implemented in `page.tsx`**

**Decision:** No `generateStaticParams`. `revalidate = 3600` + `dynamicParams = true` exports land on-demand ISR: the first hit to a slug builds and caches the page; subsequent hits within the hour serve the cached variant; after the hour (or after a Phase 4a `revalidateTag('company:${slug}')` webhook) a new build kicks off silently in the background.

**Why this is safe for Phase 2:** seed is small, traffic is small, and the `unstable_cache` layer inside `getCompanyBySlug` (Plan 02-03) already wraps the data fetch with a `company:${slug}` tag — so the ETL invalidation contract in Phase 4a DATA-10 is already honored.

### V5 — Slug regex at route boundary → **implemented in `page.tsx`**

**Decision:** `^[a-z0-9]+(-[a-z0-9]+)*$` fires as a route-module constant before `getCompanyBySlug`. Rationale: fast-404 (no DB round-trip), abuse rejection (arbitrary payloads never reach PostgREST), defense-in-depth alongside PostgREST's own parameterization.

**Where codified:** `SLUG_REGEX` constant at `page.tsx` line 42; `if (!SLUG_REGEX.test(slug)) notFound();` at line 48; regression coverage in render test #3 enumerating 7 malformed inputs.

## Handoff to Wave 5 (Plan 02-05 Seed) + Plan 02-06 Verification

Plan 02-05 seeds companies + aliases + funding rounds + identifiers into Supabase — the moment seeded slugs land, the route renders real data (manual visit to `/ko/companies/<slug>` in a live dev server).

Plan 02-06 flips the 11 `it.todo` smoke stubs from Plan 02-01 into live `it` blocks, running against `next dev` with the route now live. Expected coverage at this layer:

- `PROF-01` HTTP 200 on valid seed slug + 404 on missing/malformed slug.
- `PROF-02` hero fields visible + `rel="noopener noreferrer"` on website link (already green at component-unit scope via `company-logo.test.tsx`, re-verified end-to-end).
- `PROF-08` `@container` CSS directive present in shipped CSS (Plan 02-03 + this route's ISR cache).
- `TRUST-06` footer disclaimer auto-rendered (inherited from `(public)/layout.tsx`).

No handoff blockers. Route module is production-ready save for Phase 8's PROF-09 metadata, explicitly deferred.

## Self-Check: PASSED

- FOUND: `src/app/[locale]/(public)/companies/[slug]/page.tsx`
- FOUND: `src/app/[locale]/(public)/companies/[slug]/loading.tsx`
- FOUND: `src/app/[locale]/(public)/companies/[slug]/error.tsx`
- FOUND: `src/app/[locale]/(public)/companies/[slug]/not-found.tsx`
- FOUND: `tests/unit/company-page.render.test.tsx`
- FOUND commit: `bab2d79` (Task 1 — 4 route files)
- FOUND commit: `9e758fc` (Task 2 — render test)
- FOUND commit: `7fea829` (Task 1.1 — D-04 guardrail docstring fix)
- VERIFIED: `revalidate = 3600` exported from `page.tsx`
- VERIFIED: `dynamicParams = true` exported from `page.tsx`
- VERIFIED: `notFound()` appears ≥ 2 times in `page.tsx` (regex-reject + DB-miss)
- VERIFIED: SLUG_REGEX `^[a-z0-9]+(-[a-z0-9]+)*$` present in `page.tsx` line 42
- VERIFIED: `<Hero` < `<AliasList` < `<FundingRoundsTable` < `<IdentifierList` order in page body (lines 56-59)
- VERIFIED: `generateStaticParams` declaration absent (no matches after Task 1.1 fix)
- VERIFIED: D-04 guardrail grep `chart|news|similar|placeholder|coming.?soon|todo` returns 0 matches on `page.tsx` (after Task 1.1 fix)
- VERIFIED: `'use client'` at top of `error.tsx`
- VERIFIED: `profile.error` namespace used in `error.tsx`
- VERIFIED: `profile.notFound` namespace used in `not-found.tsx`
- VERIFIED: `aria-busy` present in `loading.tsx`
- VERIFIED: `tags: [`company:${slug}`]` contract still intact in `src/lib/data/companies.ts:231`
- VERIFIED: 7/7 render tests green; 64/64 total unit tests green
- VERIFIED: `npx tsc --noEmit` exit 0
