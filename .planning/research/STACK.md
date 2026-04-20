# Stack Research — VC Co-Finder

**Domain:** Korean/Asian startup intelligence platform (faceted-search, Korean-first)
**Researched:** 2026-04-20
**Overall confidence:** HIGH for core stack; MEDIUM for Korean tokenization specifics

---

## Executive Recommendation

Build on **Next.js 15.5 + Supabase Postgres + shadcn/ui (Radix variant) + Recharts + next-intl**. Defer the dedicated search engine — start with **Postgres + GIN + pg_trgm + a custom tokenizer** for the 5–10k record phase; only migrate to **Meilisearch self-hosted on Fly.io** when (a) record count crosses ~50k, or (b) facet response p95 exceeds 800ms despite indexing. ETL runs as a **separate Python service on Fly.io** (DART = Python ecosystem reality), scheduled via **GitHub Actions** for free batch jobs. Logos go to **Cloudflare R2** (zero egress is decisive for image-heavy listing pages). Auth = **Supabase Auth** with Kakao native + Google native; defer Naver to v2 (custom OIDC).

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why |
|---|---|---|---|
| **Next.js** | 15.5.x | App framework | App Router + RSC + Server Actions are the standard 2026 pattern; stable Node middleware in 15.5 enables proper Supabase auth refresh. (Confidence: HIGH) |
| **TypeScript** | 5.6+ | Type safety | Mandatory for Supabase generated types + i18n key safety |
| **React** | 19.x | UI runtime | Bundled with Next 15.5 |
| **Supabase Postgres** | Postgres 15 (Supabase managed) | Database + Auth + Storage | Stated constraint. RLS gives the premium-gating pattern naturally; pgvector available for v2 semantic search |
| **@supabase/ssr** | 0.10.x | SSR auth client | Current standard (auth-helpers deprecated). Cookie-based session refresh in middleware. (HIGH) |
| **Tailwind CSS** | v4.x | Styling | Required by shadcn charts; v4's CSS-first config matches App Router conventions |
| **shadcn/ui** | Latest CLI — **Radix variant** | Component primitives | Radix variant remains safe default in 2026 (WorkOS now funds Radix). Base UI is the future but greenfield doesn't need to commit yet. (HIGH) |
| **Recharts** | 2.13+ | Charts | Powers official shadcn/ui chart components — zero-friction integration. Sufficient for 5y-month time-series of funding/revenue/employees |
| **next-intl** | 3.x | i18n | De-facto App Router choice in 2026; 457-byte runtime, RSC-native, file-based routing for `/ko/...` and `/en/...`. (HIGH) |

### Faceted Search — Phased Strategy

| Phase | Tech | Why |
|---|---|---|
| **v1 (≤10k records)** | **Postgres + GIN indexes + pg_trgm + materialized tsvector columns** | At 10k rows with persistent tsvector columns and proper GIN indexes, sub-1s facet queries are achievable. Avoids second infrastructure to operate. Use partial indexes per facet (sector, round, region) and a covering index for the most-common filter combinations. (HIGH) |
| **Korean tokenization layer** | **App-side morpheme tokenization → store `search_tokens` column** (Recommended) | Use `KoNLPy + mecab-ko` in Python ETL to pre-compute morpheme + n-gram tokens; store as text column with GIN trigram index. Works on Supabase managed Postgres without extension permissions. **Alternative:** `pg_cjk_parser` 2-gram parser if Supabase allows the extension. (MEDIUM — verify extension support) |
| **v2 (≥50k records OR p95 > 800ms)** | **Meilisearch self-hosted on Fly.io** | MIT-licensed, no cloud bill. Community Korean tokenizer pipeline (mecab-ko based). Sub-millisecond facet queries. Cloud Meilisearch starts at $30/mo — self-host is free until you outgrow a single 256MB VM. (HIGH) |

**Why NOT:** Algolia (search-based pricing punishes facet patterns), Typesense (Korean support undocumented), Elasticsearch with nori (operational overhead wrong for v1).

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---|---|---|---|
| **Drizzle ORM** | 0.36+ | Typed query builder | Recommended over Prisma for Supabase: tiny bundle, SQL-first matches Supabase philosophy, edge-runtime safe. Set `prepare: false` for Supabase pooler. (HIGH) |
| **React Hook Form + Zod** | 7.x / 3.x | Forms | Pairs cleanly with Server Actions via `useActionState` |
| **TanStack Query** | 5.x | Client cache | For watchlist, search-results-on-filter-change. RSC handles initial fetch; TanStack handles client refetch on filter mutations |
| **nuqs** | 2.x | URL-state for facets | **Critical** — facet filters must be shareable/bookmarkable URLs. App-Router-native query-state library |
| **date-fns** | 4.x | Date formatting | Tree-shakeable, Korean locale built in |
| **Resend + react-email** | latest | Transactional email (alerts) | 3,000 emails/month free, native Next.js DX, JSX templates |
| **Sentry** | latest | Error tracking | Free tier covers solo-project volume |
| **Vercel Analytics + Speed Insights** | included | Telemetry | Free on Hobby plan |

