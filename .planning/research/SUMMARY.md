# Project Research Summary

**Project:** VC Co-Finder
**Domain:** Korean/Asian startup intelligence platform (faceted search + curated multi-source ETL)
**Researched:** 2026-04-20
**Confidence:** HIGH (core stack, architecture, legal/quotas) · MEDIUM (Korean tokenization specifics, scraping policy enforcement, DART parsing edge cases)

## Executive Summary

VC Co-Finder is a **researcher/journalist/job-seeker-first** startup intelligence platform — *not* an investor product. The wedge is **fully public, faceted multi-condition search** over a Korean-deep + Asia-extensible dataset, anchored by **per-fact provenance** and trustworthy freshness signals. Every persona decision (free public search, no payment in v1, table-stakes export and comparison, news scoping to Korean tech media) flows from this anti-Crunchbase positioning.

The recommended build is **Next.js 15.5 + Supabase Postgres + shadcn (Radix variant) + next-intl + Recharts**, with faceted search starting on **Postgres GIN + pg_trgm + app-side morpheme tokens** and a clean `SearchAdapter` interface that allows a swap to **self-hosted Meilisearch on Fly.io** when (a) records exceed ~50k or (b) p95 facet latency exceeds 800ms. ETL is a **separate Python service** (DART ecosystem is Python-only) running on **Fly.io**, scheduled by **GitHub Actions cron** — never on Vercel cron. Logos go to **Cloudflare R2** (zero egress is decisive). Auth uses Supabase native **Google + Kakao** (Naver deferred to v2 via Custom OIDC).

The dominant risks are **legal (THE VC ToS prohibits scraping; relying on it would invite C&D and DB-rights claims), trust (stale or unsourced data destroys the researcher persona), and Korean-search correctness (default Postgres FTS fails on Korean compounds).** Mitigation: source 더브이씨 only as a discovery signal (build the round dataset from DART + press releases + user submissions + VC portfolio pages); design provenance as a first-class schema concern from Phase 1; commit to app-side morpheme tokenization with alias tables before any user testing of search.

## Key Findings

### Recommended Stack

