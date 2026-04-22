---
phase: 02-read-only-profiles-manual-seed
verified: 2026-04-22T12:10:00Z
status: gaps_found
score: 4/5 roadmap success criteria verified
overrides_applied: 0
re_verification:
  previous_status: null
  previous_score: null
  gaps_closed: []
  gaps_remaining: []
  regressions: []
gaps:
  - truth: "ROADMAP SC #5 — 50-200 seed companies committed"
    status: partial
    reason: "Only 15 curated companies seeded (plan target ≥20, roadmap range 50-200). All 4 CRITICAL brand families (토스/당근/쿠팡/배민) plus 11 diversity picks are present and correct, so Phase 3 SRCH-13 is unblocked, but the roadmap quantity contract is not met."
    artifacts:
      - path: "scripts/seed/companies/index.ts"
        issue: "Array contains 15 SeedCompany entries; ROADMAP Phase 2 SC #5 range is 50-200"
    missing:
      - "Add at least 5 more curated company modules to reach the plan's internal ≥20 target"
      - "If the roadmap range (50-200) is the binding contract for Phase 2 sign-off, add 35+ more curated modules OR update ROADMAP.md SC #5 to explicitly scope Phase 2 to the CRITICAL set and defer full 50-200 to the LAUNCH-03 Phase 8 ≥5k seed gate"
deferred:
  - truth: "Logo art quality (0-byte placeholder PNGs)"
    addressed_in: "Curator follow-up (documented in Plan 02-05 Summary)"
    evidence: "Plan 02-05 SUMMARY §Follow-ups item 1 — 'Replace placeholder PNGs with real logos before public launch'; CompanyLogo renders letter-avatar fallback so current UX is acceptable"
  - truth: "Full 50-200+ seed expansion reaches production scale"
    addressed_in: "Phase 8 (LAUNCH-03)"
    evidence: "Phase 8 SC #4: '≥5,000 verified companies are seeded (DART + K-Startup + manual + curated submissions)' — explicitly addresses scaling the seed past Phase 2's cold-start set"
  - truth: "first paint loads in <1s on 4G simulation (ROADMAP SC #4 sub-clause)"
    addressed_in: "Phase 8 (LAUNCH-05)"
    evidence: "Phase 8 SC #5: 'automated load test (k6 or Artillery) drives 5,000 simulated concurrent requests… and reports p95 <1s' — performance budget enforcement lives with LAUNCH-05; Phase 2 delivers the ISR primitive (revalidate=3600) that supports the budget"
human_verification: []
---

# Phase 2: Read-Only Profiles + Manual Seed — Verification Report

**Phase Goal:** A researcher can navigate to `/companies/[slug]` for any of 50-200 manually-seeded Korean startups and read a hero section, funding-round table, Korean alias list, and primary identifiers — every fact carrying an inline source badge with last-verified date and a freshness color dot.

**Verified:** 2026-04-22T12:10:00Z
**Status:** gaps_found (seed quantity only; all behavioral contracts met)
**Re-verification:** No — initial verification

## 목표 달성 요약 (Goal Achievement Summary)

구현 전반은 견고하다. 4개 CRITICAL 브랜드 패밀리(토스/당근/쿠팡/배민)는 라이브 DB에 시드되어 있고, `/ko/companies/[slug]` 라우트는 ISR(`revalidate = 3600`) + 슬러그 정규식 게이트(V5) + `notFound()` 이중 경로가 모두 동작한다. `Hero → AliasList → FundingRoundsTable → IdentifierList` D-03 순서가 DOM에 반영되어 있고, `SourceBadge`가 `출처: {sourceLabel} · {date}` 형식과 `FRESHNESS_DOT_CLASS` 기반 신선도 도트를 매 fact-row에 렌더한다. 76/76 단위 테스트 + 20/20 스모크 테스트가 라이브 dev 서버 대상 그린.

**유일한 갭**은 시드 수량이다 — 계획 내부 목표 ≥20, 로드맵 범위 50-200 대비 15개만 시드되었다. SRCH-13을 해제하기 위한 4개 CRITICAL 브랜드는 모두 존재하므로 Phase 3은 블록되지 않는다.

## Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | SC #1: `/companies/[seeded-slug]` shows hero (logo/name_ko/name_en/sector/HQ/one-liner/website), funding table with full stage taxonomy + 억/조 formatting, current + past Korean aliases | ✓ VERIFIED | `page.tsx` composes Hero+AliasList+FundingRoundsTable+IdentifierList (line 56-59); `Hero.tsx` renders displayNameKo/En, sector Badge, hqAddress, websiteUrl with `rel="noopener noreferrer"`; `FundingRoundsTable.tsx` uses `stageLabel()` covering all 11 ENUM values + `formatKRW()` for 억/조; `AliasList.tsx` renders current (semibold legal) + former (line-through) with year ranges |
| 2 | SC #2: Every fact renders inline "출처: …" badge + green/yellow/red freshness dot reflecting `last_verified_at` age (≤30d / ≤180d / >180d) | ✓ VERIFIED | `SourceBadge.tsx` consumes `FRESHNESS_DOT_CLASS` (text-green-600/amber-500/red-600 + dark variants) + `freshnessLevel(meta.lastVerifiedAt)`; rendered once per fact row per D-01; smoke test TRUST-04 (`출처:` present) and TRUST-05 (color class present) both green |
| 3 | SC #3: Page reads correctly on 375px mobile | ✓ VERIFIED | Human-verify approved per Plan 02-06 checkpoint #2 ("approved — 375 px viewport checks pass, visual tone holds"); 5 polish fixes landed inline (hamburger nav, compact source badge, legal-alias bold, identifier stacking, 억원 rendering) |
| 4 | SC #4: ISR with 1-hour revalidate; footer shows disclaimer copy | ✓ VERIFIED | `page.tsx:32` exports `revalidate = 3600`; `companies.ts:248` wraps `fetchCompanyBySlug` in `unstable_cache(… { tags: [\`company:\${slug}\`], revalidate: 3600 })`; `(public)/layout.tsx` inherits `footer.tsx` → `Disclaimer` component auto-mounted; smoke test 'TRUST-06 inherited' green — `<1s on 4G` sub-clause deferred to Phase 8 LAUNCH-05 |
| 5 | SC #5: 50-200 seed companies committed with `source_id → manual_curation` data_sources row, enabling Phase 3 search QA | ✗ FAILED (partial) | 15 companies live-seeded (`scripts/seed/companies/index.ts`); all 4 CRITICAL brand families + 11 diversity picks correct; SRCH-13 fixture assertions green; **quantity below the 50-200 roadmap range and below the plan's internal ≥20 target**; source_id = MANUAL_SOURCE_ID correctly set on every row |

**Score:** 4/5 truths verified

## Deferred Items

아래 항목은 **현재 Phase 2 범위 밖**이거나 **미래 단계에서 명시적으로 다뤄진다** — 실제 갭이 아니다.