### ETL & Scraping Stack (Separate Service)

| Component | Choice | Why |
|---|---|---|
| **Language** | **Python 3.12** | DART API client (`OpenDartReader`/`dart-fss`) is Python-only. Korean data ecosystem (DART, finance libs, mecab-ko) lives in Python |
| **DART client** | **`OpenDartReader`** | De-facto Korean DART wrapper. Active, covers financial statements, business reports, ownership changes |
| **Scraping framework** | **Playwright (Python)** for dynamic pages; **httpx + selectolax** for static pages | For a small number of well-defined sources, Playwright + httpx is simpler than Scrapy's full framework |
| **Job orchestration** | **Python scripts + APScheduler** in a Fly.io worker container | Don't add Airflow/Prefect for 5–10 sources |
| **Hosting** | **Fly.io** (free tier: 3 shared-cpu-1x VMs / 256MB) | Long-running scrapers don't fit Vercel's serverless model |
| **Trigger pattern** | **GitHub Actions (cron) → calls Fly worker HTTP endpoint** | GitHub Actions cron is free; Fly VM stays warm only when needed. Avoid Vercel Cron — Hobby limits crons to once/day |
| **Data sink** | **Direct Postgres insert (Supabase) via service-role key** with idempotent upserts to staging table | Don't add a queue (Redis/SQS) for v1 |
| **Manual curation UI** | **Supabase Studio + thin internal admin page** | Studio handles most one-off corrections; user-submission form writes to a `submissions` review queue |

### Image/Asset Handling

| Choice | Use For | Why |
|---|---|---|
| **Cloudflare R2** | Company logos (primary) | **Zero egress fees** is decisive — listing pages with hundreds of logos repeated would burn Supabase Storage's 5GB egress fast. R2 free tier: 10GB + 1M Class A + 10M Class B ops/mo. (HIGH) |
| **Supabase Storage** | User-uploaded avatars, evidence attachments on submissions | Tight RLS integration is worth egress cost when uploads are user-private. Use 1GB free tier here |
| **Vercel Image Optimization** | Wrap R2 URLs with `next/image` | Free tier covers 5,000 source images / 1,000 fast-data — fine until ~1k logos with active traffic |

### Auth Strategy

| Provider | Approach | Status |
|---|---|---|
| **Google** | Supabase native | Plug-and-play |
| **Kakao** | Supabase native | Officially supported. **WARNING:** `account_email` scope only granted to "business" Kakao apps — register as business early. (HIGH on capability, MEDIUM on smooth setup) |
| **Naver** | Defer to v2 (Supabase Custom OIDC) | Not natively supported in 2026 |
| **Email/password** | Supabase Auth | Fallback |

**Premium gating:** RLS policy on `watchlists`, `saved_searches`, `alerts` tables with `auth.uid() = user_id`. Public data tables (`companies`, `funding_rounds`, `financials`) have policies allowing anonymous SELECT. No tier-based gating in v1; all features free behind login. v2 monetization: add `subscription_tier` to `profiles` and check via RLS.

### Caching Strategy

| Layer | Tool | Pattern |
|---|---|---|
| **Static-ish data (company profile, financials)** | Next.js Data Cache (`unstable_cache`) tagged by `company:${id}` | Revalidate via Supabase webhook → `revalidateTag` route handler when ETL upserts |
| **Faceted search results** | URL-keyed RSC fetch with `revalidate: 3600`; client-side TanStack Query for refilter | Diverse queries → low cache hit rate; hourly revalidation balances freshness vs DB load |
| **Reference lookups (sector taxonomy, region list)** | `unstable_cache` with no revalidate (manually invalidated on admin edit) | Rarely change |
| **Redis** | **NOT needed for v1** | Add Upstash Redis only if rate-limiting becomes critical or read-heavy facet queries outgrow Postgres pool |

### Korean Tokenization — Concrete Plan

The thorniest decision. Three viable paths, ordered by recommendation:

1. **App-side tokenization → store `search_tokens` column** (Recommended for v1)
   - Use `KoNLPy + mecab-ko` (Python) in ETL to compute morpheme + n-gram tokens
   - Store as text column with GIN trigram index
   - Pros: Works on Supabase managed Postgres without extension permissions; same tokens used by ETL and search runtime
   - Confidence: HIGH

2. **`pg_cjk_parser` PostgreSQL extension** (if Supabase allows)
   - 2-gram CJK tokenizer that integrates with `tsvector`
   - Pros: True Postgres FTS with `ts_rank`
   - Cons: Supabase managed plan likely doesn't enable; n-gram less precise than morphology