The 2026 Vercel-native pattern (Next 15.5 App Router + RSC + Server Actions + Supabase RLS + shadcn) is mature. The interesting decisions are the *peripheral* ones: Drizzle over Prisma (Supabase momentum + edge-safe), Postgres-first search with a clean adapter (defer Meili until proven necessary), Cloudflare R2 for logos (egress math is decisive on listing pages), Python ETL on Fly.io (DART libraries are Python-only), and GitHub Actions cron (Vercel cron caps at once/day on Hobby + can't run scrapers).

**Top 5 stack picks:**
- **Next.js 15.5 + React 19 + RSC** — App Router stable, Server Actions for mutations, ISR for company pages, Node middleware for Supabase auth refresh.
- **Supabase Postgres + `@supabase/ssr` + RLS** — given constraint; RLS gives premium-gating for free; auth-helpers is deprecated.
- **Drizzle ORM 0.36+** — typed SQL-first builder; tiny bundle; edge-safe; matches Supabase philosophy better than Prisma.
- **Postgres GIN + pg_trgm + app-side KoNLPy/mecab-ko tokens** behind `lib/search/adapter.ts` — works on managed Supabase (no extension privileges needed); migration to Meilisearch is hours, not weeks, when triggered.
- **next-intl 3.x + Recharts (via shadcn charts) + nuqs + Cloudflare R2** — Korean-first UI with English stub from day 1; chart primitives that match shadcn; URL-as-state for shareable filters; zero-egress logo hosting.

ETL stack: **Python 3.12 + OpenDartReader + Playwright + httpx + APScheduler** on Fly.io, triggered by GitHub Actions cron, writing to a `staging.*` schema before publishing to canonical tables.

See `STACK.md` for full version pins, install commands, alternatives considered, and free-tier exhaustion thresholds.

### Expected Features

The persona (researcher / journalist / job-seeker — *not* investor) inverts the usual feature priorities. Comparison view, CSV export, and email alerts are **table stakes** here even though Crunchbase paywalls them. News aggregation is included but **scoped tightly to Korean tech media** (플래텀, 아웃스탠딩, 바이라인네트워크 etc.) where global tools are weak.

**Must have (table stakes):**
- Faceted multi-condition filter (sector × stage × region × employees × cumulative funding × founded year) with active chips, live count, URL state, sub-1s response — *the differentiator must be best-in-class*
- Company profile page (Hero / Funding / 5yr Financials / Employees / News / Similar) with **provenance + last-updated badge on every fact**
- Funding round table with full stage taxonomy (incl. Pre-A, SAFE, Convertible, Grant, 비공개) and lead-vs-participant distinction
- 5-year time-series charts (revenue, op profit, employees) with toggle to 3/7yr; 억/조 number formatting native
- Side-by-side comparison (up to 5 companies) with overlay charts and absolute/indexed normalization toggle
- Korean+English alias autocomplete (토스 ⇄ 비바리퍼블리카 ⇄ Toss)
- Social login (Kakao + Google), watchlist, saved searches (≤5), email alert on new funding round (daily digest)
- CSV/Excel export (logged-in, 1,000-row cap, UTF-8 BOM, source/as-of columns appended by default)
- Public SEO-indexed company URLs with Organization JSON-LD; mobile responsive (drawer-based filter)
- User correction submission form → moderator queue

**Should have (differentiators for this persona):**
- Comparison view fully free (Crunchbase/PitchBook paywall this — wedge)
- KR-tech-media news aggregation per company (RSS-based, link-out only)
- Embeddable charts with attribution (journalist viral loop → backlinks)
- Aliases + rebranding history surfaced in UI
- Source-citation columns in every export (researcher trust)
- Basic interactive sector dashboards (funding by sector by quarter) — Dealroom-style but free

**Defer (v2+):** Investor profile pages (schema modeled in v1, UI deferred); "As-of date" historical state slider; LLM/semantic filter builder; paid tier + payment integration; public read API; native mobile apps; Asia content fill (Japan/SG/SEA — schema region-ready in v1).

**Anti-features (do not build):** VC matching/dealflow; user-generated company reviews; realtime ticker; AI-generated unlabeled summaries; full founder/exec career profiles.

### Architecture Approach

**RSC-first reads, Server Actions for mutations, RLS as the security boundary, ETL completely outside the Next.js app.** Public surface (`/`, `/search`, `/companies/[slug]`) renders via RSC + ISR with on-demand `revalidateTag` after ETL publish. Authed (`/me/*`) and admin (`/admin/*`) surfaces are route groups in the same Next.js app, gated by middleware + RLS. Search goes through `lib/search/adapter.ts` so the v1 Postgres implementation can be swapped for Meilisearch without touching call sites. ETL writes to `staging.*` schema, surfaces diffs to admin curation queue, then `publish()` upserts canonical + emits a revalidate webhook — never direct writes from external sources to user-facing tables.

**Major components:**
1. **Next.js app (Vercel)** — three route groups: `(public)` ISR, `(authed)` dynamic + RLS, `(admin)` role-gated; thin `lib/data/*` layer wraps all Supabase reads and attaches `_meta.source` to every fact.
2. **Supabase Postgres (single project)** — three schemas: `public` (canonical, RLS-permissive read / admin write), `staging` (raw + parsed ETL output + review queue), and user-scoped tables (`user_watchlists`, `user_saved_searches`, `user_alerts`) with strict `auth.uid()` RLS.
3. **Search adapter** — Postgres FTS + GIN + pg_trgm + materialized facet view in v1; Meilisearch self-hosted on Fly.io in v2 when D1 trigger fires.
4. **ETL service (Python, Fly.io)** — DART connector (OpenDartReader), press-release / VC-portfolio scrapers (Playwright + httpx), APScheduler for in-process scheduling; triggered by GitHub Actions cron; writes only to `staging.*`; calls `publish()` after admin approval.
5. **Email/alert worker** — runs alongside ETL; diffs new funding rounds against saved searches; sends via Resend (3k/mo free).

The schema is **provenance-first** (`data_sources` table with FK from every fact-bearing row; no nullable `source_id`) and **identity-aware from day 1** (`aliases`, `company_relations` for parent/sub, `company_identifiers` for corp_code/사업자번호/법인번호). Every monetary value is stored as `(amount_minor BIGINT, currency_code, original_text)`.

See `ARCHITECTURE.md` for the full system diagram, project structure, schema sketch, and Decision Points (D1–D5).

### Critical Pitfalls

**Top 5 (with phase mapping):**

1. **Scraping THE VC (더브이씨) — DB-rights + ToS violation** *(Phase 1 — policy)*
   THE VC's ToS explicitly prohibits scraping/crawling/caching. The 잡코리아 vs 사람인 case + 2022 야놀자 vs 여기어때 대법원 판결 establish that DB-rights claims survive even when individual data points are public. **Do not crawl 더브이씨.** Build the round dataset from DART 주요사항보고서 + press releases (re-expressed) + K-Startup/TIPS public lists + user submissions + per-VC portfolio pages (each robots.txt/ToS checked).

2. **No per-fact provenance — can't defend numbers when questioned** *(Phase 1 — schema, non-negotiable)*
   Use `company_facts(company_id, fact_type, value, value_unit, source_id, observed_at, confidence)` instead of flat `companies.employee_count INT`. UI must surface "출처: DART · 2026-03-15 업데이트" beside every fact.

3. **Stale data presented as current → researcher trust collapse** *(Phase 1 schema + Phase 4 UI)*
   Every record carries `last_verified_at` separate from `updated_at`. UI shows green/yellow/red freshness dot; "We don't claim completeness" disclaimer; one-click correction form per fact.

4. **Korean search broken with default `to_tsvector('simple')`** *(Phase 1 decision + Phase 3 build)*
   Default Postgres FTS treats Korean as opaque whitespace tokens. Solution: app-side morpheme tokenization with KoNLPy/mecab-ko in Python ETL, store as `search_tokens` text column with GIN trigram index; maintain `aliases` table. Fixed test query set: ["토스","토스뱅크","비바리퍼블리카","당근","당근마켓","Coupang","쿠팡"] — all must return reasonable results before launch.

5. **Faceted search degrades silently from <500ms to >5s as data grows** *(Phase 1 indexes + Phase 3 query strategy + Phase 6 cache)*
   At 10k rows everything works; at 100k + 8 facets, naive per-facet COUNT queries fall over. Prevention: GIN on `tsvector` and array columns from day 1, B-tree composites on common combinations, single-pass aggregation with FILTER clauses (or `pgfaceting`), Supavisor connection pooler in transaction mode, materialized facet view for global counts.

**Other high-priority pitfalls (full detail in PITFALLS.md):**
- DART parsing complexity (외감 vs 비외감, 연결 vs 별도, 매출액 normalization)
- Currency/unit confusion (10000× errors when 만원/억원 mixed)
- Entity resolution (토스 / 비바리퍼블리카 / Toss Inc / 토스뱅크 as duplicates)
- PIPA / GDPR exposure on exec/founder names — DSAR endpoint required from launch
- Supabase free-tier wall (DB hits 500MB faster than expected; auto-pause after 7 days idle)
- Vercel Hobby commercial-use prohibition + 100GB bandwidth ceiling
- SEO thin-content penalty on programmatic company pages
- Admin/curation UX neglect (no audit log = can't roll back bad mass-edits)
- Cold-start: must seed ≥5,000 quality companies BEFORE submitting sitemap
- Time-series chart traps (unit drift, gaps shown as zero, log-scale missing)

## Cross-Cutting Concerns (apply to every phase)

- **Provenance:** every fact-bearing row has `source_id NOT NULL`; reads attach `_meta.source` and UI displays it.
- **i18n:** all user-facing strings via `next-intl` `t()` from Phase 0. `ko.json` populated; `en.json` stub. No hardcoded Korean in JSX. Custom 억/조 locale helper.
- **RLS:** every user-scoped table has RLS enabled with `auth.uid()` policies; canonical tables have permissive read + restrictive write (admin only via service role). Service-role client lives only in `lib/supabase/admin.ts` and ETL.
- **Identity model:** `companies` is canonical; `aliases`, `company_identifiers`, `company_relations` are foundational tables from Phase 1. Brand ≠ legal ≠ English name in Korea.
- **Currency:** every monetary value is `(amount_minor BIGINT, currency_code CHAR(3), original_text TEXT)`. Normalize to USD at ETL time using historical FX at round date.
- **Region-aware schema:** `region` ISO country code on `companies` from day 1; `name_ko` + `name_en` columns separate. Asia expansion is content-fill, not migration.
- **Audit log:** append-only `audit_log(actor_id, action, entity_type, entity_id, before, after, source, occurred_at)` on every write to canonical tables, from Phase 2 onward.
- **Freshness signals:** `last_verified_at` distinct from `updated_at` on every fact; UI badge from Phase 4.
- **Compliance baseline:** privacy policy in Korean (KISA template), DSAR contact endpoint, cookie consent for EU IPs, marketing-consent-separate-from-signup-consent — all live before public launch.
- **Search adapter:** `lib/search/adapter.ts` interface from Phase 2 even with a 50-line Postgres implementation, so the Meilisearch swap stays cheap.
- **Free-tier monitoring:** Supabase + Vercel usage dashboards bookmarked; alerts at 70% of any quota.

## Implications for Roadmap

Suggested phase structure derived from architecture build order, dependency graph, and pitfall prevention timing.

### Phase 1: Foundation & Compliance Baseline
**Rationale:** Schema decisions and compliance posture compound. Provenance, identity, currency, RLS, audit log, i18n scaffolding — all are 1-day-now / 1-month-later if deferred.
**Delivers:** Next.js 15.5 + Supabase project + auth (Google + Kakao) + i18n scaffolding + Sentry + canonical schema (`companies`, `funding_rounds`, `investors`, `persons`, `aliases`, `company_relations`, `data_sources`, `company_facts`, `audit_log`) + privacy policy + DSAR endpoint.
**Avoids:** Pitfalls 1, 2, 3, 5, 7, 8, 14.

### Phase 2: Read-Only Profiles + Manual Seed
**Rationale:** Get the read path and provenance UI working with hand-curated data before automating ingestion.
**Delivers:** Company profile page (ISR) with Hero / Funding / Financials / Sources sections, Korean number formatting (억/조), provenance + last-updated badges, 50–200 manually-seeded companies.

### Phase 3: Faceted Search (Postgres Path)
**Rationale:** This is THE differentiator; must be best-in-class even at manual-seed scale.
**Delivers:** `/search` page with facet panel, active chips, result count, URL-state filters (nuqs), sort options, KR+EN alias autocomplete; `lib/search/adapter.ts` with Postgres FTS + GIN + pg_trgm + app-side morpheme tokens; fixed Korean search test suite passes.
**Research flag:** verify `pg_cjk_parser` extension availability on Supabase managed (fallback = app-side tokens).

### Phase 4: DART ETL + Admin Curation + Watchlists (parallel sub-tracks)

**4a — DART ETL + Staging→Review→Publish Pattern**
DART is the legal/free/official spine. Establishing the pattern here de-risks all future ETL sources.
Delivers: Python ETL on Fly.io triggered by GitHub Actions cron; DART connector; `staging.*` schema; `publish()` with revalidate webhook; corp_code → 사업자번호 → company identity reconciliation.

**4b — Admin Curation UI** (parallel)
Delivers: `/admin/curation` review queue with diff view, approve/reject + audit log entry, role gate via JWT claim + RLS, soft-delete and version history.

**4c — Watchlists + Saved Searches** (parallel)
Delivers: `user_watchlists`, `user_saved_searches` with strict RLS; inline ♡ buttons; watchlist page with summary stats; saved-search rehydration into URL filters.

### Phase 5: Press Release / VC Portfolio Ingestion + User Submissions
**Rationale:** Once the staging pattern is proven on DART, additional (legal) sources can follow. User submissions ride the same review queue.
**Delivers:** Polite per-source scrapers (robots.txt + UA + 1 req/sec) for VC firm portfolio pages and Korean tech-media press releases; user submission form → moderation queue with required source URL/proof; brand_legal_map curated table for top 500 startups.

### Phase 6: Time-Series Visualization + Comparison View
**Rationale:** With multi-source data flowing, charts and comparison become the persona's daily-job feature.
**Delivers:** Recharts-based 5yr financial charts with 3/7yr toggle, gap-as-break visualization, log-scale toggle, 억원 axis labels; side-by-side comparison view (up to 5 companies) with absolute/indexed toggle and PNG/PDF/CSV export with source watermark.

### Phase 7: Email Alerts + Export + News Aggregation
**Rationale:** Return-mechanism + researcher non-negotiable + journalist differentiator.
**Delivers:** Hourly alert worker diffs new funding rounds against saved searches → Resend digest emails (one-click unsubscribe); CSV/Excel export with source/as-of columns + UTF-8 BOM + 1k row cap; RSS poller for 8–12 Korean tech outlets with alias-fuzzy-matching.

### Phase 8: SEO Hardening + Sector Dashboards + Public Launch
**Rationale:** Cold-start risk means launch happens only after ≥5k quality companies + sitemap discipline + thin-content noindex.
**Delivers:** Organization JSON-LD on every page; per-company unique 1-paragraph original summary; noindex on companies with <5 facts; progressive sitemap submission; basic interactive sector dashboard (funding by sector by quarter via materialized view); embeddable charts with attribution; mobile drawer-based filter polish.
**Pre-launch gate:** ≥5,000 seeded companies + Vercel Pro active + load test passing.

### Phase Ordering Rationale

- **Schema-first (Phase 1) is non-negotiable** because provenance, identity, currency, and RLS are nearly impossible to retrofit.
- **Read path before ingestion (Phase 2 before 4)** validates trust-display UI on hand-curated data before automation amplifies flaws.
- **Search before ETL (Phase 3 before 4)** because Korean tokenization decision drives ETL token-generation work.
- **DART before any scraping (Phase 4a before 5)** because DART is legally clean and proves the staging pattern.
- **Admin UX in parallel with ETL (Phase 4b)** prevents the "submission queue graveyard" failure mode.
- **Watchlists/saves can run parallel (Phase 4c)** because they share no code with ETL.
- **Charts after multi-source data (Phase 6)** because empty charts on sparse data hurt trust.
- **Public launch only after cold-start gates (Phase 8)** — submitting a thin-content sitemap to Google takes 6 months to recover from.

### Research Flags (during planning each phase)

- **Phase 1:** Confirm Kakao Business app registration process + timing. Confirm `pg_cjk_parser` availability on Supabase managed plan.
- **Phase 3:** Korean morphology — finalize KoNLPy vs mecab-ko vs KOMORAN vs Khaiii choice; benchmark on representative Korean startup name corpus.
- **Phase 4a:** DART API — institutional vs personal key process, account-name normalization across industries, HWP/HWPX parsing for 사업보고서 attachments.
- **Phase 5:** Per-source legal review for every scraping target.
- **Phase 8:** SEO original-summary generation strategy; load testing tools and target scenarios.

Phases with standard well-documented patterns: Phase 2 (Next.js ISR + RSC reads), Phase 4c (Supabase RLS), Phase 7 (Resend + react-email + GH Actions cron).

## Open Questions (resolve before/during specific phases)

- **Before Phase 1:** Will Kakao Business app be registered in time?
- **Before Phase 1:** Confirm Supabase managed plan extension permissions.
- **Before Phase 3:** Which Korean morphological analyzer (benchmark on real query corpus)?
- **Before Phase 4a:** Apply for institutional DART API key?
- **Before Phase 5:** Has THE VC partnership outreach succeeded?
- **Before Phase 5:** Per-VC robots.txt + ToS legal review checklist.
- **Before Phase 7:** SimilarWeb pricing/terms reality.
- **Before Phase 8:** Original-summary generation approach (template vs LLM-with-validation).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against official docs (Next 15.5, Supabase, shadcn). |
| Features | MEDIUM-HIGH | Crunchbase/PitchBook/Dealroom verified via official docs; Korean platforms via secondary sources. |
| Architecture | HIGH | Next.js + Supabase + RLS patterns well-established. |
| Pitfalls | HIGH | Legal pitfalls verified against 2022 대법원 판례 and THE VC ToS. Quotas verified against official pricing. |

**Overall confidence:** HIGH on direction; MEDIUM on specific items in Open Questions.

---
*Research completed: 2026-04-20 — Ready for roadmap*
