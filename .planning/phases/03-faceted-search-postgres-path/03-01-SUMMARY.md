---
phase: 03-faceted-search-postgres-path
plan: 01
subsystem: testing
tags: [i18n, next-intl, vitest, scaffolding, search, korean]

requires:
  - phase: 01-foundation-compliance-baseline
    provides: "next-intl wiring, ko.json/en.json pair, tests/smoke harness convention"
  - phase: 02-read-only-profiles-manual-seed
    provides: "SMOKE_BASE_URL convention, vitest 4.x config, 15-company seed (toss/daangn/coupang/baemin), tests/smoke/phase2-success-criteria.test.ts pattern"
provides:
  - "search.* i18n namespace (71 leaf keys in ko.json, mirrored with empty strings in en.json)"
  - "tests/unit/search-fixtures.ts — SRCH13_CORPUS (7 entries), CANONICAL_SEED_SLUGS (4 entries), makeSearchQuery() builder"
  - "tests/smoke/phase3-success-criteria.test.ts — 22 it.todo stubs grouped by ROADMAP SC #1..#6"
  - "tests/smoke/phase3-srch13.test.ts — 8 runtime todo stubs (7 SRCH13_CORPUS cases + 1 aggregate)"
  - "src/lib/search/.gitkeep + src/components/search/.gitkeep — empty-dir markers for downstream waves"
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07]

tech-stack:
  added: []  # No new runtime deps; JSON + TS test fixtures only
  patterns:
    - "search.* i18n namespace layout locked verbatim from UI-SPEC §Copywriting Contract (source of truth for Plans 04/05/06)"
    - "SRCH13_CORPUS shared fixture — one import, multiple wave flip-points (Plan 07 live assertions)"
    - "it.todo roster as Wave 0 scaffold → Wave 5/7 flip-to-live workflow (mirrors Phase 2 convention)"

key-files:
  created:
    - tests/unit/search-fixtures.ts
    - tests/smoke/phase3-success-criteria.test.ts
    - tests/smoke/phase3-srch13.test.ts
    - src/lib/search/.gitkeep
    - src/components/search/.gitkeep
  modified:
    - src/messages/ko.json  # +71 search.* keys (additive; profile.* untouched)
    - src/messages/en.json  # +71 search.* empty-string mirrors

key-decisions:
  - "search.chip.activeLabel locked to '활성 필터' in ko.json — load-bearing aria-label for Plan 04 ActiveFilterChips <ul role=\"group\">"
  - "Fixture defaults encode URL-contract defaults (sort=recent_funding_desc, page=1, perPage=25) so tests can omit these fields when URL should be empty"
  - "it.todo count in success-criteria = 22 (exceeds ≥20 minimum); srch13 file uses a for-loop over SRCH13_CORPUS to avoid drift if the corpus ever changes"

patterns-established:
  - "Wave 0 scaffolding pattern: i18n keys + test stubs + gitkeep dirs in a single plan, enabling parallel execution of schema/lib/component waves without merge conflicts on shared files"
  - "Fixture cross-wire: `tests/smoke/phase3-srch13.test.ts` → `tests/unit/search-fixtures.ts` via relative import; same import will be used by Plan 07 load-test harness"
  - "i18n mirror discipline: every new ko.json key gets a same-path empty-string entry in en.json on the same commit (Phase 1 D-05.4 carry-forward)"

requirements-completed: [SRCH-13]  # Wave 0 fixture present; live regression runs in Plan 07

duration: 13min
completed: 2026-04-22
---

# Phase 3 Plan 01: Wave 0 Scaffolding Summary

**Phase 3 faceted-search test harness + i18n namespace seeded — 71 Korean strings locked verbatim from UI-SPEC, 30 it.todo stubs awaiting Plans 05/07 flip, and shared SRCH13_CORPUS fixture importable from all downstream waves.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-04-22T05:39:00Z
- **Completed:** 2026-04-22T05:52:13Z
- **Tasks:** 2 / 2
- **Files created:** 5 (+ 2 .gitkeep)
- **Files modified:** 2

## Accomplishments