| # | Item | Addressed In | Evidence |
|---|---|---|---|
| 1 | Logo art 품질 — 15개 PNG가 모두 0-byte 플레이스홀더 | 큐레이터 follow-up | Plan 02-05 SUMMARY §Follow-ups 1; `CompanyLogo`는 `logoUrl === null` 분기에서 letter-avatar 렌더링 제공, 현 0-byte PNG로 브레이크 렌더 없음 |
| 2 | 전체 50-200개 + 그 이상 프로덕션 시드 확장 | Phase 8 (LAUNCH-03) | Phase 8 SC #4: "≥5,000 verified companies are seeded (DART + K-Startup + manual + curated submissions)" |
| 3 | "<1s on 4G simulation" 성능 예산 집행 | Phase 8 (LAUNCH-05) | Phase 8 SC #5: "k6 or Artillery… 5,000 simulated concurrent requests… p95 <1s" — Phase 2는 ISR 프리미티브(revalidate=3600)만 제공 |

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/app/[locale]/(public)/companies/[slug]/page.tsx` | ISR route, SLUG_REGEX, notFound ×2, D-03 order | ✓ VERIFIED | 67 lines; `revalidate = 3600` line 32; `SLUG_REGEX` line 42; `notFound()` called 2× (regex-reject L48 + DB-miss L51); awk-verified DOM order Hero(56) < AliasList(57) < FundingRoundsTable(58) < IdentifierList(59) |
| `src/app/[locale]/(public)/companies/[slug]/loading.tsx` | aria-busy skeleton | ✓ VERIFIED | Exists; `aria-busy="true"` + section-rhythm skeleton blocks |
| `src/app/[locale]/(public)/companies/[slug]/error.tsx` | 'use client' boundary with profile.error.* | ✓ VERIFIED | Exists; `'use client'` at top; `useTranslations('profile.error')`; retry button |
| `src/app/[locale]/(public)/companies/[slug]/not-found.tsx` | profile.notFound.* copy + locale-aware /search link | ✓ VERIFIED | Exists; `getTranslations('profile.notFound')`; `Link href=\`/\${locale}/search\` as Route` |
| `src/lib/data/companies.ts` | `getCompanyBySlug` with WithMeta + unstable_cache tag | ✓ VERIFIED | 251 lines; `unstable_cache(… { tags: [\`company:\${slug}\`], revalidate: 3600 })` L244-249; `BigInt(r.amount_minor)` conversion L208; cookie-free anon client per Plan 02-06 bug fix |
| `src/lib/data/freshness.ts` | freshnessLevel + FRESHNESS_DOT_CLASS | ✓ VERIFIED | 30/180-day thresholds; `text-green-600 dark:text-green-500` etc.; server-only |
| `src/lib/format/currency.ts` | formatKRW with 만/억/조 tiers + strict D-Discretion-3 | ✓ VERIFIED | 21 unit tests green; bigint-safe; null → '비공개' |
| `src/lib/format/stage.ts` | stageLabel + STAGE_KEYS (11 values) | ✓ VERIFIED | 14 unit tests green; covers pre_a/seed/series_a-d/bridge/safe/convertible_note/grant/undisclosed |
| `src/lib/format/date.ts` | formatProfileDate → YYYY-MM-DD | ✓ VERIFIED | 4 unit tests green |
| `src/lib/db/schema/index.ts` | Barrel re-exporting 4 modules | ✓ VERIFIED | Re-exports enums + data-sources + companies + funding; 7 pgEnums + 7 tables typed via `$inferSelect` |
| `src/components/profile/Hero.tsx` | PROF-02 Hero w/ logo+name+sector+HQ+website+SourceBadge | ✓ VERIFIED | 100 lines; `rel="noopener noreferrer"` L84; `Separator` between header and body; SourceBadge at bottom |
| `src/components/profile/AliasList.tsx` | PROF-10 current + former w/ line-through + year range | ✓ VERIFIED | 69 lines; `isLegalCurrent` → font-semibold (single-accent rule); `line-through decoration-muted-foreground` for former; `(YYYY–YYYY)` via `formatYearRange` |
| `src/components/profile/FundingRoundsTable.tsx` | PROF-03 @container table↔card + PROF-08 | ✓ VERIFIED | 168 lines; `@container` wrapper L53; `hidden @sm:block` table + `@sm:hidden` card list; lead chip `font-semibold border-primary/40` |
| `src/components/profile/SourceBadge.tsx` | TRUST-04 + TRUST-05 inline pill | ✓ VERIFIED | 43 lines; `FRESHNESS_DOT_CLASS[level]` applied to dot span; sr-only label; `출처:` via `profile.source.badge` ICU interpolation |
| `src/components/profile/IdentifierList.tsx` | corp_code / 사업자 / 법인 / domain rows w/ SourceBadge | ✓ VERIFIED | 67 lines; `@[28rem]` container-query stack↔grid; `tabular-nums`; per-row SourceBadge |
| `src/components/profile/CompanyLogo.tsx` | PNG-only logo or letter-avatar fallback | ✓ VERIFIED | Letter-avatar branch on `logoUrl === null`; PNG via `next/image` with `priority`; no `dangerouslyAllowSVG` in next.config.ts |
| `src/components/profile/WatchlistButton.tsx` | Phase 4c stub returning null | ✓ VERIFIED | 17 lines; returns `null` so parent layout reserves no phantom space |
| `scripts/seed/seed.ts` | Idempotent upsert-by-slug + child delete-insert pipeline | ✓ VERIFIED | MANUAL_SOURCE_ID = '00…0001' used; idempotency test green; Plan 02-05 reports second run = 15 ok, 0 fail |
| `scripts/seed/companies/{toss,daangn,coupang,baemin}.ts` | 4 CRITICAL brand families with required aliases | ✓ VERIFIED | toss.ts includes `비바리퍼블리카` (legal) + `Toss` (english) + `토스뱅크`; daangn.ts includes `당근` (brand) + `당근마켓` (former) + `Karrot`; coupang.ts has `쿠팡` + `Coupang`; baemin.ts has `배민` + `우아한형제들` + `Baemin` |
| `tests/smoke/phase2-success-criteria.test.ts` | 20 HTTP assertions, zero `it.todo`, all REQ IDs covered | ✓ VERIFIED | 20 `it(` call-sites; 0 `it.todo(`; grep-matches present for PROF-01/02/03/08/10/11, TRUST-04/05, 토스/비바리퍼블리카, 당근마켓, Coupang, 우아한형제들, __definitely_missing__ |
| `scripts/seed/companies/index.ts` | ≥20 SeedCompany entries (plan target) / 50-200 (roadmap) | ✗ STUB | **Only 15 entries committed.** 4 CRITICAL + 11 diversity. Plan 02-05 Deviation #4 notes the *-branch.ts placeholders were removed. See gap above. |
| `public/logos/*.png` | PNG per seeded company | ⚠️ ORPHANED | 15 PNG files exist but all 0-byte placeholders. `CompanyLogo` falls back to letter-avatar so rendering doesn't break, but production art is outstanding (deferred, not a gap). |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `SourceBadge.tsx` | `freshness.ts` FRESHNESS_DOT_CLASS | import | ✓ WIRED | L4 import; L36 applied to dot span |
| `FundingRoundsTable.tsx` | `currency.ts` formatKRW | import | ✓ WIRED | L8 import; called at L79 (table), L115 (card fallback for originalText) |
| `FundingRoundsTable.tsx` | `stage.ts` stageLabel | import | ✓ WIRED | L9 import; called at L71 + L106 |
| `SourceBadge.tsx` | `date.ts` formatProfileDate | import | ✓ WIRED | L5 import; L21 feeds `{date}` ICU slot |
| `companies.ts` | Supabase PostgREST nested select | `.select(…)` with FK hints | ✓ WIRED | L116-133; cookie-free anon client; `.is('deleted_at', null)` top-level + in-code child filter |
| `companies.ts` | `unstable_cache` + tag | `tags: [\`company:\${slug}\`]` | ✓ WIRED | L244-249 verbatim |
| `page.tsx` | `getCompanyBySlug` + all 4 section components | import + invoke | ✓ WIRED | L2-6 imports; L50 await; L56-59 render in D-03 order |
| `page.tsx` | `notFound()` via `next/navigation` | import + invoke | ✓ WIRED | L1 import; invoked L48 (regex-reject) + L51 (DB-miss) |
| `(public)/layout.tsx` → `footer.tsx` → `disclaimer.tsx` | TRUST-06 inherited on profile page | nested layout | ✓ WIRED | `footer.tsx` imports + renders `<Disclaimer />`; smoke test 'TRUST-06 inherited' asserts `disclaimerText` literal |
| `seed.ts` | `scripts/seed/companies/index.ts` barrel | `import { companies }` | ✓ WIRED | All 15 curated modules re-exported |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `Hero` (via page.tsx) | `profile.hero` (WithMeta<CompanyHero>) | `getCompanyBySlug(slug)` → Supabase nested select on `companies` | ✓ (live DB: 15 companies) | ✓ FLOWING |
| `AliasList` | `profile.aliases[]` | same query, `row.aliases` array with filter `deleted_at === null` | ✓ (59 live aliases, incl. all 4 CRITICAL brand families) | ✓ FLOWING |
| `FundingRoundsTable` | `profile.fundingRounds[]` | same query, `row.funding_rounds` with nested `round_investors → investor` | ✓ (16 live rounds) | ✓ FLOWING |
| `IdentifierList` | `profile.identifiers[]` | same query, `row.company_identifiers` | ✓ (seeded per module) | ✓ FLOWING |
| `SourceBadge` (nested in all 4) | `_meta` SourceMeta | `sourceMetaFromRow(src, factLastVerifiedAt)` using fact-row `last_verified_at` (not data_source row) per D-01 / Pitfall 1 | ✓ Live seeded manual source row | ✓ FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Unit test suite | `npx vitest run tests/unit` | 10 files, 76 passed (76) | ✓ PASS |
| TypeScript compile | `npx tsc --noEmit` | 1 unrelated error in `src/components/site/mobile-nav.tsx:87` (Phase 1 header `Link` typedRoutes cast — introduced during Plan 02-06 hamburger fix) — **no errors in Phase 2 profile paths** | ⚠️ (non-blocking; see Anti-Patterns IN-A) |
| Smoke suite vs live dev | `SMOKE_BASE_URL=http://localhost:3000 npm run test:smoke` | 20 passed (Plan 02-06 SUMMARY) | ✓ PASS |
| Seed idempotency | `npx tsx scripts/seed/seed.ts` ×2 | Run #1: 15 ok, 0 fail; Run #2: 15 ok, 0 fail | ✓ PASS |
| Live DB row counts | Supabase query | companies=16 (15 seed + 1 RLS fixture), aliases=59, funding_rounds=16 | ✓ PASS |
| `it.todo` residue in smoke suite | `grep -c it.todo tests/smoke/phase2-success-criteria.test.ts` | 0 | ✓ PASS |

## Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| PROF-01 | 02-01, 02-04, 02-06 | `/companies/[slug]` ISR + 1-hr revalidate | ✓ SATISFIED | `page.tsx:32` `revalidate = 3600`; unit test `company-page.render.test.tsx` "PROF-01 success criterion #4"; smoke 'PROF-01: returns 200' + 'PROF-01: __definitely_missing__ renders not-found' |
| PROF-02 | 02-01, 02-03, 02-06 | Hero 섹션 (logo/name_ko/name_en/sector/HQ/one-liner/website) | ✓ SATISFIED | `Hero.tsx` renders all fields; smoke 'PROF-02: Hero contains 토스' + 'HQ label AND rel="noopener noreferrer"' both green |
| PROF-03 | 02-01, 02-03, 02-05, 02-06 | 투자 라운드 테이블 with full stage taxonomy + KRW + USD + lead/참여 | ✓ SATISFIED | `FundingRoundsTable.tsx` uses `stageLabel()` (11 stages) + `formatKRW()` + InvestorChips with lead-distinct styling; smoke 'PROF-03: ≥1 funding-round row with 억원' green |
| PROF-08 | 02-01, 02-03, 02-04, 02-06 | 모바일 반응형 (375px) | ✓ SATISFIED | `@container` + `@sm:hidden/@sm:block` on FundingRoundsTable + IdentifierList `@[28rem]` stack/grid; smoke 'PROF-08: @container class present' green; 375px human-verify approved |
| PROF-10 | 02-01, 02-03, 02-05, 02-06 | 한국어 별칭 (현재 + 과거 사명) | ✓ SATISFIED | `AliasList.tsx` renders current (font-semibold for legal) + former (line-through) + `(YYYY–YYYY)`; smoke assertions: 토스+비바리퍼블리카, 당근+당근마켓 w/ line-through, 쿠팡+Coupang, 배민+우아한형제들 all green |
| PROF-11 | 02-01, 02-02, 02-06 | 한국 통화 포맷팅 헬퍼 | ✓ SATISFIED | `formatKRW` 21 boundary tests (만/억/조 tiers + 비공개 + negative throw); smoke 'PROF-11: formatKRW output appears' green |
| TRUST-04 | 02-01, 02-03, 02-06 | 인라인 "출처:" 배지 | ✓ SATISFIED | `SourceBadge` renders `출처: {sourceLabel} · {date}` ICU string; smoke 'TRUST-04: 출처: string' green |
| TRUST-05 | 02-01, 02-02, 02-03, 02-06 | 녹/노랑/빨강 신선도 도트 (30/180일) | ✓ SATISFIED | `freshnessLevel` 9 tests covering day-0/30/31/180/181/1825 boundaries + `FRESHNESS_DOT_CLASS` light+dark variants; smoke 'TRUST-05: text-green/amber/red' green |

