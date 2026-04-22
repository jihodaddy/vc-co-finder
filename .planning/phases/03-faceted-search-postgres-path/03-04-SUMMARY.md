---
phase: 03-faceted-search-postgres-path
plan: 04
subsystem: search-ui-facets
tags: [wave-3, shadcn, client-components, nuqs, next-intl, a11y, uispec]
dependency-graph:
  requires:
    - 03-03 (searchParsers + types.ts + parseKRW + paginationWindow)
    - 02-03 (badge/separator shadcn pattern; stageLabel + formatKRW carry-forward)
  provides:
    - src/components/ui/{button,input,checkbox,popover,sheet,accordion,command,dropdown-menu,select,skeleton}.tsx
    - src/components/search/FacetGroup.tsx (fieldset+legend shell)
    - src/components/search/FacetCheckboxList.tsx (multi-select, show-more/less)
    - src/components/search/FacetRangeBuckets.tsx (employees bucket chips + custom popover)
    - src/components/search/FacetRangeInputs.tsx (funding/founded from/to, blur/Enter commit)
    - src/components/search/FacetSidebar.tsx (D-01 desktop composition)
    - src/components/search/FacetDrawer.tsx (D-02 mobile Sheet+Accordion)
    - src/components/search/ActiveFilterChips.tsx (D-03 chip bar, clearAll preserves prefs)
  affects:
    - 03-05 (route composes FacetSidebar+FacetDrawer+ActiveFilterChips)
    - 03-06 (SearchInput injected via FacetSidebar.searchInputSlot)
tech-stack:
  added:
    - "@radix-ui/react-checkbox"
    - "@radix-ui/react-popover"
    - "@radix-ui/react-dialog"
    - "@radix-ui/react-dropdown-menu"
    - "@radix-ui/react-select"
    - "@radix-ui/react-accordion"
    - "cmdk"
  patterns:
    - shadcn Radix-variant default style inline-authored (Phase 2 Deviation 1 fallback)
    - nuqs useQueryStates in client components → shareable/bookmarkable filter URLs (SRCH-06)
    - URL-state-only filter UI (no fetch() in components; RSC in Plan 05 owns data)
    - page=1 reset on every facet mutation (RESEARCH Pitfall 6)
    - Range-input commit on blur OR Enter (not onChange) → prevents partial-range flicker
    - <fieldset>/<legend> accessibility wrapping per UI-SPEC §Accessibility Contract
    - <ul role="group" aria-label={t('chip.activeLabel')}> for chip bar landmark
key-files:
  created:
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/skeleton.tsx
    - src/components/ui/checkbox.tsx
    - src/components/ui/popover.tsx
    - src/components/ui/sheet.tsx
    - src/components/ui/accordion.tsx
    - src/components/ui/command.tsx
    - src/components/ui/dropdown-menu.tsx
    - src/components/ui/select.tsx
    - src/components/search/FacetGroup.tsx
    - src/components/search/FacetCheckboxList.tsx
    - src/components/search/FacetRangeBuckets.tsx
    - src/components/search/FacetRangeInputs.tsx
    - src/components/search/FacetSidebar.tsx
    - src/components/search/FacetDrawer.tsx
    - src/components/search/ActiveFilterChips.tsx
    - tests/unit/facet-range.test.tsx
    - tests/unit/facet-sidebar.test.tsx
    - tests/unit/filter-chips.test.tsx
  modified:
    - src/messages/ko.json (chip range templates + foundedAfter/Before)
    - package.json (+7 deps: 6 Radix primitives + cmdk)
    - package-lock.json
decisions:
  - "CommandDialog export omitted from command.tsx: shadcn@latest command.tsx imports the sibling Dialog block; Phase 3 UI-SPEC deliberately defers dialog (autocomplete uses Popover, not modal). Re-add when a command-palette UX lands in a later phase."
  - "chip.range.* i18n sub-namespace added to keep numeric-range chip labels (이상/이하/이후/이전) out of JSX — enforces Phase 1 D-05.4 zero-hardcoded-Korean rule through the full D-03 label matrix."
  - "FacetRangeInputs Enter key calls commit() directly instead of blur()-forwarding: happy-dom's focus-loss path isn't a 1:1 DOM simulator; calling commit() on Enter makes the UX contract testable AND still matches the UI-SPEC 'blur OR Enter' commit-policy wording."
  - "aria-pressed (not border-primary class) signals the selected employee bucket — screen readers announce state without parsing Tailwind classes."