3. **Defer to Meilisearch when scale demands**
   - Run self-hosted with community Korean tokenizer once Postgres approach hits ceilings
   - Don't do this in v1

**Avoid:** Default `to_tsvector('simple')` for Korean — splits on whitespace and Korean is morpheme-rich; "토스" won't match "토스뱅크" properly.

---

## Installation (v1 baseline)

```bash
# Bootstrap
npx create-next-app@latest vc-co-finder --typescript --tailwind --app --src-dir --import-alias "@/*"

# Supabase + DB
npm install @supabase/ssr @supabase/supabase-js drizzle-orm postgres
npm install -D drizzle-kit

# UI
npx shadcn@latest init   # choose Radix variant
npx shadcn@latest add button card dialog dropdown-menu form input select table tabs chart sheet command popover

# Forms + state
npm install react-hook-form @hookform/resolvers zod
npm install @tanstack/react-query nuqs

# i18n
npm install next-intl

# Email + dates
npm install resend react-email date-fns

# Observability
npm install @sentry/nextjs @vercel/analytics @vercel/speed-insights
```

ETL service (separate `etl/` directory):
```bash
pip install opendartreader playwright httpx selectolax apscheduler psycopg[binary] python-dotenv konlpy
playwright install chromium
```

---

## Alternatives Considered

| Recommended | Alternative | When Alternative is Right |
|---|---|---|
| Postgres+GIN for v1 search | Meilisearch from day 1 | If you already know you'll exceed 50k records in 6 months |
| Cloudflare R2 for logos | Supabase Storage only | Logo count stays under ~200 and one-vendor simplicity is worth egress cost |
| shadcn/ui (Radix variant) | Mantine, Park UI, daisyUI | Mantine for fuller component set; Park UI if committing to Base UI early |
| Drizzle | Prisma | Team unfamiliar with SQL and wants polished migrations + Studio |
| Recharts (via shadcn) | Apache ECharts | Need >100k point series, 3D, geo-heatmaps |
| Python ETL on Fly.io | Node Crawlee + Vercel Functions | Zero Python experience and no DART Node client |
| GitHub Actions cron | Vercel Cron Pro ($20/mo) | Need sub-hour scheduling and don't mind bill |
| next-intl | Paraglide | Want compile-time tree-shakeable, fully type-safe messages and don't need RSC ergonomics |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|---|---|---|
| `@supabase/auth-helpers-nextjs` | Deprecated; bug fixes only | `@supabase/ssr` |
| Algolia | Search-based pricing destroys facet products on free tier | Postgres FTS → Meilisearch |
| Elasticsearch (managed) | Operational complexity wrong for v1; min cluster cost wrong for $0 budget | Postgres → Meilisearch self-host |
| Vercel Cron on Hobby | Once-per-day max; Pro is $20/mo | GitHub Actions |
| Scraping inside Next.js API routes | 10s function timeout (Hobby) kills long-running scrapes; cold starts hurt batches | Separate Fly.io worker |
| Built-in Postgres `simple` config for Korean | Whitespace tokenization fails for agglutinative Korean | App-side morpheme tokenization OR `pg_cjk_parser` |
| Naver login as v1 | Supabase has no native provider; Custom OIDC adds setup without v1 ROI | Defer to v2 |
| Self-host Postgres | Throws away RLS + Auth + Storage integration | Stay on Supabase |
| Prisma Migrate on Supabase schema | Conflicts with Supabase migrations workflow | Drizzle Kit OR Supabase CLI migrations |

---

## Free-Tier Limits (when you'll need to upgrade)

