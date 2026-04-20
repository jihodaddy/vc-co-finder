# Roadmap: VC Co-Finder

**Created:** 2026-04-20
**Granularity:** standard (8 phases, 4a/4b/4c parallelizable)
**Parallelization:** enabled
**Total v1 requirements:** 81 (re-verified from REQUIREMENTS.md categories)
**Coverage:** 81 / 81 mapped (100%)

## Core Value

리서처가 "특정 조건(섹터·라운드·지역·인원·트래픽)에 맞는 한국·아시아 스타트업"을 30초 안에 찾아내고, 시계열 추이로 검증할 수 있어야 한다.

## Phases

- [ ] **Phase 1: Foundation & Compliance Baseline** — Next.js + Supabase + auth + canonical schema + provenance + identity + currency + RLS + i18n + PIPA/DSAR
- [ ] **Phase 2: Read-Only Profiles + Manual Seed** — Company detail page (ISR) with provenance UI + 한국 통화 포맷 + 50–200 manually-curated companies
- [ ] **Phase 3: Faceted Search (Postgres Path)** — `/search` with multi-condition facets, KR+EN aliases, URL state, Korean morpheme tokens, sub-1s p95
- [ ] **Phase 4a: DART ETL + Staging→Review→Publish** — Python ETL on Fly.io, GitHub Actions cron, DART connector, staging schema, identity reconciliation
- [ ] **Phase 4b: Admin Curation UI** — `/admin/curation` review queue, diff view, audit log, soft-delete + version history (parallel with 4a)
- [ ] **Phase 4c: Watchlists + Saved Searches** — RLS-gated user features, `/me/*` pages, ♡ button, saved-search rehydration (parallel with 4a/4b)
- [ ] **Phase 5: Additional Sources + User Submissions** — Polite VC portfolio scrapers + user correction submission form into shared review queue
- [ ] **Phase 6: Time-Series Visualization + Comparison View** — Recharts financial/employee charts, similar companies, side-by-side comparison up to 5 with PNG/PDF export
- [ ] **Phase 7: Email Alerts + Export + News Aggregation** — Resend daily digest for saved searches, CSV/Excel export with provenance, KR tech-media RSS poller
- [ ] **Phase 8: SEO + Sector Dashboards + Launch Readiness** — JSON-LD, noindex thin pages, sector dashboard (materialized view), Vercel Pro upgrade, load test, ≥5k seed

## Phase Details

### Phase 1: Foundation & Compliance Baseline

**Goal**: A deployed Next.js 15.5 + Supabase project where a developer can sign up via Google or Kakao, all canonical tables exist with provenance + identity + currency baked in, RLS protects user-scoped data, every UI string flows through `t()`, the Korean privacy policy is live, and the DSAR endpoint accepts requests.

**Depends on**: Nothing (first phase)

**Requirements**:
- Foundation: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10, FOUND-11, FOUND-12, FOUND-13, FOUND-14
- Trust (schema-level): TRUST-01, TRUST-02, TRUST-03, TRUST-06, TRUST-07

**Success Criteria** (what must be TRUE):
  1. A developer can clone the repo, run `npm install + npm run dev`, sign up via Google AND Kakao on a Supabase-backed Next.js app, and the session persists across refresh and browser restart.
  2. A migration creates every canonical table (`companies`, `aliases`, `company_identifiers`, `company_relations`, `funding_rounds`, `investors`, `round_investors`, `persons`, `person_roles`, `data_sources`, `company_facts`, `audit_log`, `news_mentions`) with `source_id NOT NULL` on every fact-bearing row, `last_verified_at` distinct from `updated_at`, and the `(amount_minor, currency_code, original_text)` triple on every monetary column.
  3. Every user-scoped table has RLS enabled with `auth.uid()` policies; the canonical tables permit anon read but block direct writes from anything other than the service-role client. Audit-log triggers append before/after on every canonical INSERT/UPDATE/DELETE.
  4. A user visiting any path sees Korean copy via next-intl's `t()` (no hardcoded Korean in JSX), can reach `/privacy` and `/terms` (PIPA-compliant Korean policy), and `/contact/dsar` accepts a personal-data request and stores it for admin follow-up.
  5. Sentry captures a thrown error in both the Next.js runtime and a server action; Vercel Analytics + Speed Insights show pageviews on the deployed URL.