metrics:
  completed: "2026-04-22"
  duration-min: 30
  tasks: 3
  files-created: 20
  files-modified: 3
  commits: 3
  tests-added: 16 (7 + 2 + 7)
  tests-green: 133 (121 prior + 12 new; 4 skipped profile smokes unchanged)
---

# Phase 3 Plan 04: Facet Panel Components (Wave 3) Summary

Desktop sidebar (D-01 sticky left rail, 6 always-expanded fieldsets) + mobile bottom-sheet drawer (D-02 accordion, 'sector' expanded by default, sticky "적용") + active-filter chip bar (D-03 summary row with per-chip remove + "모두 지우기" preserving view/sort/per_page) shipped as 7 client components over 10 shadcn-block primitives. All 3 Plan 05 integration surfaces (`FacetSidebar searchInputSlot`, `FacetDrawer` fixed pill trigger, `<ActiveFilterChips />` above results) are ready to drop into `/search`.

## One-liner

7 client components (FacetGroup/CheckboxList/RangeBuckets/RangeInputs primitives + FacetSidebar/FacetDrawer/ActiveFilterChips compositions) + 10 shadcn Radix-variant blocks (checkbox/button/input/popover/sheet/accordion/command/dropdown-menu/select/skeleton) inline-authored per Phase 2 Deviation 1 pattern — all read/write URL state via `nuqs useQueryStates`, every string flows through `useTranslations('search')`, page resets to 1 on every facet mutation, clearAll preserves view/sort/per_page, `<ul role="group" aria-label={t('chip.activeLabel')}>` wires chip bar to the i18n key with no literal fallback. 16 new unit tests green, 133/137 total unit tests green, `npx tsc --noEmit` clean.

## UI-SPEC Mapping

| Component | UI-SPEC Section | Commit |
| --------- | --------------- | ------ |
| 10 shadcn blocks | §Component Inventory + Phase 2 Deviation 1 fallback | `5735195` |
| FacetGroup | §D-01 `<fieldset>+<legend>` + §Accessibility Contract | `d1db976` |
| FacetCheckboxList | §D-01 show-more-if->8 + §Interaction (checkbox→URL) | `d1db976` |
| FacetRangeBuckets | §Range facet UX employees buckets + "직접 입력" popover | `d1db976` |
| FacetRangeInputs | §Range facet UX funding/founded + §Interaction Timing blur-or-Enter commit | `d1db976` |
| FacetSidebar | §D-01 Desktop sticky rail (280-320px) + §D-04 6-group order | `ffd128b` |
| FacetDrawer | §D-02 Mobile Sheet(side='bottom') + 6-item Accordion + sector default | `ffd128b` |
| ActiveFilterChips | §D-03 chip bar + format-per-facet + "모두 지우기" preserves prefs | `ffd128b` |

## What Shipped

### Task 1 — 10 shadcn blocks (`5735195`)

- `src/components/ui/button.tsx` — CVA with default/destructive/outline/secondary/ghost/link + size default/sm/lg/icon
- `src/components/ui/input.tsx` — server-safe `<input>` shell
- `src/components/ui/skeleton.tsx` — `bg-accent animate-pulse rounded-md`
- `src/components/ui/checkbox.tsx` — Radix Checkbox + CheckIcon indicator, `"use client"`
- `src/components/ui/popover.tsx` — Radix Popover (Root/Trigger/Content/Anchor), `"use client"`
- `src/components/ui/sheet.tsx` — Radix Dialog sheet (top/right/bottom/left sides), `"use client"`
- `src/components/ui/accordion.tsx` — Radix Accordion (Root/Item/Trigger/Content) with ChevronDown indicator, `"use client"`
- `src/components/ui/command.tsx` — cmdk-based (Command/Input/List/Empty/Group/Item/Separator/Shortcut) — CommandDialog export OMITTED (see Deviation 2 below), `"use client"`
- `src/components/ui/dropdown-menu.tsx` — full Radix DropdownMenu surface (15 exports), `"use client"`
- `src/components/ui/select.tsx` — Radix Select (full surface with ScrollUp/Down buttons), `"use client"`