| Component | Free Tier | Forces Paid When |
|---|---|---|
| **Vercel Hobby** | 100GB bandwidth, 6,000 build-min/mo, 1,000 image opt; **commercial use prohibited** | Bandwidth >100GB OR public launch monetized → Pro $20/mo |
| **Supabase Free** | 500MB DB (incl. WAL/indexes), 5GB egress, 50k MAU, 1GB Storage; **paused after 7 days idle** | DB > 500MB (likely at 50k+ companies w/ time-series) OR project pauses → Pro $25/mo |
| **Cloudflare R2** | 10GB + zero egress, 1M/10M ops | >10GB logos (unlikely until 100k+ companies) → $0.015/GB/mo |
| **Resend** | 3,000 emails/mo, 100/day | Search-alert volume > 3k → $20/mo for 50k |
| **Fly.io Free** | 3 shared VMs, 3GB volume, 160GB outbound | When ETL needs >256MB RAM (Playwright + Chromium can spike) → ~$5/mo per VM |
| **GitHub Actions** | 2,000 min/mo private (unlimited public) | Private repo + hourly+ ETL across many jobs |
| **Meilisearch self-hosted on Fly** | Free VM + open-source binary | When index size exceeds VM RAM (v1 won't hit) |

**Total $0/mo runway:** comfortable through ~5,000 MAU and 10k companies. First paid bill: Supabase Pro ~$25/mo when DB outgrows 500MB.

---

## Stack Variant Decisions

- **If Postgres facets exceed 1s p95 even after tuning:** Add Meilisearch self-hosted on Fly.io. Keep Postgres source-of-truth; sync via Supabase trigger → webhook → Meili indexer.
- **If Kakao OAuth setup is too painful initially:** Ship with Google + email/password only; add Kakao in second sprint.
- **If ETL Python operational burden exceeds value:** Drop to scheduled GitHub Actions running Python scripts (no always-on Fly worker). Trade-off: scrape runs limited to GH Actions runtime (6h max per job, 2k min/mo).

---

## Korean-Specific Concerns Summary

1. **DART API:** Free, requires API key registration at opendart.fss.or.kr. Rate limit: 10,000 calls/day/key. `OpenDartReader` is the only mature client and is Python-only.
2. **thevc.kr scraping:** Check robots.txt and ToS — **see PITFALLS.md for legal warning** (ToS prohibits scraping). Consider partnership outreach instead.
3. **Korean tokenization:** App-side morpheme analysis with KoNLPy/mecab-ko in ETL is the most reliable path.
4. **Kakao OAuth:** Register a Business account from day one; the `account_email` scope mandate blocks personal apps from receiving user emails.
5. **Naver:** Skip for v1.
6. **Won-denominated financials:** Use `bigint` (or `numeric`) — Korean rounds commonly tens of billions of KRW exceeds 32-bit int.
7. **한글 sorting:** Postgres ICU collation `ko-x-icu` for proper Korean sort order.

---

## Confidence Assessment

| Area | Confidence | Why |
|---|---|---|
| Next.js + Supabase + shadcn core | HIGH | Verified against official docs |
| Drizzle vs Prisma | HIGH | Both work; Drizzle has clearer Supabase momentum |
| Postgres-first search strategy | HIGH | At 5–10k records, Postgres + GIN handles this easily |
| Korean tokenization specifics | MEDIUM | App-side morpheme path is sound; specific extension availability on Supabase managed needs verification |
| Cloudflare R2 vs Supabase Storage tradeoff | HIGH | Egress math favors R2 |
| ETL on Fly.io + GitHub Actions | HIGH | Standard pattern |
| Kakao OAuth via Supabase | MEDIUM | Works but business account requirement is real gotcha |
| Naver deferred to v2 | HIGH | Confirmed Supabase has no native provider |

---

## Open Questions for Roadmap

1. **Supabase extension availability:** Confirm `pg_cjk_parser` or any custom Korean tokenizer extension can be enabled on managed plan. If not, app-side tokenization is mandatory.
2. **thevc.kr scraping legality:** PITFALLS.md confirms ToS prohibits scraping — pivot to partnership outreach.
3. **DART data normalization:** DART corp_codes don't always map cleanly to startup brand names — needs manual reconciliation table for top ~500 startups.

---

## Sources

- [@supabase/ssr — npm](https://www.npmjs.com/package/@supabase/ssr)
- [Supabase Server-Side Auth Next.js docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Kakao OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js 15.5 release notes](https://nextjs.org/blog/next-15-5)
- [Next.js revalidateTag docs](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [shadcn/ui Feb 2026 — Unified Radix UI Package](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui)
- [shadcn/ui charts](https://ui.shadcn.com/charts/area)
- [next-intl docs](https://next-intl.dev/docs/getting-started/app-router)
- [Drizzle vs Prisma 2026 (Bytebase)](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [Meilisearch Korean tokenization](https://github.com/orgs/meilisearch/discussions/564)
- [Meilisearch Pricing](https://www.meilisearch.com/pricing)
- [Postgres CJK Parser (pg_cjk_parser)](https://github.com/huangjimmy/pg_cjk_parser)
- [textsearch_ko (mecab-ko based)](https://github.com/i0seph/textsearch_ko)
- [Postgres GIN index performance (pganalyze)](https://pganalyze.com/blog/gin-index)
- [OpenDartReader (FinanceData)](https://github.com/FinanceData/OpenDartReader)
- [DART Open API official](https://opendart.fss.or.kr/)
- [Crawlee vs Scrapy vs BeautifulSoup 2026](https://use-apify.com/blog/crawlee-vs-scrapy-vs-beautifulsoup-2026)
- [Vercel Cron pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Cloudflare R2 free tier 2026 (Nubbo)](https://nubbo.app/blog/cloudflare-r2-free-tier/)
- [Supabase vs R2 comparison](https://www.buildmvpfast.com/compare/supabase-vs-r2)
- [TanStack Form vs RHF 2026](https://blog.logrocket.com/tanstack-form-vs-react-hook-form/)
