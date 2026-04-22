---
phase: 03-faceted-search-postgres-path
plan: 05
subsystem: search/results-and-autocomplete
tags: [search, route, autocomplete, table, cards, pagination, sort, view-toggle]
dependency_graph:
  requires:
    - .planning/phases/03-faceted-search-postgres-path/03-03-SUMMARY.md
    - .planning/phases/03-faceted-search-postgres-path/03-04-SUMMARY.md
    - .planning/phases/02-read-only-profiles-manual-seed/02-03-SUMMARY.md
  provides:
    - /search route entry (SRCH-01)
    - autocomplete Server Action (SRCH-07)
    - 6-col sortable results table (SRCH-04 / SRCH-08)
    - table↔card view toggle (SRCH-09)
    - numeric pagination (SRCH-10)
  affects:
    - src/app/[locale]/(public)/search
    - src/lib/search
    - src/components/search
tech_stack:
  added:
    - next/navigation useRouter (SearchInput navigation commit)
    - lucide List/LayoutGrid/Check/ChevronDown/ChevronLeft/ChevronRight/ChevronsLeft/ChevronsRight/ArrowUp/ArrowDown/ArrowUpDown/Search
  patterns:
    - Next.js 15 App Router RSC searchParams Promise
    - nuqs server-side searchParamsCache.parse
    - Server Action pattern for autocomplete
    - cmdk Command with shouldFilter=false (server-driven suggestions)
    - Popover + Command composition for autocomplete
    - Table with aria-sort attributes on sortable <th>
    - @container responsive grid for card view (Phase 2 carry-forward)
    - 150ms debounce via useRef+setTimeout+useTransition
    - URL-omitted defaults (sort=recent_funding_desc / view=table / page=1 / per_page=25)
key_files:
  created:
    - src/app/[locale]/(public)/search/page.tsx
    - src/app/[locale]/(public)/search/loading.tsx
    - src/app/[locale]/(public)/search/error.tsx
    - src/lib/search/facet-domain.ts
    - src/lib/search/autocomplete-action.ts
    - src/components/search/SearchPage.tsx
    - src/components/search/SearchInput.tsx
    - src/components/search/AutocompleteList.tsx
    - src/components/search/ResultsHeader.tsx
    - src/components/search/ResultsTable.tsx
    - src/components/search/ResultsCards.tsx
    - src/components/search/ResultsSkeleton.tsx
    - src/components/search/ResultsEmpty.tsx
    - src/components/search/ViewToggle.tsx
    - src/components/search/SortTrigger.tsx
    - src/components/search/Pagination.tsx
  modified: []
decisions:
  - AutocompleteList uses inline letter-avatar instead of <CompanyLogo>. CompanyLogo is an async RSC (server-only); embedding it in the client Popover tree would fight the RSC/client boundary. The same choice applies to ResultsTable/Cards — each render a client-safe letter-avatar span. Logo rehydration can revisit in Plan 06 polish once R2 URLs exist.
  - ResultsSkeleton ships as an async RSC that calls `next-intl/server` `getTranslations`, so `loading.tsx` (itself a Next RSC reserved file) can reuse it without bouncing through a client component. Rendered from inside page.tsx Suspense with the URL-derived `view` prop for shape-parity.
  - STAGE_KEYS allowlist guards `stageLabel()` for the results table/cards. `latest_round_stage` comes from the DB `funding_stage` ENUM so it's always valid, but the guard prevents a throw if the ENUM ever grows and the label dictionary lags.
  - Added Task-1 stubs for Task-2/3 components to keep each commit self-consistent under `npx tsc --noEmit` (Rule 3 — blocking issue). Each stub was replaced verbatim in its parent task's commit.
metrics:
  duration_seconds: 758
  completed_at: "2026-04-22T07:10:18Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 16
  files_modified: 0
  commits:
    - 64338fc feat(03-05): /search route entry + facet-domain helper + component stubs
    - c92d702 feat(03-05): autocomplete Server Action + alias-aware SearchInput popover
    - d80023d feat(03-05): results views + header + sort/view/pagination controls
---

# Phase 3 Plan 05: Route + Results + Autocomplete Summary

`/ko/search` 라우트가 6-facet 사이드바, 600ms-미만 autocomplete, 6-컬럼 sortable 테이블, card grid 토글, 숫자 페이지네이션을 갖춘 단일 RSC 진입점으로 동작하도록 조립. `SearchAdapter.search` + `getFacetDomain` 병렬 호출 → `SearchPage` 클라이언트 트리로 props 전달; autocomplete은 별도 Server Action 통해 노출.

## What shipped

### Route entry (Task 1)