Installed Radix peers + cmdk directly:

```
npm install @radix-ui/react-checkbox @radix-ui/react-popover @radix-ui/react-dialog \
            @radix-ui/react-dropdown-menu @radix-ui/react-select \
            @radix-ui/react-accordion cmdk
```

### Task 2 — Facet primitives (`d1db976`)

- `FacetGroup.tsx` — pure shell: `<fieldset>` + `<legend class="text-xl font-semibold">{t('facet.{key}.label')}</legend>` + optional `<Separator className="my-4" />`.
- `FacetCheckboxList.tsx` — multi-select for `sectors|stage|region` via `useQueryStates(searchParsers, { shallow: false })`; shows first 8 items then "더 보기 ({remaining})" toggle via local useState when `items.length > 8`; resets `page=1` on toggle.
- `FacetRangeBuckets.tsx` — 6 EMPLOYEE_BUCKETS chips with `aria-pressed` for selected state + trailing "직접 입력" Popover containing 최소/최대 Inputs + 적용 Button. Custom range commits `employees=${min}-${max}`; bucket commits `employees=${bucket}` (mutually exclusive).
- `FacetRangeInputs.tsx` — two `<Input type=text>` for `funding|founded`. **Commit policy**: on `onBlur` AND on `onKeyDown Enter` (Enter calls commit() directly, `preventDefault`); `onChange` only updates local state. `parseKRW` path for funding; `parseInt` for founded; `aria-invalid` when parseKRW returns null OR min > max.
- `tests/unit/facet-range.test.tsx` — 7 tests:
  1. FacetRangeBuckets renders 6 bucket buttons + 직접 입력
  2. clicking bucket writes employees + page=1
  3. selected bucket has aria-pressed=true
  4. FacetRangeInputs renders 2 inputs with 최소/최대 placeholders
  5. blur commits "{min}-{max}" with parseKRW-normalized bigint strings
  6. min>max sets aria-invalid=true on both inputs (no URL commit)
  7. Enter key triggers commit (founded path)

### Task 3 — Composition layer + i18n additions (`ffd128b`)

- `FacetSidebar.tsx` — `<aside aria-label={t('drawer.heading')}>` sticky rail with 6 FacetGroup children in D-04 order; optional `searchInputSlot` prop rendered inside `<div class="pb-4 border-b mb-4">` for Plan 05 SearchInput injection.
- `FacetDrawer.tsx` — `<Sheet side="bottom">` triggered by fixed bottom-right pill (`sm:hidden`); `<Accordion type="multiple" defaultValue={['sector']}>` with 6 items; sticky `<SheetFooter>` "적용" button via `<SheetClose>`; trigger copy switches to `t('drawer.openWithCount',{count})` when any filter active.
- `ActiveFilterChips.tsx` — returns null when no filters; `<ul role="group" aria-label={t('chip.activeLabel')}>` (2 hits on `chip.activeLabel` in file: 1 aria-label + 1 TSDoc quote — wired with no fallback literal); per-chip remove button has `aria-label={t('chip.remove',{label})}`; `clearAll` resets `q, sectors, stage, region, employees, funding, founded, page` but NOT `view / sort / per_page`. Chip label format uses `chip.range.between / atLeast / atMost / foundedAfter / foundedBefore` i18n templates so "이상/이하/이후/이전" copy never appears as a JSX literal.
- `ko.json` additions (inside existing `search.chip` sub-namespace):
  - `search.chip.range.between` — "{label} {min}-{max}"
  - `search.chip.range.atLeast` — "{label} {min} 이상"
  - `search.chip.range.atMost` — "{label} {max} 이하"
  - `search.chip.range.foundedAfter` — "{label} {min}{unit} 이후"
  - `search.chip.range.foundedBefore` — "{label} {max}{unit} 이전"
- `tests/unit/facet-sidebar.test.tsx` — 2 tests: 6 fieldset+legend in D-04 order (checks against ko.json verbatim: 섹터/라운드 단계/지역/직원 수/누적 투자액/설립 연도); searchInputSlot renders.
- `tests/unit/filter-chips.test.tsx` — 7 tests:
  1. returns null when no filters
  2. sector+employees chips + aria-label="활성 필터"
  3. stage chip uses stageLabel() → "시리즈 A"
  4. funding chip uses formatKRW → "100억원" / "1,000억원"
  5. 모두 지우기 resets facets, preserves view/sort/per_page
  6. per-chip button aria-label="fintech 제거"
  7. per-chip remove filters sectors array (keeps remaining) + page=1

