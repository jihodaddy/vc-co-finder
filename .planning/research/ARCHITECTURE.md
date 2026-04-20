# Architecture Research

**Domain:** Korean/Asian Startup Intelligence Platform (faceted search + time-series + curated ETL)
**Researched:** 2026-04-20
**Confidence:** HIGH (Next.js/Supabase patterns well-established; ETL hosting + search scaling are explicit decision points with clear thresholds)

---

## Standard Architecture

### System Overview

```
                            ┌──────────────────────────┐
                            │     End Users (Web)      │
                            │  Researcher / Press /    │
                            │  Job-seeker / Admin      │
                            └────────────┬─────────────┘
                                         │ HTTPS
                            ┌────────────▼─────────────┐
                            │   Vercel CDN + Edge      │
                            │   (ISR cache, static)    │
                            └────────────┬─────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                           Next.js 14 App (Vercel)                                │
│                                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  │
│  │  Public Surface      │  │  Authed Surface      │  │  Admin Surface       │  │
│  │  /, /companies/[id], │  │  /me/watchlists,     │  │  /admin/curation,    │  │
│  │  /search             │  │  /me/searches        │  │  /admin/ingestion    │  │
│  │  (RSC + ISR)         │  │  (RSC + Server       │  │  (RSC + Server       │  │
│  │                      │  │   Actions, dynamic)  │  │   Actions, RLS-gate) │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘  │
│             │                         │                         │              │
│  ┌──────────▼─────────────────────────▼─────────────────────────▼───────────┐  │
│  │               Server Layer: Server Components + Server Actions            │  │
│  │  - lib/db (Supabase server client)  - lib/search (FTS or Meili adapter)  │  │
│  │  - lib/auth (cookie/session)        - lib/cache (revalidateTag)          │  │
│  └──────────────────────────────────┬───────────────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────────────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                │                     │                     │
       ┌────────▼────────┐  ┌─────────▼─────────┐  ┌────────▼─────────┐
       │  Supabase       │  │  Search Index     │  │  Email/Alerts    │
       │  Postgres + RLS │  │  Postgres FTS     │  │  Resend / Plunk  │
       │  Auth + Storage │  │  (v1) → Meili(v2) │  │  (transactional) │
       └────────▲────────┘  └─────────▲─────────┘  └──────────────────┘
                │                     │
                │ writes              │ index sync
                │                     │ (publish hook)
                │                     │
       ┌────────┴─────────────────────┴────────┐
       │       ETL / Worker Layer (separate)    │
       │   GitHub Actions OR Railway worker     │
       │  ┌──────────┐  ┌──────────┐  ┌──────┐ │
       │  │ DART API │  │ TheVC    │  │ Manual│ │
       │  │ Connector│  │ Scraper  │  │ Curate│ │
       │  └────┬─────┘  └────┬─────┘  └───┬──┘ │
       │       └────────┬────┴─────────────┘   │
       │       ┌────────▼──────────┐           │
       │       │  Staging Tables   │           │
       │       │  (raw + parsed)   │           │
       │       └────────┬──────────┘           │
       │       ┌────────▼──────────┐           │
       │       │ Review/Validation │           │
       │       │  (admin queue)    │           │
       │       └────────┬──────────┘           │
       │       ┌────────▼──────────┐           │
       │       │ Publish to canonical          │
       │       │ tables + bump search          │
       │       │ index + revalidateTag         │
       │       └───────────────────┘           │
       └────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **Public web app** | Marketing, search UI, company pages, auth flows | Next.js 14 App Router, RSC-first, ISR for company pages |
| **Authed surface** | Watchlists, saved searches, alert management | Server Actions with RLS-gated Supabase queries |
| **Admin surface** | Curation queue review, ingestion monitoring, manual edits | Same Next.js app under `/admin/*` route group, gated by `role='admin'` claim + RLS |
| **Supabase Postgres** | Canonical data store, auth, storage, RLS enforcement | Single project (v1), schema separation: `public`, `staging`, `internal` |
| **Search index** | Faceted search, full-text, fast facet counts | Postgres FTS + GIN indexes (v1) → Meilisearch (v2 trigger: see Decision Points) |
| **ETL/Worker layer** | DART pulls, TheVC scraping, schedule alerts, send emails | **NOT on Vercel cron** for scraping. GitHub Actions (cron) for v1, Railway worker for v2 |
| **Staging tables** | Hold raw + parsed ETL output before review | Separate `staging.*` schema in same Supabase project |
| **Email service** | Transactional alerts, weekly digests | Resend or Plunk (transactional only, no marketing) |

### Why ETL is NOT on Vercel Cron

- Vercel cron triggers serverless functions; max execution per invocation is bounded (60s on Hobby, 300s on Pro for serverless functions; up to 800s for fluid). Long DART backfills, full TheVC scrapes, or screenshot-heavy enrichment **do not fit**.
- Scrapers benefit from persistent IP / sticky session; Vercel functions are stateless and ephemeral.
- Scraping headless browsers (Playwright) require >250MB lambda size, often impractical.
- Recommended: GitHub Actions (free 2000 min/mo, perfect for daily ETL), or Railway worker if execution becomes longer than ~30 min.

Source: [Vercel Cron Limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Northflank: Vercel backend limits](https://northflank.com/blog/vercel-backend-limitations).

---

## Recommended Project Structure

```
vc-co-finder/
├── app/                                # Next.js App Router
│   ├── (public)/                       # Public route group
│   │   ├── page.tsx                    # Landing
│   │   ├── search/page.tsx             # Faceted search UI
│   │   └── companies/
│   │       └── [slug]/
│   │           ├── page.tsx            # Company profile (ISR)
│   │           ├── financials/page.tsx
│   │           ├── funding/page.tsx
│   │           └── traffic/page.tsx
│   ├── (authed)/                       # Requires auth
│   │   └── me/
│   │       ├── watchlists/page.tsx
│   │       ├── searches/page.tsx
│   │       └── alerts/page.tsx
│   ├── (admin)/                        # Requires admin role
│   │   └── admin/
│   │       ├── curation/page.tsx       # Submission review queue
│   │       ├── ingestion/page.tsx      # ETL run status
│   │       └── companies/[id]/edit/page.tsx
│   ├── api/                            # Route handlers (read API, webhooks)
│   │   ├── v1/
│   │   │   ├── companies/route.ts      # Public read API (rate-limited)
│   │   │   └── search/route.ts
│   │   └── revalidate/route.ts         # ETL → revalidateTag webhook
│   ├── auth/                           # Supabase auth callbacks
│   │   └── callback/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                             # shadcn primitives
│   ├── search/                         # FacetPanel, ResultsList, SortMenu
│   ├── company/                        # ProfileHeader, FundingTable, FinancialsChart
│   └── admin/                          # CurationCard, DiffViewer
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser client (Client Components)
│   │   ├── server.ts                   # Server client (RSC + Server Actions)
│   │   └── admin.ts                    # Service-role client (admin only, server-only)
│   ├── search/
│   │   ├── adapter.ts                  # SearchAdapter interface
│   │   ├── postgres.ts                 # Postgres FTS implementation (v1)
│   │   └── meilisearch.ts              # Meilisearch implementation (v2)
│   ├── auth/
│   │   ├── session.ts                  # getUser(), requireUser(), requireAdmin()
│   │   └── middleware.ts               # cookie refresh
│   ├── data/
│   │   ├── companies.ts                # getCompany(), listCompanies()
│   │   ├── funding.ts                  # getFundingHistory()
│   │   ├── financials.ts               # getFinancials()
│   │   └── provenance.ts               # attachSources()
│   ├── i18n/
│   │   ├── config.ts                   # next-intl config
│   │   └── messages/
│   │       ├── ko.json
│   │       └── en.json                 # Stub (v1: empty allowed, structure exists)
│   └── utils/
├── etl/                                # Separate deployable (NOT bundled with Next.js)
│   ├── dart/
│   │   ├── client.ts                   # OPENDART API client w/ rate limiting
│   │   ├── transformers/               # Raw XBRL → canonical financial schema
│   │   └── jobs/                       # daily-financials.ts, weekly-disclosures.ts
│   ├── thevc/
│   │   ├── scraper.ts                  # Playwright-based, robots.txt aware
│   │   └── parsers/
│   ├── shared/
│   │   ├── staging.ts                  # Insert into staging.* tables
│   │   ├── publish.ts                  # Promote staging → public, trigger revalidate
│   │   └── provenance.ts               # Record source + fetched_at
│   └── workflows/
│       └── github-actions/             # .github/workflows/etl-*.yml lives here
├── supabase/
│   ├── migrations/                     # SQL migrations (versioned)
│   ├── seed.sql                        # Seed data for local dev
│   └── functions/                      # Edge functions (only if needed; e.g., alert dispatcher)
└── tests/
```

### Structure Rationale

- **`app/(public|authed|admin)/` route groups:** Clean separation of access surfaces without affecting URL paths. Middleware can enforce auth per group.
- **`lib/search/adapter.ts`:** Abstracts Postgres-FTS vs Meilisearch. v1 uses Postgres; v2 swaps implementation without touching call sites. **Critical decoupling for the Postgres → Meili migration decision point.**
- **`lib/data/provenance.ts`:** Provenance is a first-class concern, not bolted on. Every read attaches `{source, fetched_at, url}` to returned facts.
- **`etl/` outside `app/`:** Forces architectural separation. ETL never imports from `app/`. Deployed differently (GitHub Actions or Railway).
- **`supabase/migrations/`:** Schema is source of truth. Every change is a migration; staging vs public schemas are explicit.
- **`(admin)` is an in-app route group, NOT a separate app:** Pragmatic for v1. Same auth, same RLS. Splitting later is cheap if needed.

---

## Data Model (Schema Sketch)

### Core Entities and Relationships

```
                ┌───────────────┐
                │   companies   │
                │ id, slug, name│
                │ name_en, name_ko
                │ region (KR/JP/SG/...)
                │ status (alive/dead/acquired)
                │ founded_at
                │ sector, sub_sector
                │ hq_address
                │ description_ko
                │ source_id (FK)  ← provenance
                └───────┬───────┘
                        │ 1
                        │
        ┌───────────────┼───────────────┬──────────────┬──────────────┐
        │ N             │ N             │ N            │ N            │ N
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
│ funding_round │ │ financial_  │ │  traffic_   │ │ employee_ │ │ company_    │
│ id, company_id│ │ report      │ │  metric     │ │ snapshot  │ │ person      │
│ stage         │ │ id, period  │ │ period      │ │ count, at │ │ role,tenure │
│ amount_krw    │ │ revenue     │ │ source      │ └───────────┘ └──────┬──────┘
│ closed_at     │ │ op_income   │ │ visits      │                       │
│ source_id     │ │ assets      │ │ source_id   │                       │
└──────┬───────┘ │ liabilities │ └─────────────┘                ┌──────▼──────┐
       │ M:N    │ source_id   │                                 │   persons   │
       │        └─────────────┘                                 │ id, name    │
┌──────▼──────────┐                                             └─────────────┘
│ round_investors │                  ┌─────────────────┐
│ round_id        │                  │  data_sources   │ ← every row
│ investor_id     │                  │ id, type (DART, │   above references
│ is_lead         │                  │   TheVC, manual,│   one of these
└──────┬──────────┘                  │   user_submit)  │   via source_id
       │ N:1                         │ url, fetched_at │
┌──────▼──────────┐                  │ confidence      │
│   investors     │                  └─────────────────┘
│ id, name, type  │
└─────────────────┘
```

### Key Tables

```sql
-- Canonical (public schema, served to users)
companies (id, slug, legal_name, display_name_ko, display_name_en, region,
           status, founded_at, sector, sub_sector, hq_address, description_ko,
           dart_corp_code, thevc_id, website_url, created_at, updated_at)

funding_rounds (id, company_id, stage, amount_krw, amount_usd, closed_at,
                announced_at, post_money_valuation_krw, source_id, created_at)

investors (id, name_ko, name_en, type, country, website_url)
round_investors (round_id, investor_id, is_lead, amount_krw)  -- M:N junction

persons (id, name_ko, name_en, linkedin_url)
company_persons (company_id, person_id, role, started_at, ended_at, source_id)

financial_reports (id, company_id, period_start, period_end, period_type,
                   revenue_krw, op_income_krw, net_income_krw, assets_krw,
                   liabilities_krw, employees, source_id, fetched_at)

traffic_metrics (id, company_id, period, source_provider, visits, mau,
                 source_id, fetched_at)

employee_snapshots (id, company_id, captured_at, count, source_id)

news_mentions (id, company_id, title, url, published_at, source_id)

-- Provenance (first-class)
data_sources (id, source_type, source_url, fetched_at, etl_run_id,
              confidence, raw_payload_ref)

-- ETL pipeline (staging schema, not user-facing)
staging.companies_raw (...)        -- exact copy from upstream, untouched
staging.companies_parsed (...)     -- normalized but unpublished
staging.review_queue (id, entity_type, entity_id, diff_jsonb, status,
                       submitted_by, reviewed_by, decision, reviewed_at)

-- User-scoped (RLS gated)
user_watchlists (id, user_id, name, created_at)
user_watchlist_companies (watchlist_id, company_id, added_at, notes)
user_saved_searches (id, user_id, name, query_jsonb, created_at)
user_alerts (id, user_id, saved_search_id, last_triggered_at, frequency)

-- Submissions (pre-moderation)
user_submissions (id, user_id, entity_type, entity_id, payload_jsonb,
                  status, created_at, reviewed_at)
```

### Provenance Pattern (First-Class)

**Every fact-bearing row has a `source_id` foreign key.** No nullable; provenance is required.

When the read layer fetches a company, it joins `data_sources` and attaches a `_meta.source` field to each fact:

```typescript
// lib/data/companies.ts
return {
  id, name, sector,
  funding_rounds: rounds.map(r => ({
    ...r,
    _meta: { source: r.source.type, fetched_at: r.source.fetched_at, url: r.source.source_url }
  }))
}
```

UI displays "Source: DART · Updated 2026-04-15" beside each fact, satisfying the trust requirement.

---

## Architectural Patterns

### Pattern 1: Staging → Review → Publish (ETL)

**What:** Never write external data directly to canonical tables. Always land in `staging.*` first, surface diffs to admin, publish on approval.

**When to use:** Always for external data sources (DART, TheVC, scraping). User submissions also flow through this.

**Trade-offs:**
- (+) Trust: nothing user-facing was unreviewed
- (+) Rollback: published rows have known-good prior state
- (−) Slower data freshness (review latency)
- Mitigation: auto-approve high-confidence DART pulls (whitelisted fields), require review for scraping/submissions.

**Example:**
```typescript
// etl/shared/publish.ts
async function publish(entity: 'funding_round', stagedId: string) {
  const staged = await db.from('staging.funding_rounds').select('*').eq('id', stagedId).single()
  await db.transaction(async (tx) => {
    await tx.from('funding_rounds').upsert(staged.parsed, { onConflict: 'id' })
    await tx.from('staging.review_queue').update({ status: 'published' }).eq('id', stagedId)
  })
  await fetch(`${APP_URL}/api/revalidate?tag=company:${staged.company_id}`)
}
```

### Pattern 2: RSC-first Reads, Server Actions for Mutations

**What:** Public pages render via Server Components reading directly from Supabase. Mutations (save watchlist, submit correction) use Server Actions. Only adopt API routes for: (a) public read API for third parties, (b) ETL → Next.js webhooks, (c) auth callbacks.

**When to use:** Default. Drop down to API route only when justified.

**Trade-offs:**
- (+) No client-side data-fetching boilerplate
- (+) Smaller JS bundle
- (−) Tight coupling between UI and DB shape — mitigate via `lib/data/*` layer
- (−) No automatic typed client like tRPC — use Zod schemas in `lib/data/*` for validation

**When tRPC would make sense (and why we skip it for v1):**
- Mobile client (none planned)
- Many heterogeneous client-side mutations w/ optimistic UI (only watchlists qualify; Server Actions handle this fine)
- Multi-team API contract (single team)

Source: [Server Actions vs tRPC 2026 guide](https://medium.com/@factman60/next-js-server-actions-vs-trpc-a-2026-architects-guide-85cc4953bae4)

### Pattern 3: Search Adapter (Pluggable Backend)

**What:** Define `SearchAdapter` interface; v1 implements with Postgres FTS + GIN indexes; v2 swaps in Meilisearch without touching call sites.

**When to use:** Any time you anticipate scaling search beyond what Postgres can handle, but want to ship fast.

**Trade-offs:**
- (+) Defers Meilisearch decision until proven necessary
- (+) Postgres FTS is "free" (already paying for the DB)
- (−) Faceted search counts in Postgres get slow as facets multiply (each facet is a separate aggregation query)
- Threshold to flip: see Decision Points

**Example:**
```typescript
// lib/search/adapter.ts
export interface SearchAdapter {
  search(query: SearchQuery): Promise<SearchResult>
  index(company: Company): Promise<void>
  reindex(): Promise<void>
}

// app/search/page.tsx
import { search } from '@/lib/search'
const results = await search.search({ q, facets: { sector, stage, region }, page })
```

### Pattern 4: ISR for Company Pages with On-Demand Revalidation

**What:** Company profile pages are statically rendered (cached by Vercel CDN). When ETL publishes new data for a company, it calls `/api/revalidate?tag=company:{id}` which invalidates only that page.

**When to use:** Read-heavy, write-rare entities. 5–10k companies, updated daily/weekly = perfect fit.

**Trade-offs:**
- (+) Sub-100ms TTFB for 99% of requests
- (+) Vercel automatically collapses identical concurrent requests
- (+) On-demand revalidation propagates within ~300ms across all regions
- (−) Stale window between data update and revalidation call (mitigated by webhook)

Source: [Next.js ISR docs](https://nextjs.org/docs/app/guides/incremental-static-regeneration)

### Pattern 5: RLS as the Security Boundary (Not Application Code)

**What:** Postgres RLS enforces "users can only read/write their own watchlists, alerts, submissions." Application code has zero ACL logic for user-scoped data.

**When to use:** Any user-scoped table.

**Trade-offs:**
- (+) Security defense-in-depth: even a buggy server action can't leak data
- (+) Service-role client (for ETL/admin) explicitly opts out via separate Supabase client
- (−) Performance: RLS adds per-row policy evaluation; mitigate with indexes on `user_id`

**Example:**
```sql
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read own watchlists"
  ON user_watchlists FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "owners write own watchlists"
  ON user_watchlists FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

For canonical (public-readable) tables: RLS enabled but with permissive `USING (true)` for SELECT, restrictive for INSERT/UPDATE (admin only via service role).

---

## Data Flow

### Read Path (Public User)

```
User → Vercel CDN (cached HTML)  ── HIT  ─→ instant response
                              ├── MISS ─→ Next.js RSC
                                          ├→ lib/data/companies.ts
                                          │  └→ Supabase Postgres (RLS: public-read)
                                          ├→ lib/search/* (if /search)
                                          │  └→ Postgres FTS or Meilisearch
                                          └→ render → cache → return
```

### Write Path (ETL Pipeline)

```
GitHub Actions cron (daily 02:00 KST)
    │
    ├→ etl/dart/jobs/daily-financials.ts
    │    ├→ DART API (rate-limited: 10k/day personal, no limit institutional)
    │    ├→ parse XBRL → normalize
    │    └→ INSERT INTO staging.financial_reports_parsed (with source_id)
    │
    ├→ etl/thevc/scraper.ts (Playwright)
    │    ├→ scrape rounds (respect robots.txt, sleep, UA rotation)
    │    └→ INSERT INTO staging.funding_rounds_parsed
    │
    ├→ Auto-publish: high-confidence DART rows w/ no diff to canonical
    │    └→ INSERT INTO funding_rounds + revalidate(company:id)
    │
    ├→ Queue for review: anything with diff or low confidence
    │    └→ INSERT INTO staging.review_queue
    │
    └→ Notify admin (email digest)

Admin reviews → /admin/curation → approve → publish() → revalidate()
```

### Write Path (User Submission)

```
User → /companies/[id]/submit-correction (Server Action)
    └→ INSERT INTO user_submissions (status='pending')
       └→ Notify admin

Admin → /admin/curation → review diff → approve
    └→ Apply to canonical + revalidate
```

### Alert Worker Flow

```
GitHub Actions cron (hourly)
    │
    ├→ Query: NEW funding_rounds since last run
    ├→ For each user_alert WHERE saved_search matches new round:
    │    └→ Send email via Resend, update last_triggered_at
    └→ Done
```

### State Management (Client)

Minimal client state. Almost everything is server-rendered.
- Search filters: stored in URL query params (shareable, bookmarkable, no client store)
- Watchlist mutations: `useOptimistic` for instant UI feedback, Server Action for persistence
- Auth state: cookie + middleware refresh, no client store

---

## Build Order (Dependency Graph)

```
                ┌──────────────────────────────────┐
                │ Phase 0: Foundation              │
                │ - Supabase project + migrations  │
                │ - Next.js skeleton + auth (Google│
                │   + Kakao OAuth)                 │
                │ - i18n scaffolding (ko + en stub)│
                │ - Sentry + Vercel Analytics      │
                └────────────────┬─────────────────┘
                                 │
                ┌────────────────▼─────────────────┐
                │ Phase 1: Read-only Profiles      │
                │ - Schema: companies, funding_    │
                │   rounds, investors, persons,    │
                │   data_sources                   │
                │ - Seed 50–200 companies (manual) │
                │ - Company profile page (ISR)     │
                │ - Provenance display ("Source:") │
                └────────────────┬─────────────────┘
                                 │
                ┌────────────────▼─────────────────┐
                │ Phase 2: Faceted Search          │
                │ - Postgres FTS + GIN indexes     │
                │ - SearchAdapter interface        │
                │ - /search page w/ facet panel    │
                │ - URL-driven filter state        │
                └────────────────┬─────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼──────────┐  ┌──────────▼─────────┐  ┌──────────▼─────────┐
│ Phase 3a:        │  │ Phase 3b:          │  │ Phase 3c:          │
│ DART ETL         │  │ Admin Curation UI  │  │ User Watchlists +  │
│ - staging schema │  │ - /admin/curation  │  │ Saved Searches     │
│ - DART connector │  │ - review queue UI  │  │ - RLS-gated tables │
│ - financial_     │  │ - approve/reject   │  │ - useOptimistic UI │
│   reports table  │  │   workflow         │  │                    │
│ - GitHub Actions │  │ - admin role gate  │  │ Can build in       │
│ - revalidate     │  │                    │  │ parallel with 3a/3b│
│   webhook        │  │ Depends on 3a      │  │                    │
└──────────────────┘  └────────────────────┘  └────────────────────┘
                                 │
                ┌────────────────▼─────────────────┐
                │ Phase 4: TheVC ETL +             │
                │ User Submissions                 │
                │ - Playwright scraper (rate-      │
                │   limited, respectful)           │
                │ - Submission form +              │
                │   moderation queue               │
                └────────────────┬─────────────────┘
                                 │
                ┌────────────────▼─────────────────┐
                │ Phase 5: Alerts                  │
                │ - Alert worker (hourly cron)     │
                │ - Resend integration             │
                │ - Email digest templates         │
                └────────────────┬─────────────────┘
                                 │
                ┌────────────────▼─────────────────┐
                │ Phase 6: Time-series             │
                │ Visualization                    │
                │ - Charts (Recharts/Tremor)       │
                │ - traffic_metrics, employee_     │
                │   snapshots tables               │
                │ - SimilarWeb integration (paid)  │
                └────────────────┬─────────────────┘
                                 │
                ┌────────────────▼─────────────────┐
                │ Phase 7: Asia Expansion          │
                │ - region-aware search            │
                │ - JP/SG data sources             │
                │ - en locale population           │
                └──────────────────────────────────┘
```

### Build Order Dependencies

| Phase | Depends On | Can Parallel With |
|-------|-----------|-------------------|
| 0 Foundation | — | — |
| 1 Read-only profiles | 0 | — |
| 2 Faceted search | 1 (data exists) | — |
| 3a DART ETL | 1 (schema), 2 (search index) | 3b, 3c |
| 3b Admin curation UI | 3a (review queue exists) | 3c |
| 3c Watchlists/saves | 1, 2 | 3a, 3b |
| 4 TheVC + submissions | 3a (staging pattern proven), 3b (review UI exists) | — |
| 5 Alerts | 3a (round data flows), 3c (saved searches) | — |
| 6 Time-series viz | 1 (basic charts ok earlier), 3a (financial data) | — |
| 7 Asia expansion | All above | — |

**Critical path:** 0 → 1 → 2 → 3a → 4 (data quality compounds).
**Watchlists (3c) can go in parallel** with the ETL track — different developers, no shared code.

---

## Decision Points (When to Re-Evaluate)

These are explicit triggers the team will hit. Decide *deliberately*, not by drift.

### D1: Postgres FTS → Meilisearch

**Trigger any of:**
- p95 search query > 1000ms with realistic facet combinations
- More than ~6 active facets (sector × stage × region × employee_count × cumulative_funding × founded_year × …)
- Need typo tolerance / Korean morphological search beyond what `pg_trgm` handles
- Need real-time search-as-you-type with sub-100ms response

**Until then:** Postgres FTS + GIN + a materialized view for facet counts is sufficient for 5–10k records.

**Migration cost:** ~3–5 days if `SearchAdapter` was built upfront. Sync via row triggers or ETL publish hook.

Source: [Meilisearch on PG FTS limits](https://www.meilisearch.com/blog/postgres-full-text-search-limitations), [Supabase FTS guide](https://supabase.com/blog/postgres-full-text-search-vs-the-rest)

### D2: GitHub Actions → Railway/Fly Worker

**Trigger any of:**
- Any single ETL job exceeds 6 hours (GH Actions hard limit)
- Need to maintain a long-lived browser session for scraping
- ETL run frequency exceeds free tier (2000 min/mo for private, unlimited for public)
- Need a queue/worker model (BullMQ-style) for retry, parallelization

**Until then:** GitHub Actions is free, version-controlled, has good observability via Actions UI.

**Migration cost:** ~2–3 days. Most logic is portable Node/TS scripts.

Source: [Railway pricing](https://docs.railway.com/), [GitHub Actions pricing](https://docs.github.com/en/billing)

### D3: Single Supabase Project → Split (Public + Internal)

**Trigger any of:**
- Service role key leak risk concerns from many people having admin access
- Query load from ETL noticeably impacts user-facing read latency
- Compliance requirement to physically isolate PII

**Until then:** Single project with strict RLS + separate Supabase clients (`server.ts` for users, `admin.ts` for service role) is sufficient and operationally simpler.

**Cost of splitting:** Significant — cross-project sync needed, doubles infrastructure. Avoid until forced.

### D4: Server Actions → tRPC

**Trigger any of:**
- Add a mobile client
- Build heavy interactive dashboards with many client-side filters/refetches that benefit from React Query semantics
- Public read API users want a typed SDK

**Until then:** Server Actions + RSC handle the read-heavy, mutation-light workload of v1 cleanly.

### D5: ISR → Edge Runtime / CDN-Specific Cache

**Trigger:** Sustained traffic where ISR regeneration becomes the bottleneck (unlikely <100k MAU with this content shape).

**Until then:** Default ISR with on-demand revalidate is plenty.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0–1k MAU** | Single Supabase project (free tier), Vercel free tier, GitHub Actions ETL, Postgres FTS. Total cost: $0–25/mo. |
| **1k–50k MAU** | Supabase Pro ($25/mo for connection pooler, 8GB DB, point-in-time backups), Vercel Pro ($20/mo for analytics + better limits). Add Sentry ($26/mo). Maybe Railway worker ($5–20/mo) if ETL outgrows GH Actions. **Total: $75–150/mo.** |
| **50k–500k MAU** | Decision Point D1 likely fires (Meilisearch). Supabase compute upgrade. Consider read replicas. Add caching layer (Upstash Redis) for hot company pages beyond ISR. **Total: $300–800/mo.** |
| **500k+ MAU** | Decision Point D3 (split projects), CDN-pushed full search index (Meilisearch Cloud or self-hosted), dedicated ETL platform. Multi-region Supabase if Asia traffic dominates. |

### Scaling Priorities (What Breaks First)

1. **Search faceting performance** — Postgres FTS aggregates per-facet counts on every query. With 10k records and 8 facets it works; with 50k+ it slows. **Fix: D1 (Meilisearch).**
2. **Supabase connection pool exhaustion** — Vercel serverless functions can each open a connection. **Fix: Use Supabase pooler endpoint (transaction mode) for serverless.**
3. **ETL queue latency** — As more sources added, daily window tightens. **Fix: Parallelize jobs in GH Actions matrix or move to Railway with proper queue (D2).**
4. **Email volume for alerts** — Free tier limits (Resend: 100/day free, 3k/mo on $20 tier). Easy to upgrade.
5. **Build times** — Static pre-rendering of 10k company pages slows builds. **Fix: Switch from build-time SSG to on-demand ISR (default in App Router).**

---

## Anti-Patterns

### Anti-Pattern 1: Direct Writes from ETL to Canonical Tables

**What people do:** ETL script INSERTs straight into `companies` / `funding_rounds` from raw scraped data.
**Why it's wrong:** No review, no diff visibility, no rollback, garbage data goes live, trust collapses on first incident. Worse: hard to know which fact came from where (provenance lost).
**Do this instead:** ETL writes to `staging.*`, admin review (or auto-approve rules for high-confidence DART), explicit `publish()` step writes canonical + records `data_sources` row + revalidates page.

### Anti-Pattern 2: Provenance as an Afterthought

**What people do:** Add a `source` text column late, populate it inconsistently, never expose in UI.
**Why it's wrong:** Researchers (the primary user!) need to verify facts. Without per-fact provenance, the platform's core value (trustworthy research) is hollow.
**Do this instead:** `data_sources` is a foundational table from day one. Every fact-bearing row has a NOT NULL `source_id`. Reads attach `_meta.source` to every fact. UI displays "Source: X · Updated Y" beside numbers.

### Anti-Pattern 3: Running Scrapers on Vercel Cron Functions

**What people do:** Squeeze a Playwright scraper into a Vercel cron-triggered serverless function.
**Why it's wrong:** Function size limits, cold starts, 60–800s execution caps, no persistent IP, headless browser overhead. Will silently truncate results or fail.
**Do this instead:** GitHub Actions for scheduled jobs (free, generous time limits) or Railway worker for true long-running. Vercel functions only for the lightweight `/api/revalidate` webhook receiver.

### Anti-Pattern 4: Application-Level ACL for User-Scoped Data

**What people do:** `if (watchlist.userId === currentUser.id) { ... }` in Server Actions, no RLS.
**Why it's wrong:** One missing check = data leak. Code reviews can't catch every path. RLS is defense-in-depth at the database level.
**Do this instead:** Enable RLS on every user-scoped table. Policies use `auth.uid()`. Application code becomes auth-blind for user data. Service role client (used only in ETL/admin) explicitly bypasses RLS — keep it server-only and out of any user-request code path.

### Anti-Pattern 5: Tight Coupling to Postgres Search

**What people do:** Sprinkle `.textSearch('search_vector', ...)` Supabase calls throughout components.
**Why it's wrong:** When Decision Point D1 fires, every call site needs migration. The team postpones the migration, search degrades, users churn.
**Do this instead:** `lib/search/adapter.ts` interface from day one, even if v1 implementation is a 50-line Postgres wrapper. Future Meili swap is hours, not weeks.

### Anti-Pattern 6: Building i18n After Launch

**What people do:** "We'll add i18n in v2." Hardcode Korean strings inline. Date/number formats baked into JSX.
**Why it's wrong:** Retrofitting i18n is enormously expensive. Korean ambition is Asia, not just Korea.
**Do this instead:** `next-intl` from Phase 0. All UI strings via `t()`. Only `ko.json` populated for v1; `en.json` is empty stubs. Adding English later is hours.

### Anti-Pattern 7: Ignoring `robots.txt` / Terms of Service for TheVC

**What people do:** Aggressive scraping, no UA, no rate limit, ignore robots.txt.
**Why it's wrong:** Legal risk (Korean Personal Information Protection Act, contractual ToS), IP ban, reputational damage in a small ecosystem.
**Do this instead:** Read TheVC's robots.txt + ToS first. Identify as research bot in UA. Rate-limit to 1 req/2s minimum. Cache aggressively. Prefer their RSS/sitemap if available. Document compliance in `etl/thevc/COMPLIANCE.md`.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **OPENDART (DART API)** | REST polling, daily cron from GH Actions | Personal: 10k req/day; institutional: unlimited. Apply for institutional key for v1+. JSON/XML payloads, normalize to canonical schema. |
| **TheVC.kr** | Headless browser scraping (Playwright) | **Verify ToS before launch.** Rate-limit aggressively. Consider reaching out to TheVC for partnership / data feed. |
| **SimilarWeb** | API (paid tier) or manual entry initially | Free tier extremely limited. Defer to Phase 6 unless budget allocated. |
| **Google OAuth** | Supabase Auth provider | One-click in Supabase dashboard. |
| **Kakao OAuth** | Supabase Auth provider | Requires Kakao Developers app registration; Korean users expect this. |
| **Resend (email)** | REST from alert worker | 100/day free, $20 for 3k/mo. Templates in code (React Email). |
| **Sentry** | SDK in Next.js + ETL workers | $0 dev tier, $26/mo team tier. Worth it from day 1 for error visibility. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| ETL ↔ Supabase | Direct Postgres connection (service role) | Use connection pooler. Separate `service_role` key, never exposed to client. |
| ETL → Next.js | Webhook: POST `/api/revalidate?tag=X` | Authenticated with shared secret in env var. |
| Public app ↔ Supabase | Anon key + RLS for users; server client w/ user JWT for authed | Never use service role from app code. |
| Admin app ↔ Supabase | Same Supabase project, admin claim in JWT, RLS policy checks `(auth.jwt() ->> 'role') = 'admin'` | Don't make admin a separate Supabase project until D3. |
| Email worker ↔ Supabase | Read saved searches + funding rounds (service role) | Runs in same ETL infrastructure. |
| Public read API (`/api/v1/*`) | Rate-limited via Vercel KV (Upstash) | Phase 5+ feature. Out of v1 scope but route group exists. |

---

## Multi-Region / Asia Expansion Readiness

These design choices enable Asia expansion **without** premature complexity:

1. **`region` column on `companies`** (ISO country code: KR, JP, SG, ID, VN, ...). Filter in queries, even if v1 only ships KR.
2. **`name_ko` + `name_en` columns** (rather than a single `name`). Add `name_jp`, `name_zh` later as columns or move to a `company_translations` table when 3+ locales.
3. **Source-aware ETL** (`etl/dart/`, `etl/thevc/`). New region = new connector folder. No core schema changes.
4. **i18n keys exist from Phase 0** — `en.json` empty in v1, populated later. No retrofit.
5. **Currency abstraction** — `amount_krw` + `amount_usd` columns. Add `amount_jpy`, etc. later. Always normalize to USD at ETL time for cross-region search.
6. **Locale-aware Postgres FTS** uses Korean dictionary (`korean` config); per-region tables can use different dictionaries when expanding.

**What we deliberately defer:**
- Multi-region Supabase deployment (single Seoul region serves all of Asia with <200ms latency)
- Region-specific URL structure (`/kr/`, `/jp/`) — add when traffic justifies (single-region URL for v1 is fine)
- Per-region currency formatting in UI — add with i18n message bundles

---

## Observability (Minimum Viable)

| Layer | Tool | What it Catches |
|-------|------|----------------|
| **App errors** | Sentry | Server Action errors, unhandled exceptions in RSC, client errors |
| **Performance** | Vercel Analytics + Speed Insights (free) | TTFB, CLS, LCP per page; can identify slow company pages |
| **Database** | Supabase Logs + Reports dashboard | Slow queries, RLS denials, connection pool stats |
| **ETL runs** | GitHub Actions UI + Sentry for unhandled errors | Job duration, failures, last-run timestamps |
| **Search latency** | Custom: `console.time` in `SearchAdapter`, log to Sentry breadcrumb | Triggers Decision Point D1 |
| **Business** | Simple `/admin/dashboard` page reading from Supabase | Total companies, ETL freshness, submission queue depth, daily active users |

**Skip for v1:** Datadog, New Relic, full APM. Overkill for 0-tier launch.
**Add when:** ETL becomes critical (real users depend on freshness) → consider PagerDuty integration with Sentry alerts.

---

## Sources

- [Use Supabase with Next.js (Supabase Docs)](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) — HIGH
- [Setting up Server-Side Auth for Next.js (Supabase Docs)](https://supabase.com/docs/guides/auth/server-side/nextjs) — HIGH
- [Supabase RLS Best Practices (Makerkit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — MEDIUM
- [Vercel Cron Jobs Limits](https://vercel.com/docs/limits) — HIGH
- [Vercel backend limitations (Northflank)](https://northflank.com/blog/vercel-backend-limitations) — MEDIUM
- [Postgres FTS limits (Meilisearch blog)](https://www.meilisearch.com/blog/postgres-full-text-search-limitations) — MEDIUM (vendor-published; cross-checked)
- [Postgres FTS vs the Rest (Supabase blog)](https://supabase.com/blog/postgres-full-text-search-vs-the-rest) — HIGH
- [Next.js ISR Guide](https://nextjs.org/docs/app/guides/incremental-static-regeneration) — HIGH
- [Next.js Revalidation Docs](https://nextjs.org/docs/app/guides/how-revalidation-works) — HIGH
- [Server Actions vs tRPC 2026 Architect's Guide](https://medium.com/@factman60/next-js-server-actions-vs-trpc-a-2026-architects-guide-85cc4953bae4) — MEDIUM
- [OPENDART API (금융감독원)](https://opendart.fss.or.kr/intro/main.do) — HIGH (official source)
- [OpenDartReader (FinanceData)](https://github.com/FinanceData/OpenDartReader) — MEDIUM (community library reference)
- [Railway Pricing & Cron](https://docs.railway.com/) — HIGH
- [Supabase Postgres Extensions (pg_trgm)](https://supabase.com/docs/guides/database/extensions) — HIGH
- [Supabase Full Text Search Guide](https://supabase.com/docs/guides/database/full-text-search) — HIGH

---

*Architecture research for: Korean/Asian startup intelligence platform (faceted search + curated multi-source ETL)*
*Researched: 2026-04-20*