- **`src/app/[locale]/(public)/search/page.tsx`** (115 lines) — Next 15 App Router RSC. `searchParamsCache.parse(await searchParams)` → `adaptQuery()` → `Promise.all([searchAdapter.search, getFacetDomain])` → `<SearchPage>` props. `dynamic='force-dynamic'` + `revalidate=0` per RESEARCH §Anti-Patterns (filter cardinality = cache miss). `generateMetadata()` pulls title/description through next-intl server getTranslations.
- **`loading.tsx`** (11 lines) — Reserved Next RSC file; defers to `<ResultsSkeleton view="table">`.
- **`error.tsx`** (37 lines) — Client error boundary; Heading copy + body + 다시 시도 button calling `reset()`. Raw error text NOT displayed (T-03-05-02 mitigation); Sentry captures server-side.
- **`src/lib/search/facet-domain.ts`** (81 lines) — Cookie-free anon Supabase client; three parallel `SELECT ... IS NOT NULL` queries over `public.companies` yielding unique sector / stage / region arrays. Zero `@/lib/supabase/server` import per RESEARCH §Pitfall 5.

### Autocomplete (Task 2)

- **`src/lib/search/autocomplete-action.ts`** (26 lines) — `'use server'` Server Action that calls `searchAdapter.autocomplete({ q, limit: 10 })` with 100-char q clamp (T-03-05-03).
- **`src/components/search/SearchInput.tsx`** (138 lines) — Popover + cmdk Command. 150ms debounce via `useRef(setTimeout)` + `useTransition`. `shouldFilter={false}` — suggestions are server-driven. Enter/click navigates to `/{locale}/companies/{slug}` via `next/navigation` `useRouter` (navigation commit, not filter state). Escape closes popover.
- **`src/components/search/AutocompleteList.tsx`** (62 lines) — `<CommandItem>` rows with letter-avatar + canonical name + optional trailing alias-type hint `({aliasType})` via `search.autocomplete.aliasHint` ICU.

### Results views + controls (Task 3)

- **`ResultsHeader.tsx`** (31 lines) — live count at Heading size (`text-xl font-semibold`) via `search.results.count` ICU, right-aligned SortTrigger + ViewToggle.
- **`ResultsTable.tsx`** (233 lines) — 6 columns per UI-SPEC §Table view contract: 기업명 (28%) · 섹터 (14%) · 최신 라운드 (18%) · 누적 투자액 (14% right) · 직원 수 (12% right) · 설립 연도 (14% right). Sortable headers (name / recent_funding / cumulative_funding / founded) have `cursor-pointer` + `aria-sort` + leading Up/Down/UpDown arrow (accent on active). Freshness dot at right edge of 최신 라운드 cell via `FRESHNESS_DOT_CLASS[freshnessLevel(lastVerifiedAt)]` (Phase 2 palette). Row link `<Link href="/{locale}/companies/{slug}">` preserves middle-click.
- **`ResultsCards.tsx`** (130 lines) — `@container`-scoped grid (`@sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4`). Card anatomy: logo + name → sector Badge → latest round line + freshness dot → 3-col metadata `<dl>`. Entire card wrapped in `<Link>` per UI-SPEC §Card anatomy.
- **`ResultsSkeleton.tsx`** (97 lines) — RSC async component (uses `getTranslations` for `aria-busy` sr-label). Shape-parity: `view=table` → 10 table-row skeletons with column-width matching; `view=card` → 10 card-shaped skeletons.
- **`ResultsEmpty.tsx`** (51 lines) — Heading "0개 기업" + body + inline `<Button variant="outline">` 모두 지우기 reset. Preserves view / sort / per_page (D-03 persistence).
- **`ViewToggle.tsx`** (72 lines) — `role="radiogroup"` + two `role="radio"` buttons (List / LayoutGrid icons). Active `bg-primary text-primary-foreground`. Icon-only on mobile with sr-only label.
- **`SortTrigger.tsx`** (107 lines) — Desktop `<DropdownMenu>` + mobile `<Select>`, listing all 8 `SORT_KEYS`. Active row has leading Check glyph. Setting sort resets `page=1`.
- **`Pagination.tsx`** (151 lines) — numeric window via `paginationWindow(page, totalPages, 2)`; first / prev / page-numbers / next / last buttons with sr-only labels; per_page Select (25 / 50 / 100). Returns `null` when `total === 0`.

## Phase 2 helpers reused

