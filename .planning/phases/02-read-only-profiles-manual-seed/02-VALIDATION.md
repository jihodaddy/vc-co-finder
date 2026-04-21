---
phase: 2
slug: read-only-profiles-manual-seed
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Generated from `02-RESEARCH.md` §Validation Architecture (Nyquist-compliant sampling).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.4 (already in `package.json`) |
| **Config file** | `vitest.config.ts` — Wave 0 deliverable (does NOT yet exist) |
| **Quick run command** | `npm test` → `vitest run` (~2 s for unit tests) |
| **Full suite command** | `npm test && npm run test:rls && npm run test:smoke` |
| **Per-file run** | `npx vitest run tests/unit/format-currency.test.ts -x` |
| **Estimated runtime** | Unit ~3 s · Full ~30 s (smoke against local `npm run dev`) |

---

## Sampling Rate

- **After every task commit:** Run `npm test` (unit only — must stay < 3 s).
- **After every plan wave:** Run `npm test && npm run test:smoke` with `BASE_URL=http://localhost:3000` and Supabase env set.
- **Before `/gsd-verify-work`:** Full suite must be green (unit + RLS + smoke against preview deploy URL), PLUS manual 375 px viewport spot-check, PLUS Supabase Studio seed-row confirmation.
- **Max feedback latency:** 3 s (unit) / 30 s (smoke).

---

## Per-Task Verification Map