**Pitfalls addressed**: 1 (scraping policy baked in by data-source registry), 2 (last_verified_at separate), 3 (per-fact provenance schema), 5 (currency triple), 7 (PIPA + DSAR + CPO), 8 (alias + relation tables), 9 (initial GIN index strategy seeded), 11 (storage budget), 12 (Vercel commercial decision documented), 14 (audit_log from day 1)

**Plans**: 8 plans (6 waves)
- [x] 01-01-PLAN.md — Bootstrap Next.js 15.5 + TS + Tailwind v4 + shadcn/Radix + @supabase/ssr + Drizzle + next-intl + route groups (wave 1)
- [x] 01-02-PLAN.md — Canonical schema: 13 tables + ENUMs + currency triple + staging + audit_log function + GIN/tsvector seeds (wave 2)
- [x] 01-03-PLAN.md — RLS policies (canonical + user-scoped) + audit triggers + admin 404-guard (wave 3)
- [x] 01-04-PLAN.md — Google + Kakao OAuth via @supabase/ssr + PIPA consent + Kakao Business app blocker (wave 4)
- [ ] 01-05-PLAN.md — Landing + /sources + /privacy (PIPA) + /terms + admin stub + disclaimer + cookie notice (wave 5)
- [ ] 01-06-PLAN.md — DSAR endpoint + email verification + Resend + CPO forwarding alias (wave 5)
- [ ] 01-07-PLAN.md — Sentry (client/server/edge) + PII scrubbing + Vercel Analytics + heartbeat + storage monitor (wave 5)
- [ ] 01-08-PLAN.md — [BLOCKING] supabase db push + Vercel deploy + end-to-end smoke tests (wave 6)

---

### Phase 2: Read-Only Profiles + Manual Seed

**Goal**: A researcher can navigate to `/companies/[slug]` for any of 50–200 manually-seeded Korean startups and read a hero section, funding-round table, Korean alias list, and primary identifiers — every fact carrying an inline source badge with last-verified date and a freshness color dot.

**Depends on**: Phase 1 (schema, auth, provenance display infra)

**Requirements**:
- Profile: PROF-01, PROF-02, PROF-03, PROF-08, PROF-10, PROF-11
- Trust (UI-level): TRUST-04, TRUST-05

**Success Criteria** (what must be TRUE):
  1. A user can visit `/companies/toss` (or any seeded slug) and see hero (logo, name_ko, name_en, sector, HQ, one-liner, website link), a funding-round table with full stage taxonomy (Pre-A / Seed / Series A–D / Bridge / SAFE / Convertible / Grant / 비공개) showing KRW + USD with proper 억/조 formatting, and current + past Korean aliases.
  2. Every numeric fact on the company page renders an inline "출처: [DART/manual] · 2026-MM-DD 업데이트" badge, plus a green/yellow/red freshness dot reflecting `last_verified_at` age (≤30d / ≤180d / >180d).
  3. The page reads correctly on a 375px-wide mobile viewport (drawer or collapsible sections, readable typography, touch-sized targets).
  4. The page is rendered via ISR with 1-hour revalidate; first paint loads in <1s on 4G simulation; the app correctly displays "데이터 완전성을 보장하지 않습니다" disclaimer in the footer.
  5. 50–200 seed companies are committed via SQL/CSV import (with `source_id` pointing to a `manual_curation` data_sources row), enabling Phase 3 search QA against real names.

**Pitfalls addressed**: 2 (freshness badge live), 3 (provenance display), 5 (KRW+USD currency rendering), 16 (per-row data-quality visible)

**Plans**: TBD
**UI hint**: yes

---

### Phase 3: Faceted Search (Postgres Path)

**Goal**: A researcher lands at `/search`, applies multi-condition facets (sector × stage × region × employees × cumulative funding × founded year), and sees results in <1s p95 with active filter chips, live count, URL-shareable state, and Korean alias autocomplete that resolves "토스" / "비바리퍼블리카" / "Toss" to the same canonical entity.

**Depends on**: Phase 2 (seeded company data)

**Requirements**:
- Search: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, SRCH-07, SRCH-08, SRCH-09, SRCH-10, SRCH-11, SRCH-12, SRCH-13