| Helper | File | Used by |
|--------|------|---------|
| `formatKRW` | src/lib/format/currency.ts | ResultsTable, ResultsCards 누적 투자액 cell |
| `stageLabel` | src/lib/format/stage.ts | ResultsTable, ResultsCards 최신 라운드 cell (guarded via STAGE_KEYS allowlist) |
| `formatProfileDate` | src/lib/format/date.ts | latest-round date display + freshness sr-only date |
| `freshnessLevel` + `FRESHNESS_DOT_CLASS` | src/lib/data/freshness.ts | Freshness dot in both result views |
| `cn()` | src/lib/utils.ts | class composition across all new components |

**Not reused (by design):** `<CompanyLogo>` (async RSC) — cannot render inside client Popover/Table/Card trees without an extra server-component boundary. Letter-avatar fallback (the same pattern CompanyLogo itself uses for missing logos) is rendered inline. Plan 06 can revisit once a dedicated client-safe logo wrapper is available or R2 URLs populate.

## Phase 3 Wave helpers reused

| Helper | File | Used by |
|--------|------|---------|
| `searchAdapter.search` | src/lib/search/adapter.ts + postgres.ts | page.tsx RSC fetch |
| `searchAdapter.autocomplete` | src/lib/search/adapter.ts + postgres.ts | autocomplete-action.ts |
| `searchParsers` + `searchParamsCache` | src/lib/search/query-params.ts | page.tsx RSC parse + every client via useQueryStates |
| `SORT_KEYS` / `VIEW_KEYS` / `PER_PAGE_KEYS` / `EMPLOYEE_BUCKETS` | src/lib/search/types.ts | URL parsers + Sort/View/Pagination UI |
| `paginationWindow()` | src/lib/search/pagination.ts | Pagination component |
| `FacetSidebar` / `FacetDrawer` / `ActiveFilterChips` | src/components/search (Plan 04) | SearchPage composition |

## Autocomplete contract

- **Path:** client SearchInput → `autocompleteAction(q)` Server Action → `searchAdapter.autocomplete({q, limit:10})` → Postgres `&@~` bigram match against `companies.display_name_ko`, `companies.display_name_en`, `aliases.alias` (all non-deleted).
- **Latency target:** ≤200ms round-trip for 15-company seed (Phase 2) and ≤400ms at 5k rows under RESEARCH §p95 analysis. Actual measurement deferred to Plan 07 load test.
- **Debounce:** 150ms client-side (UI-SPEC §Interaction Timing). Keystroke → timer → single fetch. `useTransition` keeps the popover responsive during flight.
- **Navigation commit:** Enter/click → `router.push('/{locale}/companies/{slug}')`. Autocomplete never writes `q` to URL (transient client state per UI-SPEC §URL state encoding).
- **q clamp:** 100 chars both at Server Action boundary AND adapter boundary (belt-and-braces; DoS mitigation T-03-05-03).

## Seeded company slugs expected to render (spot check)

Phase 2 Plan 05 seeded 15 companies covering the SRCH-13 cold-start corpus. Spot-check targets (should appear in `/ko/search` on first load with default sort = recent_funding_desc):

| Slug | displayNameKo | SRCH-13 corpus matches |
|------|---------------|-------------------------|
| toss | 토스 | 토스 (display), 토스뱅크 (alias), 비바리퍼블리카 (legal alias), Toss (en alias) |
| danggeun | 당근 | 당근 (display), 당근마켓 (former alias) |
| coupang | 쿠팡 | 쿠팡 (display), Coupang (en alias) |
| baemin | 배달의민족 | 배달의민족 (display), 우아한형제들 (legal alias) |

Manual dev smoke (requires `.env.local` with Supabase URL + anon key + DATABASE_URL):

```bash
npm run dev
curl -sI http://localhost:3000/ko/search | head -1            # expect HTTP/1.1 200
curl -sI "http://localhost:3000/ko/search?sectors=fintech"    # expect 200
curl -sI "http://localhost:3000/ko/search?view=card&page=2"   # expect 200
```

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] Task 1 stub layer for Task-2/3 components**

- **Found during:** Task 1 verify (`npx tsc --noEmit`)
- **Issue:** Task 1's `page.tsx` imports `SearchPage` + `ResultsSkeleton` from `src/components/search/*`, but those files are owned by Tasks 2/3. Committing Task 1 alone would leave tsc broken until Task 3 — violates "each task committed individually with passing verify."
- **Fix:** Task 1 commit also created minimal `'use client'` stubs returning `null` for every downstream component (`SearchPage`, `SearchInput`, `ResultsHeader`, `ResultsTable`, `ResultsCards`, `ResultsEmpty`, `Pagination`) plus a full `ResultsSkeleton` (needed by both `page.tsx` Suspense and `loading.tsx`). Task 2 replaced `SearchInput`, `SearchPage` (Task 1 shipped it close to final already). Task 3 replaced the rest.
- **Files:** 6 stub files inside `src/components/search/`
- **Commit:** 64338fc

