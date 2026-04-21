# CRITICAL: Load-Bearing Seed Companies

> **Do not delete or rename these companies without planner approval.**

Phase 3 (Faceted Search) defines a **fixed Korean-search regression suite**
that MUST return a match for each of these query strings. The suite is
codified in SRCH-13 — failing it blocks Phase 3 shipment.

## The 4 Brand Families

Every `/gsd-verify-work` run for Phase 2 + Phase 3 asserts that these
brand strings resolve to a company via `display_name_ko OR aliases.alias`:

| Query string    | Must resolve to slug | Required aliases                                  |
|-----------------|----------------------|---------------------------------------------------|
| `토스`          | `toss`              | brand "토스", legal "비바리퍼블리카", english "Toss", former "토스뱅크" (or separate entity — planner call) |
| `토스뱅크`      | `toss-bank` OR `toss` | either a distinct `toss-bank` slug OR a `toss` alias of type `brand` with alias "토스뱅크" |
| `비바리퍼블리카` | `toss`              | alias_type: `legal` |
| `당근`          | `daangn`            | brand "당근", legal/alias "당근마켓" |
| `당근마켓`      | `daangn`            | alias_type: `brand` OR `former` |
| `Coupang`       | `coupang`           | english "Coupang", legal "쿠팡" |
| `쿠팡`          | `coupang`           | brand/legal "쿠팡" |
| `배민`          | `baemin`            | brand "배민", legal "우아한형제들", english "Baemin" |

## If You Must Restructure

1. Update `tests/unit/seed-coverage.test.ts` (Plan 02-05) — the SRCH-13
   fixture test that asserts every query above resolves.
2. Update Phase 3 PLAN.md — the one that defines SRCH-13 fixtures.
3. Update this file.

## Why Four, Not Three or Five?

These cover the **identity-plurality** patterns every researcher hits:
- Korean brand with English name (Coupang / 쿠팡)
- Brand with distinct legal entity (토스 / 비바리퍼블리카)
- Former brand still recognized (당근 / 당근마켓)
- Parent company ≠ product name (우아한형제들 / 배민)

Dropping any one of these removes a category of identity ambiguity from
the Korean-search test suite.