**Success Criteria** (what must be TRUE):
  1. A user can apply ≥5 simultaneous facets at `/search?sectors=fintech,ai&stage=series_a,series_b&region=KR&employees=50-500` and see the result count update live (e.g., "1,247개 기업"), with each active facet shown as a removable chip plus "모두 지우기".
  2. Copying the URL into a new tab restores the exact filter state (URL is the source of truth via nuqs); sharing a search by link works between users.
  3. The fixed Korean test query suite — ["토스","토스뱅크","비바리퍼블리카","당근","당근마켓","Coupang","쿠팡"] — all return reasonable matches via app-side morpheme tokenization (mecab-ko/KoNLPy) + GIN trigram index + alias table joins; autocomplete suggests matching aliases as the user types.
  4. p95 facet response time is <1s on a representative dataset (measured against ≥5,000 seeded companies, GIN indexes on tsvector + arrays, single-pass aggregation with FILTER clauses); the load test scenario is automated and runnable in CI.
  5. Results can be sorted by name / latest funding date / cumulative funding / founded year (asc & desc) and toggled between table and card-grid view; pagination/infinite-scroll behaves correctly without UI flicker.
  6. All search code routes through `lib/search/adapter.ts` so a future Meilisearch swap touches only `lib/search/postgres.ts`.

**Pitfalls addressed**: 4 (Korean tokenization solved), 8 (alias resolution in autocomplete), 9 (facet performance discipline from index strategy)

**Plans**: TBD
**UI hint**: yes

---

### Phase 4a: DART ETL + Staging→Review→Publish

**Goal**: An automated DART ETL pipeline runs on a daily GitHub-Actions-triggered Fly.io worker, pulls financial statements + executive info for 외감 startups, lands rows in `staging.*`, reconciles `corp_code → 사업자등록번호 → company_id` identities, and is ready for admin approval (Phase 4b) before promoting to canonical tables with `revalidateTag` cache invalidation.

**Depends on**: Phase 1 (schema, identity tables, audit_log)

**Requirements**:
- Data: DATA-01, DATA-02, DATA-03, DATA-04, DATA-08, DATA-09, DATA-10, DATA-11

**Success Criteria** (what must be TRUE):
  1. A scheduled GitHub Actions cron job (daily 02:00 KST) successfully invokes a Fly.io Python 3.12 worker that pulls DART financial statements (revenue, op income, assets, liabilities), executive info, and disclosure events for ≥80% of seeded 외감 companies.
  2. All ETL writes land first in `staging.*` schema; nothing reaches canonical tables without going through `publish()` which atomically upserts + records `data_sources` row + audit_log entry + emits a `revalidateTag(company:${id})` webhook.
  3. The corp_code → 사업자등록번호 → canonical `company_id` mapping table reconciles ≥95% of seeded companies; ambiguous matches land in a manual-review queue rather than silently creating duplicates.
  4. ETL runs are idempotent: re-running the same daily job yields zero net changes when source data is unchanged; processed/new/updated/skipped counts are logged; errors flow to Sentry with stack traces and source identifiers.
  5. Source code never references `thevc.kr` (codified in a CI grep check); the data_sources table records the legal/policy provenance for every ingestion.

**Pitfalls addressed**: 1 (no THE VC scraping enforced), 6 (DART parsing complexity owned), 8 (entity resolution at ingest time), 11 (idempotent + cached raw payloads keep DB lean)

**Plans**: TBD

---

### Phase 4b: Admin Curation UI

**Goal**: An admin or editor can log in, visit `/admin/curation`, see a unified queue of pending ETL diffs and user submissions, view a side-by-side before/after diff with clickable source links, approve or reject with one click, and trust that every action is captured in the audit log with rollback affordance.

**Depends on**: Phase 1 (role model, audit_log), Phase 4a (staging schema produces pending items). Builds in **parallel** with Phase 4a/4c.

**Requirements**:
- Admin: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06
- Data (queue receiver): DATA-07

**Success Criteria** (what must be TRUE):
  1. An admin signs in and reaches `/admin/curation` (gated by middleware checking `profiles.role IN ('admin','editor')` AND backed by RLS — defense in depth); a non-admin attempting the URL gets 404.
  2. The queue shows pending items from BOTH ETL staging AND user submissions, with a side-by-side diff (existing canonical value vs proposed value) plus clickable source URL/evidence; counts update live as items are processed.
  3. Approve action atomically: writes canonical via `publish()`, appends `audit_log` row with `actor_id`, `before`, `after`, `source`, and triggers cache revalidation. Reject action records the decision + reason memo without touching canonical.
  4. A "version history" view on any canonical row shows the audit_log timeline; one-click "rollback to this version" restores prior state via a new audit_log entry (soft, not destructive).
  5. `/admin/users` lets an admin promote/demote users between `user`, `editor`, `admin` roles; changes propagate to JWT claims on next login.

**Pitfalls addressed**: 14 (admin UX is first-class, not an afterthought; audit log enables rollback)