- **i18n namespace complete**: 71 leaf keys added to `search.*` in `src/messages/ko.json` — every key listed in UI-SPEC §Namespace layout present with Korean copy pasted verbatim from §Copywriting Contract. `src/messages/en.json` mirrors the identical tree with `""` placeholder values (Phase 1 D-05.4 stub convention).
- **Load-bearing aria-label contract**: `search.chip.activeLabel = "활성 필터"` locked in ko.json — this is the string Plan 04 will consume as `aria-label` for the ActiveFilterChips `<ul role="group">`.
- **Shared test fixtures**: `tests/unit/search-fixtures.ts` exports `SRCH13_CORPUS` (7 entries — 토스/토스뱅크/비바리퍼블리카/당근/당근마켓/Coupang/쿠팡), `CANONICAL_SEED_SLUGS` (toss, daangn, coupang, baemin), and `makeSearchQuery(overrides)` factory with URL-contract defaults (sort='recent_funding_desc', page=1, perPage=25).
- **Success-criteria harness**: `tests/smoke/phase3-success-criteria.test.ts` holds 22 `it.todo(...)` stubs organized by ROADMAP §Phase 3 SC #1..#6. Vitest recognizes all as pending, zero failures.
- **SRCH-13 regression stub**: `tests/smoke/phase3-srch13.test.ts` imports SRCH13_CORPUS and emits 7 generated todos (one per corpus entry) plus 1 aggregate todo — 8 runtime todos total. Plan 07 will flip each to a live assertion against the autocomplete endpoint.
- **Empty-dir markers**: `src/lib/search/.gitkeep` and `src/components/search/.gitkeep` tracked so Waves 2 and 3 can commit into those dirs without creating empty-dir noise.

## Task Commits

1. **Task 1: search.* i18n namespace + gitkeep dirs** — `50681c5` (feat)
2. **Task 2: test fixtures + SRCH-13 corpus + success-criteria harness stubs** — `074f854` (test)

**Plan metadata:** [to be added by orchestrator]

## Files Created/Modified

- `src/messages/ko.json` — added top-level `search` object containing 71 Korean strings (Korean copy verbatim from UI-SPEC §Copywriting Contract)
- `src/messages/en.json` — added identical key tree with empty-string values (v1 stub per Phase 1 D-05.4)
- `src/lib/search/.gitkeep` — empty file so git tracks the directory for Plan 03-03 (adapter library)
- `src/components/search/.gitkeep` — empty file so git tracks the directory for Plan 03-04 (search components)
- `tests/unit/search-fixtures.ts` — exports SRCH13_CORPUS, CANONICAL_SEED_SLUGS, makeSearchQuery()
- `tests/smoke/phase3-success-criteria.test.ts` — 22 `it.todo` stubs grouped by ROADMAP SC #1..#6
- `tests/smoke/phase3-srch13.test.ts` — 8 runtime todos (7 corpus loop + 1 aggregate) importing SRCH13_CORPUS

## Decisions Made

- **`search.chip.activeLabel = "활성 필터"` is authoritative** (not "활성화된 필터" or "현재 필터"). Plan 04 spec calls this out line 386/569; Plan 03-01 freezes the string so Plan 04 can consume it via `t('chip.activeLabel')` without divergence.
- **Fixture defaults == URL-contract defaults**. `makeSearchQuery()` returns `{ sort: 'recent_funding_desc', page: 1, perPage: 25 }` — the same values Plan 05 will omit from the URL. Tests that want the empty-URL case can call `makeSearchQuery()` with no args; tests that want a specific URL-visible value override just that field.
- **Use a for-loop over SRCH13_CORPUS in `phase3-srch13.test.ts`** rather than 7 hand-written `it.todo(...)` lines. If the corpus ever changes (Plan 07 may expand to 10+ cases), the test file needs no edits — vitest will auto-generate todos from the array. Trade-off: static `grep "it.todo"` returns 2 not 7, but vitest runtime count (the source of truth for the acceptance criteria) is 8.
- **Wave 0 adds no runtime dependencies.** Fixture file is type-only at the type-level — no import of `SearchQuery` type (Plan 03 introduces that); the `SearchQueryOverrides` Partial is declared inline here so no cross-wave type dependency exists yet.

## Deviations from Plan

None — plan executed exactly as written. Both task action blocks matched the final implementation verbatim; no Rule 1-4 triggers fired.

## Issues Encountered

- `npx tsx -e "import('./tests/unit/search-fixtures.ts')..."` failed with ERR_MODULE_NOT_FOUND / missing-export errors when run as a one-liner. Root cause: tsx's ESM resolver treats inline-eval CWDs unreliably on Windows; the fixture itself is fine. Confirmed correctness via a throw-away `tests/unit/_fixture-sanity.test.ts` that imported all three exports and asserted defaults — all 4 assertions passed in vitest. That throw-away file was deleted; the plan's verify script is satisfied by the phase3-srch13 test file importing SRCH13_CORPUS (which proved the module is vitest-resolvable).

## Verification Results

