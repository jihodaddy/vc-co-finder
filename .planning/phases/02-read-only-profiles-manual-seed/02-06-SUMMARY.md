---
phase: 02-read-only-profiles-manual-seed
plan: 06
type: execute
status: complete
wave: 5
tasks_total: 2
tasks_completed: 2
tests_added: 20
---

# Plan 02-06: Phase 2 Smoke Test Suite — SUMMARY

## Outcome

- 11 `it.todo(...)` stubs replaced with 20 real HTTP assertions.
- Full suite green against `npm run dev`: **20/20 Phase 2 smoke tests pass**.
- 375 px mobile viewport human-verify approved (checkpoint #2).
- Stack of deferred bugs surfaced and fixed during execution: cookie-inside-cache RSC bug, vitest BASE_URL collision, Next.js 15 dev-mode 404-status behavior, plus 5 UI polish issues flagged during the mobile viewport review.

## Files created / modified

| Path | Change |
|------|--------|
| `tests/smoke/phase2-success-criteria.test.ts` | 20 real HTTP assertions (stage labels, formatKRW output, 출처 badge, freshness dot, footer disclaimer, not-found path) |
| `src/lib/data/companies.ts` | Switched to cookie-free anon client (cookies() forbidden inside unstable_cache) |
| `tests/unit/companies-data.test.ts` | Mock target updated from `@/lib/supabase/server` → `@supabase/supabase-js` |
| `src/components/site/header.tsx` + `mobile-nav.tsx` | Hamburger menu below `sm`; MobileNav is the only client component |
| `src/messages/{ko,en}.json` | New keys `header.nav.{menuLabel,openMenu,closeMenu}`; shorter `profile.source.badge` copy |
| `src/components/profile/AliasList.tsx` | Bold only when `aliasType === 'legal' && validTo === null` (single accented row) |
| `src/components/profile/IdentifierList.tsx` | `@container`-scoped: stacks SourceBadge below value at < 28rem, grid at ≥ 28rem |
| `src/components/profile/FundingRoundsTable.tsx` | `formatKRW(amountMinor)` wins over `originalText` for visible amount |

## Bugs fixed (all surfaced while running tests)

1. **RSC × cache incompatibility** — `fetchCompanyBySlug` was calling `createClient()` (which calls `cookies()`) inside `unstable_cache()`. Next 15 throws "Dynamic data sources not supported". Replaced with a cookie-free anon client built inline via `@supabase/supabase-js`. Public reads are gated by RLS (`canonical_select_public`), no cookie needed.
2. **Vitest `BASE_URL` collision** — Vite injects `process.env.BASE_URL = '/'` which broke `fetch(BASE_URL + path)` (tried to load `//ko/companies/toss` → invalid URL). Renamed smoke-test env var to `SMOKE_BASE_URL`.
3. **Next 15 dev-mode status quirk** — `notFound()` returns HTTP 200 in `next dev` even though it renders `not-found.tsx` correctly. Production `next start` emits 404. Test now accepts `[200, 404]` + asserts the 찾을 수 없 copy.
4. **Alias accent washout** — every `validTo === null` row was bold, killing the intended "one accent per section" rhythm (UI-SPEC §Color accent list item 3). Now only legal+current rows get the accent.
5. **Source badge overflow on 375 px** — "업데이트" suffix dropped; badge is now "출처: {sourceLabel} · {date}".
6. **Identifier 3-line wrap at 375 px** — 3-column grid could not fit label + hyphenated 사업자번호 + long SourceBadge. At < 28rem container width the badge is placed on a second line; desktop grid layout is preserved ≥ 28rem.
7. **억원 rendering hidden by original_text** — `originalText = "₩170B (2018, Sequoia lead)"` was overriding `formatKRW(170000000000) = "1,700억원"`. The visible amount is now always the Korean-format value (original_text still stored for audit).
8. **Header nav wrap below 640 px** — three text links + UserMenu crowd the bar at 375 px. Hamburger disclosure replaces the inline nav below `sm`.

## Deviations from plan

- **[Rule 3 — Scope creep avoided]** Plan Task 2 was pure human-verify, but the checkpoint surfaced 5 visual/UX bugs that clearly originated in Wave 3 components, not Wave 5 tests. These would have been filed as gap-closure plans; fixing them inline kept phase momentum and left the codebase ship-ready.
- **[Rule 2 — Runtime bug fix]** `companies.ts` switch to anon client was originally Plan 02-03 scope. Discovered through the smoke suite; fixed here because the defect blocked every smoke assertion.
- **[Rule 3 — Test infrastructure]** `SMOKE_BASE_URL` rename vs `BASE_URL` is a smoke-only contract and does not affect any other test file.

## Verification

```
npm run test:smoke       → 20 passed | 18 skipped (Phase 1 tests, deploy-deferred)
npx vitest run tests/unit → 76 passed | 0 failed
npx tsc --noEmit          → 0 errors
```

375 px human-verify: user approved all 5 polish fixes (hamburger, badge copy, legal-alias bold, identifier stacking, 억원 rendering).

## Commits

- `ee7bbee` test(02-06): fill phase2 smoke suite with real HTTP assertions
- `f7f5188` fix(02-06): cookie-free anon client + smoke test polish
- `93461bb` fix(02-06): mobile viewport polish — hamburger nav + compact source badge + layout fixes

## Handoff to Phase 3

- Phase 2 routes + components are production-viable; `/ko/companies/toss` renders real seeded data at all breakpoints.
- Smoke suite is the acceptance harness for any future touch of Hero / AliasList / FundingRoundsTable / IdentifierList — regressions will fail CI.
- Phase 3 SRCH-13 Korean regression suite can build on the same `messages/ko.json` profile.stage keys and the `formatKRW` helper without re-plumbing.