**Plans**: TBD
**UI hint**: yes

---

### Phase 4c: Watchlists + Saved Searches

**Goal**: A logged-in user can ♡ companies from search results or company pages, view their watchlist at `/me/watchlist` with summary columns, name and save up to 5 facet-filter combinations, and re-apply any saved search to instantly rehydrate URL-state filters.

**Depends on**: Phase 1 (auth + RLS), Phase 2 (company pages have ♡ slot), Phase 3 (search facet state to save). Builds in **parallel** with Phase 4a/4b.

**Requirements**:
- User: USER-01, USER-02, USER-03, USER-04

**Success Criteria** (what must be TRUE):
  1. A logged-in user clicks ♡ on a company card (search or detail) and the action persists immediately (`useOptimistic` UI), capped at 50 saved companies; logged-out users see a "로그인하고 저장하기" prompt.
  2. `/me/watchlist` lists saved companies with name + sector + latest round summary + last-updated; rows link to `/companies/[slug]`; users can remove items inline.
  3. From `/search`, the user can name and save the current facet combination (e.g., "Series B fintech"), capped at 5 saved searches; saved searches appear at `/me/saved-searches`.
  4. Clicking a saved search rehydrates the exact URL state, returning the user to `/search?sectors=...` with all chips and counts identical to the moment they saved it.
  5. `user_watchlists` and `user_saved_searches` tables enforce strict `auth.uid() = user_id` RLS — verified by an integration test that a second user cannot read or write the first user's rows even with their JWT.

**Pitfalls addressed**: (Foundation pitfalls already covered; this phase introduces no new high-risk surface)

**Plans**: TBD
**UI hint**: yes

---

### Phase 5: Additional Sources + User Submissions

**Goal**: With the staging→review→publish pattern proven on DART, additional legally-clean sources (Korean VC portfolio pages) feed the same queue. Users can submit corrections to any displayed fact via an inline form requiring source URL — flowing through the same admin review.

**Depends on**: Phase 4a (staging pattern), Phase 4b (review queue UI), Phase 2 (company pages have correction button slot)

**Requirements**:
- Data: DATA-05
- User: USER-08

**Success Criteria** (what must be TRUE):
  1. ETL workers scrape ≥5 Korean VC portfolio pages (Altos / IMM / Kakao Ventures / etc.) at ≤1 req/sec, respecting robots.txt and identifying as a research bot in the User-Agent; per-source legal compliance is documented in `etl/<source>/COMPLIANCE.md`.
  2. Each scraped funding round arrives in the same `staging` schema as DART output and surfaces in the existing `/admin/curation` queue with the same diff view — no parallel pipelines.
  3. A logged-in user clicking "수정 제안" on any company-page fact opens a form requiring a source URL (validated as a real URL); submissions write to `user_submissions` with `status='pending'` and appear in the admin queue with submitter attribution.
  4. The admin can approve a user submission with one click, which atomically: applies the change via `publish()`, sends an opt-in confirmation email to the submitter (Resend), and bumps the submitter's contribution count.
  5. Spam protection: rate-limited to 5 submissions per hour per IP; Cloudflare Turnstile (free) blocks automated submissions on the form.

**Pitfalls addressed**: 1 (per-source legal review), 14 (submission queue stays drained because admin UX is solid)

**Plans**: TBD

---

### Phase 6: Time-Series Visualization + Comparison View

**Goal**: A researcher can visit a company page and see 5-year financial charts with proper 억/조 axis formatting, gap-as-break visualization, and 3/5/7-year toggles; from search or watchlist, the user can select up to 5 companies and view side-by-side comparison with absolute/indexed time-series overlays and PNG/PDF/CSV export with source watermark.

**Depends on**: Phase 4a (financial data flowing), Phase 4c (watchlist source for selection)

**Requirements**:
- Profile: PROF-04, PROF-05, PROF-06
- Comparison: COMP-01, COMP-02, COMP-03, COMP-04

**Success Criteria** (what must be TRUE):
  1. A company page with ≥3 years of DART data renders revenue / op income / assets / liabilities as a Recharts line chart with 3/5/7-year toggle, 억/조 Y-axis labels, gaps shown as line breaks (not zeros), and a log-scale toggle for charts spanning 3+ orders of magnitude.
  2. The employee-count time-series shows official DART filings vs estimated (e.g., job-board signal) with distinct visual treatment (solid vs dashed); each point's source is visible on hover.
  3. "Similar Companies" section shows 5–10 auto-recommended companies (same sector + similar round stage) as cards; recommendations refresh as data changes.
  4. From a search results page or watchlist, a user can multi-select up to 5 companies and click "비교" to reach `/compare?companies=[a,b,c,d,e]` showing a side-by-side table (latest round, revenue, employees, cumulative funding) plus an overlay time-series chart with absolute / indexed (year-0 = 100) toggle.
  5. The comparison view exports to PNG and PDF with a footer watermark including source attribution and `/compare` URL — verified by visual diff.