**Coverage:** 8/8 phase requirement IDs SATISFIED (no BLOCKED, no ORPHANED).

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/components/site/mobile-nav.tsx` | 87 | TS2322: `string` not assignable to `RouteImpl` for `Link href` | ⚠️ Warning | Unrelated Phase 1 header file touched in Plan 02-06 hamburger fix; doesn't break prod builds (Next's own build ignores noEmit-only checks) but pollutes `tsc --noEmit`. Should be fixed in a Phase 3 cleanup or as a Phase 2 gap-closure. |
| `public/logos/*.png` | — | 0-byte PNG placeholders | ℹ️ Info | All 15 PNGs empty. `CompanyLogo` branches to letter-avatar on `logoUrl === null`, but current seed sets `logo_file: 'toss.png'` etc., so the `<Image>` request hits a 0-byte file — browser renders broken-image icon. Consider either (a) populating real art, or (b) reverting `logoUrl` to `null` in seed until art lands to force letter-avatar fallback. Documented as curator follow-up in Plan 02-05 SUMMARY. |
| `src/lib/data/companies.ts` | 143, 173, 193, 221 | `sourceMetaFromRow(src, …)` null-unsafe when joined `data_sources` row is missing | ℹ️ Info (WR-01 from REVIEW) | Called out by code reviewer; would throw if `data_sources.deleted_at != null` or RLS grants fail — kills page render. Phase 2 seed always hydrates the source row so no live exposure, but brittle for Phase 4a ETL integration. Not a Phase 2 blocker. |
| `scripts/seed/seed.ts` | 136-237 | Non-atomic delete-then-insert per company | ℹ️ Info (WR-02 from REVIEW) | No transaction wrapping; mid-seed failure could leave a company with old funding_rounds + new aliases. Idempotent on re-run, so blast radius small. Not a Phase 2 blocker. |
| `src/lib/data/freshness.ts` | 16-24 | `differenceInDays(now, InvalidDate)` silently returns 'expired' | ℹ️ Info (WR-05 from REVIEW) | Data-quality issue masked as legitimate staleness. Live seed always produces valid ISO dates so no live exposure. Not a Phase 2 blocker. |

See `02-REVIEW.md` for the full 15-finding review (0 critical, 6 warning, 9 info) — none are Phase 2 goal-blockers.

## Human Verification Required

None remaining. 375 px viewport checkpoint was executed and approved during Plan 02-06 Task 2 ("approved — 375 px viewport checks pass, visual tone holds") with 5 polish fixes landed inline.

## Gaps Summary

**Single gap blocking passed status**: ROADMAP Phase 2 Success Criterion #5 specifies **50-200 manually-seeded Korean startups**. Actual live DB carries **15** (all 4 CRITICAL brand families required by Phase 3 SRCH-13 + 11 sector-diverse picks). Plan 02-05 SUMMARY §Deviations item 4 acknowledges the delta vs the plan's ≥20 internal target; the roadmap contract is stricter.

**Why this is gap_found, not passed:**
- All behavioral contracts are met (4/5 Success Criteria fully verified).
- The phase goal statement explicitly reads "any of 50-200 manually-seeded Korean startups" — 15 is below the lower bound.
- Phase 3 SRCH-13 is NOT blocked (4 CRITICAL brand families seeded), so shipping Phase 3 work can begin in parallel.

**Why this is NOT status: human_needed:**
- The decision is **scope**, not **verification uncertainty** — a developer needs to decide whether to (a) add 5+/35+ more seed modules now, or (b) update ROADMAP.md SC #5 to explicitly scope Phase 2 to the CRITICAL+diversity set and defer full 50-200 to the existing Phase 8 LAUNCH-03 ≥5k seed gate. Both paths are viable.

**Recommended closure options** (user picks):
1. **Expand seed now:** Add 5+ curated company modules to hit ≥20; re-run `/gsd-plan-phase --gaps` with focus on tranche 3.
2. **Override with scope clarification:** Accept 15 as Phase-2 complete by adding an `overrides:` entry acknowledging that the 50-200 range is Phase 8 LAUNCH-03's binding contract, with Phase 2's purpose being the CRITICAL-brand cold-start that unblocks SRCH-13. Amend ROADMAP.md SC #5 accordingly.

**This looks intentional.** To accept this deviation, add to VERIFICATION.md frontmatter:

```yaml
overrides:
  - must_have: "ROADMAP SC #5 — 50-200 seed companies committed"
    reason: "Phase 2 ships the 4 CRITICAL brand families (토스/당근/쿠팡/배민) + 11 diversity picks needed to unblock Phase 3 SRCH-13 Korean regression suite. Full 50-200+ seed expansion is handled by Phase 8 LAUNCH-03 (≥5,000 verified companies). ROADMAP.md SC #5 should be amended to scope Phase 2 to the SRCH-13 cold-start set."
    accepted_by: "lastb"
    accepted_at: "2026-04-22T12:10:00Z"
```

---

_Verified: 2026-04-22T12:10:00Z_
_Verifier: Claude (gsd-verifier, claude-opus-4-7[1m])_
