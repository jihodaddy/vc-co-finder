---
phase: 3
slug: faceted-search-postgres-path
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (unit) + HTTP smoke tests against `npm run dev` |
| **Config file** | `vitest.config.ts` (existing from Phase 2 — `@vitejs/plugin-react`, `server-only` alias, `@/*` alias) |
| **Quick run command** | `npx vitest run tests/unit/<file>` |
| **Full suite command** | `npm run test` (all unit) + `SMOKE_BASE_URL=http://localhost:3000 npm run test:smoke` (with dev server up) |
| **Estimated runtime** | Unit ~30s · Smoke ~60s · Load test ~120s |

Notes: `SMOKE_BASE_URL` — NOT `BASE_URL` — because Vite injects `process.env.BASE_URL='/'` (Phase 2 learning).

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` on the files the task modified (target-specific)
- **After every plan wave:** Run full unit suite `npm run test`
- **Before `/gsd-verify-work`:** Full unit + smoke suites green + load test p95 < 1s logged
- **Max feedback latency:** 60 seconds for unit tier; 120 seconds for smoke+load tier

---

## Per-Task Verification Map

Wave numbering matches RESEARCH.md §Wave Architecture. Task IDs use `{phase}-{plan}-{task}` format.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | All SRCH | — | N/A (scaffold) | unit | `npx vitest run tests/smoke/phase3-success-criteria.test.ts` (stubs) | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 0 | SRCH-13 | — | Fixture corpus present for regression harness | unit | `npx vitest run tests/unit/search-fixtures.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | SRCH-12 | T-03-01 / — | Extension enable via SUPABASE_ACCESS_TOKEN dashboard flow, never via plain SQL from app | migration | `node scripts/seed/_push_migrations.cjs` + `SELECT extname FROM pg_extension WHERE extname='pgroonga'` returns 1 row | ❌ W1 | ⬜ pending |
| 03-02-02 | 02 | 1 | SRCH-05, SRCH-13 | — | N/A (schema) | migration + integration | Denormalized columns populated via trigger; single SELECT returns <100ms on 5k synthetic data | ❌ W1 | ⬜ pending |
| 03-03-01 | 03 | 2 | SRCH-11 | — | Adapter never leaks raw SQL or DB client to client bundle (`import 'server-only'` pattern) | unit | `npx vitest run tests/unit/search-adapter.test.ts` | ❌ W2 | ⬜ pending |
| 03-03-02 | 03 | 2 | SRCH-12 | — | `parseKRW` rejects non-numeric input; negative invariant | unit | `npx vitest run tests/unit/parse-krw.test.ts` | ❌ W2 | ⬜ pending |
| 03-03-03 | 03 | 2 | SRCH-05, SRCH-06 | T-03-02 / — | SQL parameters bound, not string-interpolated | unit | `npx vitest run tests/unit/search-postgres.test.ts` | ❌ W2 | ⬜ pending |
| 03-04-01 | 04 | 3 | SRCH-01, SRCH-02, SRCH-03 | — | N/A (component) | unit (RTL) | `npx vitest run tests/unit/facet-sidebar.test.tsx` | ❌ W3 | ⬜ pending |
| 03-04-02 | 04 | 3 | SRCH-02 | — | Range input rejects non-numeric; min≤max enforced client-side | unit | `npx vitest run tests/unit/facet-range.test.tsx` | ❌ W3 | ⬜ pending |
| 03-04-03 | 04 | 3 | SRCH-03 | — | "모두 지우기" URL reset produces valid empty-state URL | unit | `npx vitest run tests/unit/filter-chips.test.tsx` | ❌ W3 | ⬜ pending |
| 03-05-01 | 05 | 4 | SRCH-01, SRCH-04, SRCH-08, SRCH-09, SRCH-10 | — | URL params validated against allowlist (Zod) | smoke (HTTP) | `SMOKE_BASE_URL=http://localhost:3000 npx vitest run tests/smoke/phase3-success-criteria.test.ts -t "results"` | ❌ W4 | ⬜ pending |
| 03-05-02 | 05 | 4 | SRCH-06 | — | URL round-trips (copy-paste restores exact state) | smoke | `... -t "URL shareable"` | ❌ W4 | ⬜ pending |
| 03-05-03 | 05 | 4 | SRCH-07 | — | Autocomplete result clickthrough navigates with canonical slug, not raw alias | smoke | `... -t "autocomplete"` | ❌ W4 | ⬜ pending |
| 03-06-01 | 06 | 5 | SRCH-01~10 | — | Empty state copy present + actionable | smoke | `... -t "empty state"` | ❌ W5 | ⬜ pending |
| 03-06-02 | 06 | 5 | All SRCH | — | Error boundary catches + renders locale copy | smoke | `... -t "error boundary"` | ❌ W5 | ⬜ pending |
| 03-07-01 | 07 | 6 | SRCH-05 | — | p95 facet query < 1s on ≥5,000-row synthetic dataset | load | `node scripts/perf/search-load-test.mjs` (records p50/p95/p99) | ❌ W6 | ⬜ pending |
| 03-07-02 | 07 | 6 | SRCH-13 | — | All 7 Korean test strings return ≥1 result; 토스 == 비바리퍼블리카 == Toss | smoke | `SMOKE_BASE_URL=http://localhost:3000 npx vitest run tests/smoke/phase3-srch13.test.ts` | ❌ W6 | ⬜ pending |
| 03-07-03 | 07 | 6 | PROF-08 (inherited) | — | 375 px mobile viewport — bottom sheet drawer + sidebar-hidden pattern works | human-verify | N/A (manual) | ❌ W6 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Nyquist Dimensions