**Pitfalls addressed**: 5 (currency rendering correct), 16 (gap visualization, log toggle, unit-aware charts)

**Plans**: TBD
**UI hint**: yes

---

### Phase 7: Email Alerts + Export + News Aggregation

**Goal**: A researcher saves a search like "Series B fintech 2024+" and receives a daily Resend digest email when matching new funding rounds appear; from any results page or watchlist they export up to 1,000 rows of CSV/Excel with source + last_verified_at columns; each company page shows 5–10 recent Korean tech-media mentions matched via aliases.

**Depends on**: Phase 4a (rounds flow), Phase 4c (saved searches), Phase 5 (matured ingestion patterns)

**Requirements**:
- User: USER-05, USER-06, USER-07
- Data: DATA-06
- Profile: PROF-07

**Success Criteria** (what must be TRUE):
  1. An hourly worker (GitHub Actions cron → Fly.io worker, sharing ETL infra) diffs new `funding_rounds` published in the last 24h against every saved search; matching rounds aggregate into a daily Resend digest email per user, sent at 09:00 KST.
  2. Every alert email includes a one-click unsubscribe link (PIPA §22-2 compliant); `/me/notifications` lets the user toggle alert frequency, mute specific saved searches, or disable all alerts.
  3. From `/search` or `/me/watchlist`, the user clicks "내보내기" and receives a CSV (UTF-8 with BOM, Excel-friendly) capped at 1,000 rows; the file includes auto-appended `source` and `last_verified_at` columns for every fact.
  4. An RSS poller covers 8–12 Korean tech-media outlets (플래텀, 아웃스탠딩, 바이라인네트워크, …); fuzzy-matching on company aliases populates `news_mentions` rows with title + outlet + published_at + URL.
  5. Each company page shows up to 10 most-recent news mentions as external link-out cards (no full-text storage — title + outlet + date only); click counts are tracked for relevance ranking.

**Pitfalls addressed**: 7 (unsubscribe + opt-in compliance), 14 (alert worker shares ETL infra so admin maintains it)

**Plans**: TBD
**UI hint**: yes

---

### Phase 8: SEO + Sector Dashboards + Launch Readiness

**Goal**: Public launch goes live behind a hardened SEO posture (JSON-LD on every page, noindex on thin content, progressive sitemap), with a free public sector dashboard that shows funding-by-sector-by-quarter (materialized view), Vercel Pro upgraded for commercial use, and a load test confirming sub-1s p95 on 100k synthetic rows.

**Depends on**: All prior phases (data quality + UX + features must be ready)

**Requirements**:
- Profile: PROF-09
- Comparison: COMP-05, COMP-06
- Launch: LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04, LAUNCH-05

**Success Criteria** (what must be TRUE):
  1. Every company page emits a valid Organization JSON-LD block (verified by Google Rich Results test) and a unique 1-paragraph Korean meta description derived from financial trend signals (no two pages share the same description).
  2. `robots.txt` and dynamic `sitemap.xml` route exist; sitemap includes ONLY canonical published companies with ≥5 facts; pages with <5 facts emit `<meta name="robots" content="noindex">` (thin-content guard).
  3. The free public `/dashboards/sectors` page renders quarterly funding totals + round counts per sector from a nightly-refreshed materialized view; charts are embeddable via iframe with attribution + source watermark.
  4. ≥5,000 verified companies are seeded (DART + K-Startup + manual + curated submissions) before sitemap submission to Google Search Console; Vercel Pro is active and Speed Insights confirms p95 LCP <2s on mobile.
  5. An automated load test (k6 or Artillery) drives 5,000 simulated concurrent requests against `/search` with 5-facet queries on a 100k-row synthetic dataset and reports p95 <1s; results captured in `tests/load/REPORT.md`.

**Pitfalls addressed**: 10 (SEO thin-content + JSON-LD discipline), 12 (Vercel Pro for commercial use), 15 (cold-start solved via 5k seed gate), 11 (DB-size monitoring before public traffic)