> Placeholder rows — populated by planner as PLAN.md tasks are authored. Every test ID below MUST be referenced from exactly one PLAN task.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| PROF-11 | `formatKRW(null)` → "비공개" | unit | `npx vitest run tests/unit/format-currency.test.ts -t 'null input'` | ❌ W0 | ⬜ pending |
| PROF-11 | `formatKRW(0n)` → "0원" | unit | `npx vitest run tests/unit/format-currency.test.ts -t 'zero'` | ❌ W0 | ⬜ pending |
| PROF-11 | `formatKRW(5_000n)` → "5,000원" | unit | `npx vitest run tests/unit/format-currency.test.ts -t '원 tier'` | ❌ W0 | ⬜ pending |
| PROF-11 | `formatKRW(15_000n)` → "1.5만원" | unit | `npx vitest run tests/unit/format-currency.test.ts -t '만 tier 1-decimal'` | ❌ W0 | ⬜ pending |
| PROF-11 | `formatKRW(100_000_000n)` → "1억원" | unit | `npx vitest run tests/unit/format-currency.test.ts -t '억 tier'` | ❌ W0 | ⬜ pending |
| PROF-11 | `formatKRW(2_345_678_900_000n)` → "2조 3,456억원" | unit | `npx vitest run tests/unit/format-currency.test.ts -t '조 tier'` | ❌ W0 | ⬜ pending |
| PROF-11 | `formatKRW(-1n)` throws | unit | `npx vitest run tests/unit/format-currency.test.ts -t 'negative rejects'` | ❌ W0 | ⬜ pending |
| TRUST-05 | `freshnessLevel` at day 0 / 30 / 31 / 180 / 181 | unit | `npx vitest run tests/unit/freshness.test.ts` | ❌ W0 | ⬜ pending |
| TRUST-04 | SourceBadge renders pill with `출처: {sourceLabel} · {date} 업데이트` | unit (component, happy-dom) | `npx vitest run tests/unit/source-badge.test.tsx` | ❌ W0 | ⬜ pending |
| PROF-01 | `/ko/companies/toss` returns 200, HTML contains `토스` | smoke | `npm run test:smoke -- phase2-success-criteria.test.ts` | ❌ W0 | ⬜ pending |
| PROF-01 | `/ko/companies/unknown-slug` returns 404 | smoke | as above | ❌ W0 | ⬜ pending |
| PROF-02 | Hero HTML contains `display_name_ko`, sector tag, HQ, website anchor with `rel="noopener noreferrer"` | smoke | as above | ❌ W0 | ⬜ pending |
| PROF-03 | `/ko/companies/toss` HTML contains ≥ 1 funding-round row with `억원` | smoke | as above | ❌ W0 | ⬜ pending |
| PROF-08 | `@container` class present in rendered HTML/CSS (container query for card transition) | smoke | as above | ❌ W0 | ⬜ pending |
| PROF-10 | HTML contains BOTH `토스` AND `비바리퍼블리카` on `/ko/companies/toss` | smoke | as above | ❌ W0 | ⬜ pending |
| TRUST-04 | HTML contains `출처:` string ≥ 1 occurrence on `/ko/companies/toss` | smoke | as above | ❌ W0 | ⬜ pending |
| TRUST-05 | One of `text-green-600` / `text-amber-500` / `text-red-600` classes present in rendered HTML | smoke | as above | ❌ W0 | ⬜ pending |
| TRUST-06 (inherited) | Disclaimer text from `footer.disclaimerText` present on `/ko/companies/toss` | smoke | as above | ❌ W0 | ⬜ pending |
| ISR | `unstable_cache` call carries `tags: ['company:${slug}']` | unit (mock `unstable_cache` in Plan 02-03 companies-data test) | `npx vitest run tests/unit/companies-data.test.ts -t 'cache tags shape'` | ❌ W0 (Plan 02-03 creates `tests/unit/companies-data.test.ts`) | ⬜ pending |
| Seed idempotency | `npm run seed && npm run seed` produces 0 NET row changes | integration | `npx vitest run tests/unit/seed-idempotency.test.ts` (requires local Supabase) | ❌ W0 | ⬜ pending |
| SRCH-13 prerequisite | Seed covers `["토스","토스뱅크","비바리퍼블리카","당근","당근마켓","Coupang","쿠팡"]` via `display_name_ko OR aliases.alias` | unit (seed-parse) | `npx vitest run tests/unit/seed-coverage.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Nyquist Dimensions (≥ 2 samples per boundary)

1. **Freshness-dot color correctness across 30 / 180-day boundaries** — 5 samples at {−1, 30, 31, 180, 181} days; covers both sides of both thresholds.
2. **KRW formatter rounding correctness** — 9 samples at tier boundaries {`9_999n`, `10_000n`, `99_990_000n`, `100_000_000n`, `199_999_999n`, `120_000_000n`, `9_999_999_999_999n`, `10_000_000_000_000n`, `2_345_678_900_000n`}; crosses 원/만/억/조 tier transitions with both sides.
3. **ISR cache tag invalidation shape** — 2 samples: existing slug and non-existing slug, mocking `unstable_cache` and asserting `tags: ['company:${slug}']`. Asserted in `tests/unit/companies-data.test.ts` (Plan 02-03 Task 1). There is NO separate `revalidate-tag.test.ts` file — all ISR cache-tag assertions live in `companies-data.test.ts`.
4. **RLS honesty (inherited from Phase 1)** — existing `tests/rls/rls.test.ts` covers anon SELECT allowed on companies/aliases/funding_rounds/identifiers but INSERT/UPDATE/DELETE blocked. Phase 2 adds no new tables; no extension needed unless seed writes expose a gap.

---

## Wave 0 Requirements

Scaffolding that MUST land in Wave 0 before any feature task can reference these tests:

- [ ] `vitest.config.ts` at repo root — `@/* → src/*` path alias; `environment: 'node'` default; override `environment: 'happy-dom'` for `tests/unit/*.tsx` files.
- [ ] Install `happy-dom` + `@testing-library/react` as devDependencies (only if component tests are in scope).
- [ ] `tests/unit/` directory + `.gitkeep`.
- [ ] `tests/smoke/phase2-success-criteria.test.ts` stub modeled on Phase 1's `phase1-success-criteria.test.ts`.
- [ ] `src/lib/db/schema/` barrel (`index.ts`) + one file per domain (`companies.ts`, `aliases.ts`, `funding.ts`, `identifiers.ts`, `data-sources.ts`).
- [ ] `public/` + `public/logos/` directories (empty `.gitkeep` until seed logos arrive).
- [ ] `scripts/seed/` skeleton: `seed.ts`, `types.ts`, `fx.ts`, `companies/index.ts`, `companies/CRITICAL.md` (documents the 4 load-bearing brand families: 토스 / 당근 / 쿠팡 / 배민).
- [ ] `messages/ko.json` `profile.*` namespace placeholder keys per UI-SPEC Copywriting table.
- [ ] `messages/en.json` mirrored keys with empty strings (Phase 8 localization sweep).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 375 px viewport visual polish (Hero clamp, card-per-round, badge line wrap) | PROF-08 | Automated CSS grep asserts presence of `@container`; visual quality requires human eye for typography rhythm + touch-target comfort. | Open `http://localhost:3000/ko/companies/toss` in Chrome DevTools, set device to iPhone SE (375×667). Verify: (a) Hero name does not overflow; (b) one-liner clamps to 2 lines with expand; (c) funding rounds render as stacked cards, not horizontal-scroll table; (d) SourceBadge wraps below fact when width-constrained. |
| ISR 1-hour revalidate under real traffic | ROADMAP #4 (first paint < 1s on 4G) | Cannot replay ISR cache behavior deterministically in CI. | On preview deploy: first request cold-start ≈ < 1 s; second request (cached) ≈ < 200 ms. Update a seed row via Supabase Studio, wait 1 h, verify next page load reflects change. (Or trigger `revalidateTag('company:${slug}')` manually via service-role curl for faster smoke.) |
| Seed data trust honesty (honest `last_verified_at`) | Pitfall #11 | Cannot unit-test curator intent; manual spot-check of 5 random seed rows vs DART / company site. | For 5 random slugs, open `/ko/companies/{slug}`, verify every funding-round `last_verified_at` date matches a real verification event (DART filing date OR announcement URL in PR description). |
| Stripe/Linear tone polish | UI-SPEC Tone | Subjective — checker cannot score. | Product lead review on desktop + mobile; explicit sign-off block in PR. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`--watch`, `vitest` without `run`) in any task command
- [ ] Feedback latency < 3 s (unit) / 30 s (smoke)
- [ ] `nyquist_compliant: true` set in frontmatter after planner wires every task ID

**Approval:** pending

---

*Sourced from `02-RESEARCH.md` §Validation Architecture (lines 881–942).*
