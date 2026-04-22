---
phase: 02-read-only-profiles-manual-seed
plan: 02
type: execute
status: complete
wave: 2
tasks_total: 3
tasks_completed: 3
tests_added: 48
---

# Plan 02-02: Pure Libraries — SUMMARY

## Outcome

Four pure-function libraries delivered with 48 unit tests (21 + 9 + 4 + 14). All green. No UI. Wave 3 components can now import these as already-green dependencies.

## Files created

| Path | Purpose | Tests |
|------|---------|-------|
| `src/lib/format/currency.ts` | `formatKRW` — PROF-11 Korean currency (만/억/조 tiers) | 21 |
| `src/lib/data/freshness.ts` | `freshnessLevel` + `FRESHNESS_DOT_CLASS` — TRUST-05 | 9 |
| `src/lib/format/date.ts` | `formatProfileDate` — YYYY-MM-DD for SourceBadge | 4 |
| `src/lib/format/stage.ts` | `stageLabel` + `STAGE_KEYS` — funding_stage ENUM → ko label | 14 |
| `tests/unit/format-currency.test.ts` | 21-test boundary matrix (PROF-11 Nyquist coverage) | — |
| `tests/unit/freshness.test.ts` | 6 boundary + 3 dot-class assertions (TRUST-05 Nyquist) | — |
| `tests/unit/format-date.test.ts` | 4 assertions incl. invalid-throws | — |
| `tests/unit/format-stage.test.ts` | 11 × it.each + unknown-throws + length + ko-parity | — |
| `tests/__mocks__/server-only.ts` | Vitest alias stub (infra addition — see Deviations) | — |

## key-files.created

- src/lib/format/currency.ts
- src/lib/data/freshness.ts
- src/lib/format/date.ts
- src/lib/format/stage.ts

## Decisions resolved

### Research Open Question A3 — strict-literal D-Discretion-3

Locked per CONTEXT wording: `formatKRW` renders `{억}억 {만}만원` only when 만 part ≥ 1,000만; otherwise suppresses to `{억}억원`. Trade-off documented in code comment — future contributors can flip to "render 만 whenever > 0" by editing the helper AND every test expectation in format-currency.test.ts.

## Deviations (Rule 3 auto-fixes)

1. **Plan test template had 3 arithmetic errors** that contradicted D-Discretion-3. Fixed during RED→GREEN:
   - `formatKRW(120_000_000n)` — plan said `'1억원'`, correct is `'1억 2,000만원'` (man part 2,000만 ≥ 1,000만 threshold).
   - `formatKRW(199_999_999n)` — plan said `'1억원'`, correct is `'1억 9,999만원'` (man part 9,999만).
   - `formatKRW(10^17)` — plan said `'10,000조원'`, correct is `'100,000조원'` (10경 = 100,000조, not 10,000조).
   - Added `formatKRW(108_000_000n) → '1억원'` test (man part 800만 < 1,000만) to preserve strict-suppress coverage lost when the above two were corrected.

2. **`server-only` breaks unit tests** — the real package throws when imported outside RSC. Added `tests/__mocks__/server-only.ts` stub + alias in `vitest.config.ts` so `src/lib/data/freshness.ts` (which keeps `import 'server-only'` for production RSC-only enforcement) remains unit-testable.

3. **i18n path** — plan import used `'@/../messages/ko.json'` but Plan 02-01 placed messages under `src/messages/`. Adjusted both `src/lib/format/stage.ts` and `tests/unit/format-stage.test.ts` to `'@/../src/messages/ko.json'`.

4. **Test count delta** — plan said 43 tests (17 + 9 + 4 + 13). Actual is 48 (21 + 9 + 4 + 14) after the added 108,000,000n suppress test and the slightly different `it.each` counting. Every acceptance criterion still met.

## Verification

```
npx vitest run tests/unit
  Test Files  4 passed (4)
       Tests  48 passed (48)
```

## Commits

- `62153d6` feat(02-02): formatKRW with PROF-11 boundary matrix (21 tests)
- `53c17d2` feat(02-02): freshnessLevel + FRESHNESS_DOT_CLASS (TRUST-05, 9 tests)
- `e309b2a` feat(02-02): formatProfileDate + stageLabel/STAGE_KEYS helpers (18 tests)

## Handoff to Wave 3 (Plan 02-03)

Wave 3 components import:
- `formatKRW` from `@/lib/format/currency` for amount display
- `freshnessLevel` + `FRESHNESS_DOT_CLASS` from `@/lib/data/freshness` inside SourceBadge
- `formatProfileDate` from `@/lib/format/date` for SourceBadge `{date}` slot
- `stageLabel` + `STAGE_KEYS` from `@/lib/format/stage` inside FundingRoundsTable

All four are zero-dep pure functions (save for `date-fns`); no next-intl bootstrap required in tests.