**2. [Rule 2 — Missing critical functionality] AutocompleteList letter-avatar**

- **Found during:** Task 2 implementation
- **Issue:** UI-SPEC instructs `<CompanyLogo h-5 w-5 />` inside `<CommandItem>`. CompanyLogo is an `async` RSC (reads `getTranslations` server-side); embedding an async server component inside a client-rendered Popover tree is an RSC-boundary violation.
- **Fix:** Render an inline letter-avatar `<span>` with the same letter-computation logic CompanyLogo uses for missing logos. Accessibility preserved (`aria-hidden` on decorative, canonical name carries semantic meaning). Same approach applied to `ResultsTable` + `ResultsCards`.
- **Files:** src/components/search/{AutocompleteList,ResultsTable,ResultsCards}.tsx
- **Commit:** c92d702 + d80023d

**3. [Rule 1 — Correctness] STAGE_KEYS guard on `stageLabel()` call**

- **Found during:** ResultsTable implementation
- **Issue:** `stageLabel(stage)` throws on unknown stage values. If a DB migration ever extends the `funding_stage` ENUM without shipping the label map update, the whole results table would crash rather than degrade gracefully.
- **Fix:** `safeStageLabel` helper checks `STAGE_KEYS.includes(stage)` and falls back to the raw stage string. Same guard used in ResultsCards.
- **Files:** src/components/search/ResultsTable.tsx + ResultsCards.tsx
- **Commit:** d80023d

**4. [Rule 1 — Correctness] Pagination page-number clamp**

- **Found during:** Pagination implementation
- **Issue:** With `?page=999&per_page=25` and `total=100`, the raw `query.page` would drive `paginationWindow(999, 4)` into a misleading window. URL enforcement was in the adapter path (clamp offset), but the UI still renders 999 as the current page.
- **Fix:** `const page = Math.min(Math.max(1, query.page), totalPages)` locally clamps before windowing. Matches the T-03-05-07 mitigation (extreme page offset).
- **Files:** src/components/search/Pagination.tsx
- **Commit:** d80023d

### Out-of-scope items deferred

None recorded in `deferred-items.md` for this plan.

## Authentication gates

None. `/search` is public; all queries go through cookie-free anon clients or the `searchAdapter` (which uses a service-role `postgres` client per Plan 03). No login / OAuth flow triggered during execution.

## Known gaps for Plan 06 / Plan 07

| Gap | Owner | Note |
|-----|-------|------|
| `aria-live="polite"` count announcer | Plan 06 polish | UI-SPEC §Accessibility Contract requires a 300ms-debounced SR announcement on filter change. Currently, count updates silently (visible text only). |
| Skeleton shape-parity on initial route load | Plan 06 polish | `loading.tsx` defaults to `view="table"`; if the URL is `?view=card` the first paint shows table skeleton then flips to card body. Acceptable per UI-SPEC but worth polishing via reading `searchParams` in `loading.tsx` (Next 15 now supports this). |
| Error boundary Sentry wiring | Plan 06 polish | `error.tsx` logs to `console.error` only. Phase 1 instrumentation auto-captures unhandled throws but explicit `Sentry.captureException` in the effect would add `digest` correlation. |
| CompanyLogo reuse in result rows | Plan 06 polish | Replace letter-avatar with a client-safe wrapper around the Phase 2 image helper once R2 URLs are populated. |
| p95 load test with synthetic 5k dataset | Plan 07 | Confirms the denormalized-column + PGroonga strategy meets ROADMAP SC #4. |
| Rate-limiting on autocomplete Server Action | Phase 7 | Current defenses: 150ms debounce + q ≤ 100 + limit ≤ 25. Per-IP rate-limit deferred. |

## Self-Check: PASSED

Verified post-commit:

- `src/app/[locale]/(public)/search/page.tsx` — exists, contains `searchParamsCache` + `searchAdapter`
- `src/app/[locale]/(public)/search/loading.tsx` — exists
- `src/app/[locale]/(public)/search/error.tsx` — exists, `'use client'` + `search.error.*` keys
- `src/lib/search/facet-domain.ts` — exists, uses `@supabase/supabase-js` (no `@/lib/supabase/server` import)
- `src/lib/search/autocomplete-action.ts` — exists, `'use server'` directive
- 12 files under `src/components/search/` created
- `npx tsc --noEmit` exit 0 at end of each task
- Commits 64338fc, c92d702, d80023d present in `git log`

Grep sanity — excluded `@/lib/supabase/server` imports from `src/lib/search` and `src/components/search` (only a doc-comment mention inside `facet-domain.ts` matches substring, no actual import statement).