Per RESEARCH §Validation Architecture, Phase 3 samples these boundary dimensions:

1. **Tokenization boundary (SRCH-13 corpus)** — 7 Korean strings must each return a result: `토스`, `토스뱅크`, `비바리퍼블리카`, `당근`, `당근마켓`, `Coupang`, `쿠팡`. 토스 and Toss must resolve to same canonical company.
2. **Facet count boundary** — 0 facets selected (show all 15 seed) · 1 facet · 5 facets simultaneously · all 6 facets · mutually-exclusive selection yielding 0 results.
3. **Sort boundary** — each of 4 sort columns × ASC/DESC toggle = 8 matrix rows; NULL handling (latest_round_announced_at NULLS LAST).
4. **Pagination boundary** — page=1 / page=middle / page=last / page=beyond-last (404 or clamp). per_page=25 (default) + 50 + 100.
5. **URL round-trip** — copy URL from page with 3+ filters into new tab → exact filter state restored.
6. **View toggle** — table ⇄ card via `?view=` URL param, persists across pagination.
7. **Autocomplete latency** — debounced < 150ms; results include matched alias + canonical display.
8. **Range validation** — min > max → clamp or error; non-numeric → ignore; extreme values (0 employees, 2100 year) → sensible handling.

---

## Wave 0 Requirements

- [ ] `tests/smoke/phase3-success-criteria.test.ts` — 20+ `it.todo(...)` stubs mapped to SRCH-01..13 + ROADMAP SC #1~#6 (pattern from Phase 2 Plan 02-01)
- [ ] `tests/smoke/phase3-srch13.test.ts` — Korean regression fixture (7 search strings × alias→canonical resolution)
- [ ] `tests/unit/search-fixtures.ts` — test data builders for facet combinations
- [ ] `src/messages/ko.json` + `src/messages/en.json` — `search.*` namespace full key tree (≈30 keys from UI-SPEC Copywriting Contract)
- [ ] `src/lib/search/.gitkeep` — empty dir for Wave 2 modules
- [ ] Vitest config already exists from Phase 2 — no re-init

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 375 px mobile bottom-sheet drawer interaction (slide-up gesture, accordion expand, "적용" button dismissal, overlay tap close) | UI-SPEC + SRCH-01 | Playwright banned per env; gesture + animation feel cannot be automated meaningfully | Chrome DevTools Device Mode → iPhone SE 375×667 → open `/ko/search` → tap '필터' → verify sheet animates to 80% height, 6 accordions work, '적용' dismisses |
| Autocomplete keyboard navigation (↑/↓ arrows, Enter, Escape) + screen reader announcement | SRCH-07 | ARIA live-region behavior cannot be meaningfully snapshot-tested | Type "토스" → verify list appears with aria-live polite announcement of result count → navigate with keyboard → Enter selects |
| Sort dropdown Korean label clarity | SRCH-08 | Copy quality is a subjective UX judgment | Hover/tap sort selector → confirm each of 8 options (4 columns × asc/desc) reads cleanly in Korean without overflow |
| View toggle animation polish (fade vs instant) | SRCH-09 | Visual tone judgment | Toggle between table/card → transition should feel Stripe/Linear, not CSS-transition-default |
| Active filter chip overflow (many chips wrapping) | SRCH-03 | Layout at extreme boundary | Select 15+ filters across all 6 facets → verify chip row wraps cleanly without horizontal scroll |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`npm run test` not `vitest` in watch)
- [ ] Feedback latency < 60s for unit, < 120s for smoke+load
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 6 complete

**Approval:** pending