**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Compliance Baseline | 0/? | Not started | - |
| 2. Read-Only Profiles + Manual Seed | 0/? | Not started | - |
| 3. Faceted Search (Postgres Path) | 0/? | Not started | - |
| 4a. DART ETL + Staging→Review→Publish | 0/? | Not started | - |
| 4b. Admin Curation UI | 0/? | Not started | - |
| 4c. Watchlists + Saved Searches | 0/? | Not started | - |
| 5. Additional Sources + User Submissions | 0/? | Not started | - |
| 6. Time-Series Visualization + Comparison | 0/? | Not started | - |
| 7. Email Alerts + Export + News | 0/? | Not started | - |
| 8. SEO + Sector Dashboards + Launch | 0/? | Not started | - |

## Coverage Summary

**By category:**
- FOUND (14): all → Phase 1
- TRUST (7): 5 → Phase 1 (schema), 2 → Phase 2 (UI badges)
- PROF (11): 6 → Phase 2, 3 → Phase 6, 1 → Phase 7, 1 → Phase 8
- SRCH (13): all → Phase 3
- USER (8): 4 → Phase 4c, 1 → Phase 5, 3 → Phase 7
- COMP (6): 4 → Phase 6, 2 → Phase 8
- DATA (11): 8 → Phase 4a, 1 → Phase 4b, 1 → Phase 5, 1 → Phase 7
- ADMIN (6): all → Phase 4b
- LAUNCH (5): all → Phase 8

**Total mapped:** 81 / 81 (100%)

## Parallelization Opportunities

Per `config.json` (parallelization=true), Phase 4 splits into three sub-tracks that can be built simultaneously by parallel agents:

| Sub-phase | Depends On | Shares Code With |
|-----------|------------|------------------|
| 4a — DART ETL | Phase 1 | None of 4b/4c |
| 4b — Admin Curation UI | Phase 1, Phase 4a (queue producer) | None of 4a/4c |
| 4c — Watchlists + Saved Searches | Phase 1, Phase 2, Phase 3 | None of 4a/4b |

**Recommended execution:** kick off all three in parallel after Phase 3 completes. 4b becomes useful only after 4a starts producing items, but the UI scaffold can be built against fixture data.

## Cross-Cutting Concerns (apply every phase)

These are reinforced from research/SUMMARY.md and must be checked at every plan-check + verifier gate:

- **Provenance**: every fact-bearing row has `source_id NOT NULL`; reads attach `_meta.source`; UI displays it.
- **i18n**: all user-facing strings via `t()` from Phase 1; no hardcoded Korean in JSX.
- **RLS**: every user-scoped table has RLS with `auth.uid()` policies; canonical tables permissive read + restrictive write.
- **Identity**: brand ≠ legal ≠ English name in Korea; alias + relation tables foundational.
- **Currency**: every monetary value `(amount_minor BIGINT, currency_code CHAR(3), original_text TEXT)`.
- **Audit log**: append-only on every canonical-table write from Phase 1.
- **Freshness**: `last_verified_at` distinct from `updated_at`; UI badge present.
- **Compliance**: PIPA privacy policy, DSAR endpoint, marketing-consent-separate, cookie consent for EU IPs.
- **Search adapter**: `lib/search/adapter.ts` interface from Phase 3 — Meilisearch swap stays cheap.
- **Free-tier monitoring**: Supabase + Vercel + Resend + Fly.io dashboards bookmarked, alerts at 70% of any quota.

## Phase Ordering Rationale

- **Schema-first (Phase 1) is non-negotiable** — provenance, identity, currency, RLS are nearly impossible to retrofit.
- **Read path before ingestion (Phase 2 before 4)** validates trust-display UI on hand-curated data before automation amplifies flaws.
- **Search before ETL (Phase 3 before 4)** because Korean tokenization decision drives ETL token-generation work in 4a.
- **DART before any scraping (Phase 4a before 5)** — DART is legally clean and proves the staging pattern.
- **Admin UX in parallel with ETL (Phase 4b)** prevents the "submission queue graveyard" failure mode.
- **Watchlists/saves can run parallel (Phase 4c)** — share no code with ETL.
- **Charts after multi-source data (Phase 6)** — empty charts on sparse data hurt trust.
- **Public launch only after cold-start gates (Phase 8)** — submitting a thin-content sitemap to Google takes 6+ months to recover from.

---
*Roadmap created: 2026-04-20*
*Source: PROJECT.md (core value), REQUIREMENTS.md (81 v1 reqs), research/SUMMARY.md + STACK.md + ARCHITECTURE.md + PITFALLS.md*