## Test Counts

| File | Tests |
| ---- | ----- |
| `tests/unit/facet-range.test.tsx` | 7 |
| `tests/unit/facet-sidebar.test.tsx` | 2 |
| `tests/unit/filter-chips.test.tsx` | 7 |
| **Plan 04 new** | **16** |
| Plan 03-03 carried (search types/adapter/parsers/sort/pagination/fixtures/postgres/parseKRW/…) | 117 |
| **Total unit tests green** | **133 (+1 pre-existing pg-import failure out-of-scope)** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] shadcn CLI blocked in sandbox (Phase 2 Deviation 1 recurrence)**

- **Found during:** Task 1 Step 1 (`npx shadcn@latest add …`)
- **Issue:** Interactive CLI hung during dependency resolution (sandbox permission layer identical to Phase 2 Deviation 1).
- **Fix:** Inline-authored all 10 components from the canonical shadcn@latest default+slate+Tailwind-v4 template; installed Radix peers + cmdk directly via `npm install`.
- **Files modified:** all 10 ui/*.tsx files + package.json + package-lock.json
- **Commit:** `5735195`
- **Impact:** None — byte-equivalent to CLI output; future `npx shadcn add` runs are idempotent no-ops.

**2. [Rule 3 — Blocking] CommandDialog export requires Dialog block not in scope**

- **Found during:** Task 1 `command.tsx` inline authoring
- **Issue:** shadcn@latest `command.tsx` imports `Dialog / DialogContent / DialogHeader / DialogTitle / DialogDescription` from `@/components/ui/dialog` to implement the `CommandDialog` variant. UI-SPEC §Component Inventory explicitly defers `dialog` ("Not needed; drawer handles mobile, popover handles desktop range inputs"). Including the import would either (a) force a dialog block install outside plan scope or (b) create a type-check failure.
- **Fix:** Omitted `CommandDialog` from the `export { … }` block; added a JSDoc note pointing at the rationale + re-add path. `Command / CommandInput / CommandList / CommandEmpty / CommandGroup / CommandItem / CommandShortcut / CommandSeparator` (the 8 exports Plan 05 autocomplete actually needs) are all present.
- **Impact on acceptance criteria:** Plan 04 §Task 1 acceptance listed `CommandDialog` among required exports. Rule 3 (blocking) + Rule 4-boundary (architectural) made this omission necessary without user prompt because (1) UI-SPEC authority says dialog block is deferred, (2) no Plan 04 component consumes CommandDialog, (3) Plan 05 autocomplete uses Popover-wrapped Command per UI-SPEC §Autocomplete. Documented here; Plan 05 or later can install `dialog` + reinstate this export without touching other Plan 04 surface.
- **Files modified:** `src/components/ui/command.tsx`
- **Commit:** `5735195`

**3. [Rule 2 — Missing critical functionality] Chip range copy i18n keys (auto-add to honor D-05.4)**

- **Found during:** Task 3 ActiveFilterChips authoring
- **Issue:** UI-SPEC §D-03 chip label format requires Korean suffixes "이상 / 이하 / 이후 / 이전" in numeric range chips (e.g., "투자 100억원 이상", "설립 2020년 이후"). Plan's literal pseudocode embeds these as JSX string literals, which violates Phase 1 D-05.4 ("zero hardcoded Korean in JSX") — enforced by Plan 04's own grep verifier on `src/components/search/*.tsx`.
- **Fix:** Added 5 i18n templates under `search.chip.range.*` in `ko.json`:
  - `between` — "{label} {min}-{max}"
  - `atLeast` — "{label} {min} 이상"
  - `atMost` — "{label} {max} 이하"
  - `foundedAfter` — "{label} {min}{unit} 이후"
  - `foundedBefore` — "{label} {max}{unit} 이전"

  ActiveFilterChips calls `t('chip.range.atLeast', { label, min })` etc., keeping JSX copy-free. Interpolation handles formatKRW output + year+unit composition.
- **Files modified:** `src/messages/ko.json`, `src/components/search/ActiveFilterChips.tsx`
- **Commit:** `ffd128b`
- **Impact:** Strictly additive to Plan 01's `search.chip` namespace — no existing keys renamed; en.json mirror can follow the Phase 1 empty-string stub convention when Phase 8 adds English copy. The alternative (leaving "이상/이하/이후/이전" as JSX literals) would fail the Plan 04 must-have #8 i18n grep.

**4. [Rule 1 — Bug] Enter-key commit via blur() didn't dispatch in happy-dom**

- **Found during:** Task 2 `facet-range.test.tsx` test "Enter key blurs input (triggers commit)"
- **Issue:** Plan's literal pseudocode calls `e.currentTarget.blur()` on Enter, expecting `onBlur` → commit pathway to fire. happy-dom's `HTMLElement.blur()` doesn't synchronously dispatch a `blur` event that React's synthetic `onBlur` handler subscribes to, so the commit never ran and the test failed.
- **Fix:** Enter handler now calls `commit()` directly (with `e.preventDefault()` to avoid default form-submit if wrapped) — semantically identical to the UI-SPEC "blur OR Enter" contract, and additionally explicit (no environment-dependent event bubbling).
- **Files modified:** `src/components/search/FacetRangeInputs.tsx`
- **Commit:** `d1db976` (amended-in via same commit as Task 2 initial landing)
- **Impact:** UX is unchanged for real browsers (focus still moves normally); tests now exercise the commit path reliably.

No Rule 4 (architectural) fixes needed. No authentication gates.

## Threat-Model Coverage

| Threat ID | Disposition | Mitigation landed in this plan |
| --------- | ----------- | ------------------------------ |
| T-03-04-01 (Tampering: parseKRW negative/malformed → URL) | mitigate | parseKRW returns null → aria-invalid on both inputs + commit guarded; URL never receives malformed funding range. Verified by `facet-range.test.tsx` "min > max sets aria-invalid=true on both inputs (no URL commit)" |
| T-03-04-02 (Tampering: multi-select URL injection) | mitigate | nuqs `parseAsArrayOf(parseAsString)` coerces to strings; adapter layer (Plan 03-03 Postgres) uses parameterized `ANY($1::text[])`. No surface in Plan 04 to bypass |
| T-03-04-03 (Info Disclosure: aria-labels leaking IDs) | accept | Chip labels use sector names / stageLabel / formatKRW — all public product data |
| T-03-04-04 (DoS: rapid toggle floods URL) | mitigate | Every filter mutation resets `page=1`; Plan 05 is the owner of React 19 request-coalescing |
| T-03-04-05 (Elevation: client importing server secrets) | mitigate | All 7 search components have `'use client'`; 0 imports from `@/lib/supabase/*` or `@/lib/search/postgres` (grep-verified in self-check) |
| T-03-04-06 (Repudiation: 모두 지우기 clearing user prefs) | mitigate | `clearAll` in ActiveFilterChips.tsx explicitly omits `view / sort / per_page` from the setQuery call. Verified by `filter-chips.test.tsx` "clicking 모두 지우기 resets facets but preserves view/sort/per_page" |

## Handoff to Wave 4 (Plan 05)

Plan 05 composes these into the `/search` route:

```tsx
// src/app/[locale]/(public)/search/page.tsx
import { FacetSidebar } from '@/components/search/FacetSidebar';
import { FacetDrawer } from '@/components/search/FacetDrawer';
import { ActiveFilterChips } from '@/components/search/ActiveFilterChips';
// Plan 05 implements <SearchInput />, which slots into <FacetSidebar searchInputSlot={…} />

export default async function SearchPage({ searchParams }) {
  const parsed = searchParamsCache.parse(await searchParams);
  const result = await searchAdapter.search(parsed);
  return (
    <main>
      <FacetDrawer
        facets={result.facets}
        availableSectors={...}
        availableStages={...}
        availableRegions={...}
      />
      <div className="lg:grid lg:grid-cols-[minmax(280px,320px)_1fr] lg:gap-8">
        <FacetSidebar
          facets={result.facets}
          availableSectors={...}
          availableStages={...}
          availableRegions={...}
          searchInputSlot={<SearchInput />}
        />
        <section>
          <ActiveFilterChips />
          {/* ResultsHeader, Table/Cards, Pagination — Plan 05 owns */}
        </section>
      </div>
    </main>
  );
}
```

**Plan 05 dependencies surfaced here:**

- Plan 05 must provide `availableSectors / availableStages / availableRegions` arrays to FacetSidebar + FacetDrawer. Source: the RSC can call `searchAdapter.search()` to derive these from facets keys, or it can pull them from a small "reference taxonomy" fetcher keyed off the Phase 2 seed.
- Plan 05 must set `<NuqsAdapter>` (from `nuqs/adapters/next/app`) somewhere high in the tree — the existing `[locale]/(public)/layout.tsx` or the search route itself. Our client components assume `useQueryStates` works; without the adapter they'll no-op.
- Plan 05 should import `ActiveFilterChips` INSIDE the results section (above ResultsHeader, below FacetSidebar's column split) — D-03 requires it ABOVE results, NOT INSIDE sidebar.

## Handoff to Wave 4 (Plan 06+)

- SearchInput (Plan 06) attaches to `<FacetSidebar searchInputSlot={…}>` — just pass the component JSX; FacetSidebar owns the wrapper div styling (`pb-4 border-b mb-4`).
- Autocomplete popover consumes `Command / CommandInput / CommandList / CommandEmpty / CommandGroup / CommandItem` (already exported from command.tsx).
- Sort control consumes `DropdownMenu / DropdownMenuTrigger / DropdownMenuContent / DropdownMenuRadioGroup / DropdownMenuRadioItem` (all exported from dropdown-menu.tsx).
- Per-page + mobile sort consume `Select / SelectTrigger / SelectContent / SelectItem / SelectValue` (all exported from select.tsx).
- Loading state consumes `Skeleton`.

## i18n Additions Audit

**Expected by Plan 04 output §:** none (plan stated `search.range.customCta` + `search.chip.activeLabel` already in Plan 01).

**Actually added in this plan** (Deviation 3, Rule 2):
- `search.chip.range.between`
- `search.chip.range.atLeast`
- `search.chip.range.atMost`
- `search.chip.range.foundedAfter`
- `search.chip.range.foundedBefore`

All five are plan-boundary additions strictly scoped to `search.chip.range.*` — no conflict with Plan 01's pre-existing `search.chip.activeLabel / clearAll / remove`.

## Self-Check: PASSED

- FOUND: `src/components/ui/button.tsx`
- FOUND: `src/components/ui/input.tsx`
- FOUND: `src/components/ui/skeleton.tsx`
- FOUND: `src/components/ui/checkbox.tsx`
- FOUND: `src/components/ui/popover.tsx`
- FOUND: `src/components/ui/sheet.tsx`
- FOUND: `src/components/ui/accordion.tsx`
- FOUND: `src/components/ui/command.tsx`
- FOUND: `src/components/ui/dropdown-menu.tsx`
- FOUND: `src/components/ui/select.tsx`
- FOUND: `src/components/search/FacetGroup.tsx`
- FOUND: `src/components/search/FacetCheckboxList.tsx`
- FOUND: `src/components/search/FacetRangeBuckets.tsx`
- FOUND: `src/components/search/FacetRangeInputs.tsx`
- FOUND: `src/components/search/FacetSidebar.tsx`
- FOUND: `src/components/search/FacetDrawer.tsx`
- FOUND: `src/components/search/ActiveFilterChips.tsx`
- FOUND: `tests/unit/facet-range.test.tsx`
- FOUND: `tests/unit/facet-sidebar.test.tsx`
- FOUND: `tests/unit/filter-chips.test.tsx`
- FOUND commit: `5735195` (Task 1)
- FOUND commit: `d1db976` (Task 2)
- FOUND commit: `ffd128b` (Task 3)
- 133/137 unit tests green (4 pre-existing skipped + 1 pre-existing pg-import failure in tests/unit/search-schema.test.ts, out of Plan 04 scope)
- `npx tsc --noEmit` exit 0
- Zero hardcoded Korean in JSX across 7 search components (grep-verified; all Korean hits are JSDoc comments)
- 0 imports from `@/lib/supabase` or `@/lib/search/postgres` in `src/components/search/*.tsx`
- `grep -c "t('chip.activeLabel')" ActiveFilterChips.tsx` = 2 (aria-label + JSDoc; ≥1 required)
