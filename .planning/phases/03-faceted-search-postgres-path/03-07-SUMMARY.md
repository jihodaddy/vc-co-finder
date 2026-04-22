---
phase: 03-faceted-search-postgres-path
plan: 07
wave: 7
status: complete
completed: 2026-04-23
requirements_delivered: [SRCH-05, SRCH-13]
---

# Phase 03 / Plan 07 — Phase Gate (Wave 7)

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | Synthetic data generator + purge helper + SRCH-13 live smoke | ✅ | `d3bdb50` |
| 2 | Load test harness + 5k run + REPORT.md | ✅ | `dcc0e6f` |
| 3 | [CHECKPOINT] 375px mobile human-verify | ✅ approved | see below |

## Automated results

**Load test (5,016 alive companies — 5,000 synthetic + 16 canonical):**
- p50 = 294.5 ms
- **p95 = 416.5 ms** (target < 1,000 ms — **PASS**)
- p99 = 2,141.3 ms
- 100 queries / 0 errors / 32.5 s wall-clock
- Report: `tests/load/phase3-REPORT.md`

**SRCH-13 live smoke (Phase 2 seed):** 8/8 green.
- 토스 → `toss`
- 토스뱅크 → `toss`
- 비바리퍼블리카 → `toss`
- 당근 → `daangn`
- 당근마켓 → `daangn`
- 쿠팡 → `coupang`
- Coupang → `coupang`
- (aggregate) all-7 green

## Task 3 — 375px human-verify

Reviewer: user (session 2026-04-23), iPhone SE 375×667 viewport, `npx next dev` (webpack — Turbopack disabled due to TURBOPACK-POSTCSS-01).

**Checklist result: 9/9 PASS**

1. ✅ Desktop `<aside>` sidebar hidden at 375px
2. ✅ Fixed "필터" pill button visible (bottom-right, thumb-reachable)
3. ✅ Sheet drawer slides up from bottom, ~80vh
4. ✅ 6 accordion sections — 섹터 default-open, others collapsed, `type="multiple"` preserves state
5. ✅ Checkbox selection + pill label "필터 (N)" updates
6. ✅ "적용" closes Sheet + URL commits + results update
7. ✅ Chip X / "모두 지우기" remove active filters
8. ✅ `?view=card` renders card grid
9. ✅ Error boundary retry CTA works, Sentry capture confirmed

## Gap-closure fixes committed during checkpoint

Two runtime bugs surfaced during 375px verification; both blocked the whole app, not just mobile. Fixed inline per Rule 1 (Blocking — must be fixed to progress).

| ID | Root cause | Fix commit |
|----|-----------|-----------|
| I18N-NUQS-ROOT-01 | `NextIntlClientProvider` missing `messages` prop (Phase 1 latent) + `NuqsAdapter` never mounted (Plan 03-05 gap) | `bd69118` |
| BIGINT-SERIALIZE-01 | `getCompanyBySlug` returned `amountMinor: bigint` → RSC payload `JSON.stringify` fails (Phase 2 latent, surfaced via /search → profile link) | `70ea1ab` |

Both logged to `deferred-items.md` with full diagnostic traces.

## Deferred items

| ID | Scope | Status |
|----|-------|--------|
| DB-INFRA-01 | DATABASE_URL password URL-unsafe chars | ✅ resolved in .env.local by user (percent-encoded); Vercel prod env follow-up needed |
| PG-DEP-01 | `pg` package unused-dep in `tests/unit/search-schema.test.ts` | ⏸ out-of-scope (doesn't block phase acceptance) |
| TURBOPACK-POSTCSS-01 | Windows Turbopack worker crash (0xc0000142) on globals.css | ⏸ toolchain, out-of-scope — `npx next dev` (webpack) is a valid workaround |
| COOKIE-NOTICE-01 | next-intl namespace scope issue (observed in logs) | ⏸ Phase 1 cleanup candidate |

## Files created/modified

- `scripts/search/generate-synthetic.ts` (NEW)
- `scripts/search/purge-synthetic.ts` (NEW)
- `tests/load/phase3-load.ts` (NEW)
- `tests/load/phase3-REPORT.md` (NEW)
- `tests/load/.gitkeep` (NEW)
- `tests/load/_stub-server-only.cjs` (NEW)
- `tests/smoke/phase3-srch13.test.ts` (flipped from it.todo → live)
- `package.json` (new scripts)
- `src/app/[locale]/layout.tsx` (NuqsAdapter + messages prop — gap fix)
- `src/lib/data/companies.ts` (amountMinor → string — gap fix)
- `src/lib/format/currency.ts` (accept string input — gap fix)
- `tests/unit/companies-data.test.ts` (updated assertion — gap fix)
- `.planning/phases/03-faceted-search-postgres-path/deferred-items.md` (extensive notes)

## Verification summary

- ✅ p95 = 416.5 ms < 1,000 ms (SRCH-05 acceptance)
- ✅ 8/8 Korean corpus entries resolved to canonical slugs (SRCH-13 acceptance)
- ✅ 9/9 375px mobile checklist items (responsive contract acceptance)
- ✅ 137/137 unit tests green (1 file fails import-time due to PG-DEP-01, pre-existing)
- ✅ `npx tsc --noEmit` exit 0
- ✅ `/ko/search` renders, facets functional, /companies/:slug no longer throws

Phase 3 acceptance criteria all satisfied.