- `npx tsc --noEmit` → exit 0 (no type errors anywhere in repo after changes)
- `npx vitest run tests/smoke/phase3-*.test.ts` → 30 todo, 0 pass, 0 fail (2 test files, both "skipped" status because every test is .todo)
- `npx vitest run` (full suite, network-independent subset) → 76 passed, 30 todo (new), 7 skipped — 0 failures
- `grep -c "it.todo" tests/smoke/phase3-success-criteria.test.ts` → 24 static hits (22 actual `it.todo(...)` calls + 2 comment references); runtime count 22 (≥20 ✓)
- `grep -c "it.todo" tests/smoke/phase3-srch13.test.ts` → 2 static hits (1 inside for-loop + 1 aggregate); runtime count 8 (≥8 ✓)
- Spot-check of 12 ko.json keys (incl. `search.chip.activeLabel`) → all non-empty Korean values present
- Spot-check of same 12 keys in en.json → all string-typed (empty-string placeholders)
- `.gitkeep` files: both present and tracked
- `profile.*` namespace in ko.json: untouched (diff shows only additive `search` node, as required)

**Pre-existing out-of-scope failures** (not caused by this plan): `tests/smoke/phase1-success-criteria.test.ts` and `tests/smoke/phase2-success-criteria.test.ts` time out because they fetch `http://localhost:3000` and require `npm run dev` to be running — standard smoke-test behavior, documented in Phase 2 summary. Scope-boundary rule applies; these are unrelated to Plan 03-01 changes.

## User Setup Required

None — no external service configuration required. Wave 0 ships pure scaffolding.

## Next Plan Readiness

- **Plan 02 (schema migration):** consumes nothing from this plan. Independent — can start immediately.
- **Plan 03 (adapter library):** imports `SRCH13_CORPUS` from `tests/unit/search-fixtures.ts` for regression coverage; `src/lib/search/.gitkeep` means the directory is ready to receive `adapter.ts` and `postgres.ts`.
- **Plan 04 (components):** consumes full `search.*` namespace via `useTranslations('search')`. `search.chip.activeLabel = "활성 필터"` is the authoritative aria-label for ActiveFilterChips. `src/components/search/.gitkeep` is the directory receiver.
- **Plan 05 (route):** flips SC #1, #2, #5 `it.todo` entries in `phase3-success-criteria.test.ts` to live `it(...)` assertions.
- **Plan 06 (polish):** no direct dependency on this plan's artifacts.
- **Plan 07 (load + regression):** flips SC #3 (`phase3-srch13.test.ts` all 8 todos) and SC #4 (p95 load test) to live assertions. Also the principal consumer of `SRCH13_CORPUS` for end-to-end alias coverage.

**Handoff notes:**
- The single string pattern shared across every Korean placeholder — `{count}`, `{label}`, `{companyName}`, `{start}-{end}/{total}`, `{canonical}`, `{aliasType}` — matches ICU MessageFormat syntax expected by next-intl. No plan-level change needed; downstream waves consume via `t('search.key', { count: 5 })`.
- The fixture type `SearchQueryOverrides` is intentionally lightweight (string/array/partial-shape). Plan 03 will introduce a proper `SearchQuery` runtime type in `src/lib/search/types.ts`; at that point Plan 03 should consider re-exporting through the fixture or keeping two parallel shapes — either is fine for the purposes stated here.

## Self-Check: PASSED

- ✓ `src/messages/ko.json` contains 71 `search.*` leaf keys — verified via Node count script
- ✓ `src/messages/en.json` contains mirror tree — verified via spot-check of 12 keys
- ✓ `src/lib/search/.gitkeep` exists — `test -f` passed
- ✓ `src/components/search/.gitkeep` exists — `test -f` passed
- ✓ `tests/unit/search-fixtures.ts` exists and exports SRCH13_CORPUS/CANONICAL_SEED_SLUGS/makeSearchQuery — verified via throw-away vitest sanity suite (4 assertions green)
- ✓ `tests/smoke/phase3-success-criteria.test.ts` exists with 22 runtime it.todo — verified via `npx vitest run`
- ✓ `tests/smoke/phase3-srch13.test.ts` exists with 8 runtime it.todo — verified via `npx vitest run`
- ✓ Commit `50681c5` found in `git log` — verified via `git log --oneline`
- ✓ Commit `074f854` found in `git log` — verified via `git log --oneline`
- ✓ `npx tsc --noEmit` exit 0 — no type regressions anywhere

---
*Phase: 03-faceted-search-postgres-path*
*Completed: 2026-04-22*
