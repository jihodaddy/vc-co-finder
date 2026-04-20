# Pitfalls Research

**Domain:** Korean/Asian startup intelligence platform (Crunchbase-like, researcher/journalist/job-seeker persona)
**Researched:** 2026-04-20
**Confidence:** HIGH for legal/Supabase/Vercel quotas (verified against official sources and 2022 대법원 판례). MEDIUM for tokenizer/faceting (verified through Postgres docs + ParadeDB benchmarks). MEDIUM for DART internals (verified rate limits, parsing complexity inferred from community libraries).

---

## Critical Pitfalls

### Pitfall 1: Scraping 더브이씨 (THE VC) for redistribution → DB rights violation + ToS breach

**What goes wrong:**
THE VC's 이용약관 explicitly prohibits "스크래핑·크롤링·캐싱 또는 콘텐츠에 대한 접근" except where allowed by separate contract or robots.txt. The prohibited content includes "통계 정보, 회사 정보, 순위, 회원 및 사용자가 작성한 글." Republishing scraped funding rounds → THE VC sends C&D, blocks IP, and (worst case) sues under 저작권법 제93조 (database creator rights) + 부정경쟁방지법. The 잡코리아 vs 사람인 case (Seoul High Court) established that DB-rights violation is real even when individual data points are public — substantial investment in compilation is protected. Even though the 2022 대법원 판결 (2021도1533, 야놀자 vs 여기어때) acquitted the defendant on criminal computer-intrusion charges, it explicitly left civil DB-rights and unfair-competition liability untouched.

**Why it happens:**
"DART는 공식이고 더브이씨는 공개된 정보일 뿐"이라는 잘못된 직관. Public visibility ≠ legally redistributable. Founders assume "we attribute the source, so it's fair use" — there is no fair-use doctrine in Korean copyright law (only 공정이용 § 35-3, which is far narrower than US fair use).

**How to avoid:**
- **Never republish 더브이씨's structured data** (round amounts, investor lists, valuations) as your own content, even with attribution.
- **Use 더브이씨 only as a discovery signal for human researchers**, not as an automated crawl target.
- **Build the funding-round dataset from primary sources**: (1) DART 주요사항보고서/증권신고서 for investments triggering disclosure, (2) 보도자료 (press releases — facts are not copyrightable, but presentation may be, so re-express in your own words), (3) 중기부 K-Startup, TIPS 공시, (4) 사용자 제보 with source URL, (5) VC firm portfolio pages (read each VC's robots.txt + ToS individually).
- **Document a "source provenance chain" per data point** so you can prove independent derivation if challenged.
- **Respect robots.txt absolutely** for any scraping you do; set User-Agent identifying your bot + contact email; rate-limit conservatively (≤1 req/sec); honor 429/503.
- Consider reaching out to THE VC for a **data partnership / API license** before scaling — much cheaper than legal exposure.

**Warning signs:**
- Engineer says "I just spun up a Puppeteer scraper for thevc.kr overnight."
- A funding round in your DB matches THE VC's exact text/structure (copy-paste smell).
- Cloudflare challenges, sudden 403s, IP blocks from target sites.
- C&D letter arrives from 더브이씨's legal counsel (서면 경고).

**Phase to address:**
**Phase 1 (foundation)** — bake the scraping policy into the data ingestion architecture before writing any crawler. Design data model with mandatory `source_type` and `source_url` columns from day 1.

---

### Pitfall 2: Stale data presented as current → researcher trust collapse

**What goes wrong:**
Researcher cites your platform in a 보고서/기사 saying "X사 시리즈 B = 200억원". Three days later someone points out the round was actually 2 years ago and superseded by a Series C the platform missed. Trust evaporates in the journalism community via Twitter/X — recovery takes 6+ months. Crunchbase's coverage delay is documented: "it takes one year for half of seed rounds to find their way into major data sources" — yours will be worse at v1.

**Why it happens:**
- ETL runs monthly, but UI shows no "as of" timestamp.
- Card shows "Latest round: Series B" without "Last verified: 2024-03-12."
- Manual curation queue has 2-week lag, but data displays as authoritative.
- No mechanism to flag a record as "potentially stale — verify with primary source."

**How to avoid:**
- **Every record carries `last_verified_at` and `last_source_check_at`** (separate from `updated_at`).
- UI displays freshness prominently: green/yellow/red dot based on age (e.g., <30d / 30-180d / >180d).
- For funding rounds: badge "이 정보는 YYYY-MM-DD 기준입니다 — 최신 라운드 제보하기" with one-click correction form.
- **"We don't claim completeness" disclaimer** on every company page — sets researcher expectations.
- Schedule recurring "freshness audit" jobs: re-check companies in top-100 sectors monthly; long-tail quarterly.
- Surface confidence band: "Coverage: HIGH (last DART check 3d ago)" vs "Coverage: LOW (no automated source — user-submitted only)."

**Warning signs:**
- Support emails saying "your data is wrong" arrive faster than ETL can fix them.
- Bounce rate on company detail pages spikes after a high-profile round you missed.
- Researchers stop citing you in articles (silent churn — hard to detect; survey users directly).

**Phase to address:**
**Phase 1 (data model)** — `last_verified_at`, `confidence_score`, `source_provenance` are core columns. **Phase 3-4 (UI)** — freshness badges, "report correction" flow.

---

### Pitfall 3: No source provenance per fact → can't defend numbers when questioned

**What goes wrong:**
Journalist DMs: "Where did the 직원 200명 number for company X come from?" Engineer can't answer because the field is just an integer in the DB. Three possibilities: DART 사업보고서, 잡코리아 채용공고 카운트, 사용자 제보 — all have very different reliability. Without provenance, every datum is suspect equally.

**Why it happens:**
- MVP data model has `companies.employee_count INT` without companion `_source` columns.
- ETL collapses multiple sources into one "best guess" without keeping the trail.
- Frontend has no slot to show "출처: DART 2024년 사업보고서" beside the number.

**How to avoid:**
- **Source-per-fact data model** from day 1. Don't store `companies.employee_count`; instead store `company_facts (company_id, fact_type, value, value_unit, source_id, source_url, observed_at, confidence)`.
- For displayed metrics: latest fact per type wins, but UI offers "출처 보기" tooltip linking to the source.
- For aggregates (chart of employee count over time): each point is a `fact` with its own source.
- Maintain `sources` table with provenance metadata (DART filing ID, scraped URL hash, user submission ID, manual entry user).
- For user submissions: require URL or document upload as proof; mark as "user-reported, unverified" until moderator approves.

**Warning signs:**
- Engineers can't answer "where did this number come from?" within 30 seconds.
- Conflicting values for same fact get silently overwritten instead of being stored as competing observations.
- Chart shows a clean line but the underlying data is mixed (some DART, some scraped, some guessed) without disclosure.

**Phase to address:**
**Phase 1 (data model)** — non-negotiable foundation. Adding provenance later requires a full schema migration touching every metric.

---

### Pitfall 4: Korean-language search using default `to_tsvector('simple')` → "토스" doesn't match "토스뱅크"

**What goes wrong:**
Default Postgres FTS treats Korean as opaque whitespace-separated tokens. "토스" search returns only documents containing the exact word "토스" — not "토스뱅크", "토스증권", "토스인슈어런스." Worse: "비바리퍼블리카" doesn't match "비바리퍼블리카(주)" because parenthesis/조사 aren't stripped. Researchers can't find what they know exists; they conclude "your search is broken" and leave.

**Why it happens:**
- Postgres has no built-in CJK text search config.
- Engineers default to `to_tsvector('simple', name)` which only lowercases and splits on whitespace.
- 자모 분해 / 조사 처리 / compound noun splitting requires a Korean morphological analyzer (mecab-ko, nori, KOMORAN, Khaiii).
- Supabase's managed Postgres does NOT have mecab-ko extension installed by default and you can't `CREATE EXTENSION` for it.

**How to avoid:**
- **Hybrid search strategy from v1:**
  1. **Application-side n-gram + normalization** for Postgres FTS: tokenize at app level (mecab-ko-msvc Python service or @hyunwoongko/kss for Node), strip 조사 (은/는/이/가/을/를/의/에/에서), generate trigrams, store as `tsvector` and additional `text` column with `pg_trgm` GIN index.
  2. **Brand-name aliases** table: `(canonical_id, alias_text, alias_type)` so "토스" → "비바리퍼블리카" and vice-versa, plus 영문/한글 변환 (Toss ↔ 토스).
  3. For v2 if scale warrants: **Meilisearch or Typesense** (both have decent CJK support) as a separate index, sync via Supabase webhooks.
- Test with a fixed query set: ["토스", "토스뱅크", "비바리퍼블리카", "당근", "당근마켓", "Coupang", "쿠팡"] — must all return reasonable results.
- Avoid mecab-ko PostgreSQL extension on Supabase (not installable on managed plan); use it server-side or pick a different FTS engine.

**Warning signs:**
- QA finds known companies don't appear for obvious queries.
- Search analytics show high "0 results" rate for short Korean queries.
- Users open a ticket: "왜 검색이 안 돼요?"

**Phase to address:**
**Phase 2 or 3 (search)** — must be addressed before launch. Decide tokenization strategy in Phase 1 architecture so you don't need to rebuild the index later.

---

### Pitfall 5: Investor/round data quality — currency confusion, lead vs participant misclassification

**What goes wrong:**
- "시드 1억원" gets stored as `1` in a column meant for `1억` (units mismatch, off by 10000×).
- "$1M Series A" and "10억원 시리즈 A" displayed side-by-side without normalization — can't compare.
- Press release says "Acme leads $5M with participation from B, C" — engineer marks all three as "lead" because the parser doesn't know the term.
- Convertible note (CB) treated as equity round, inflating "총 투자금."
- Pre-money / post-money valuation confusion.
- Round date is "announced" date vs "closed" date — different by months.

**Why it happens:**
- 한국 보도자료 mixes 만원/억원/원/USD freely.
- LLM extraction is fuzzy on Korean VC vocabulary (시리즈 / 라운드 / 투자유치 / 후속투자).
- "Lead" / "lead investor" has no consistent Korean term — 리드 / 메인 / 주도 / 단독 등.

**How to avoke:**
- Store every monetary value as `(amount_minor BIGINT, currency_code CHAR(3), original_text TEXT)`. Always store original text from source for audit.
- Normalize to KRW for display + USD for sorting/filter (use historical FX rate at round date, not current).
- `round_investors` join table with explicit `participation_type ENUM ('lead', 'co_lead', 'participant', 'follow_on', 'unknown')` — default `unknown` when source is ambiguous.
- Distinguish `round_type ENUM ('seed', 'pre_a', 'series_a', ..., 'convertible_note', 'sa fe', 'bridge', 'venture_debt', 'grant')` — separate counts.
- Show data quality badge on round: "출처: 보도자료 단일 / DART 공시 확인 / 다중 출처 교차검증."
- Manual moderator review for any round >100억원 or any IPO/Series C+ — high-stakes, low-volume, worth the human time.

**Warning signs:**
- Cumulative funding chart shows obvious outlier spikes (off by 10000×).
- Multiple "lead" investors on a single round (>2 is suspicious).
- "총 누적 투자액" doesn't match company's known order of magnitude (sanity-check against well-known cases).

**Phase to address:**
**Phase 1 (data model)** — get the money type right. **Phase 2-3 (ingestion)** — parsing rules and moderator queue. **Phase 4 (UI)** — quality badges.

---

### Pitfall 6: DART API parsing complexity underestimated → ETL stalls for weeks

**What goes wrong:**
Founder says "DART는 공식 API 있으니까 쉽지" → engineer hits hard reality:
- Daily limit is **10,000 requests/day, 1,000 requests/minute** per API key (per official terms).
- Disclosure list API returns 100 results/page, max 100 pages — cursor pagination required.
- Financial statements come in three flavors: **single-XBRL bulk download (`fnlttXbrl.xml`), single-account API (`fnlttSinglAcnt.json`), multi-company API (`fnlttMultiAcnt.json`)** — different schemas, different completeness.
- Account names are not normalized: "매출액" vs "수익(매출액)" vs "영업수익" vs "매출" — must build mapping table per industry.
- Pre-IPO startups often file only **연결재무제표** OR only **별도재무제표** but not both — calculation logic differs.
- Many startups are 비외감 (외부감사 면제) → no DART filing at all → coverage gap.
- 사업보고서 attachments (employee count, executive list) are PDFs/HWPs requiring separate parsing (HWP is a Korean proprietary format — `pyhwp` works for old HWP, HWPX is newer XML-based).
- Mapping `corp_code` (8-digit DART code) → `법인등록번호` (13-digit registration number) → `사업자등록번호` (10-digit business number) → real "company" identity. One company can have multiple 사업자번호 (subsidiaries).

**Why it happens:**
Underestimating the gap between "API exists" and "API gives you analysis-ready data."

**How to avoid:**
- **Build a DART abstraction layer in Phase 1** — proven Python libraries `dart-fss` and `OpenDartReader` cover most edge cases; do NOT reinvent.
- **Account mapping table** as a versioned data file (one row per `(industry_code, dart_account_name, normalized_account_id)`); review and update quarterly.
- Persist raw API responses (cheap S3/Supabase storage) — re-parse from cache instead of re-hitting API.
- Plan for **two API keys minimum** (1 ETL + 1 ad-hoc) to stay under daily quota; rotate if needed.
- Identity model: `companies` table is the canonical entity; `company_identifiers (company_id, identifier_type, value)` for many-to-one corp_code, 사업자번호, 법인번호, 도메인.
- Accept coverage gap: 비외감 startups won't have DART data — cover them via 보도자료/사용자 제보, mark `data_source_coverage='none'`.

**Warning signs:**
- ETL job hits 429 errors mid-run (quota exhausted).
- Financial chart shows cliff at year boundary because account name changed.
- Same company appears twice with different `corp_code` (a subsidiary mistakenly registered as a separate company).

**Phase to address:**
**Phase 1 (foundation)** — DART client + identity model. **Phase 2 (ETL)** — account normalization + multi-source reconciliation.

---

### Pitfall 7: PIPA / GDPR exposure when listing founder/executive names

**What goes wrong:**
Korea's 개인정보보호법 (PIPA) treats names + workplace + position as **personal information** even when sourced from public DART filings. PIPA was amended March 10, 2026 (most provisions effective September 11, 2026), tightening accountability — board approval required for CPO designation, foreign businesses must appoint a domestic privacy representative by October 2, 2025. EU visitors hitting your site (statistically guaranteed even if you don't market there) trigger GDPR — basis = "legitimate interest" but you must honor data-subject access requests (DSAR), erasure, rectification.

Common pitfalls:
- Scraping 임원 정보 from LinkedIn (clear ToS violation + PIPA collection without consent).
- No DSAR endpoint → first complaint becomes a regulatory incident.
- No retention policy → exec who left a company in 2018 still listed in 2026.
- Listing 주민등록번호 variants, phone, personal email — even accidentally.
- Email alerts/marketing without explicit opt-in (PIPA §22 requires distinct consent for marketing).

**Why it happens:**
"공개된 정보니까 괜찮다" — wrong. PIPA Article 15 still requires lawful basis even for publicly available data. GDPR Recital 47 allows legitimate interest but requires balancing test.

**How to avoid:**
- **Limit person data to what's strictly necessary**: name, current position, current company. No DOB, no address, no contact info.
- **Source restriction**: only from DART 임원현황 or company-published IR/About pages (not LinkedIn/news scraping for personal details).
- **Retention policy**: drop person record from current display when they leave; archive in audit table only.
- **Public DSAR endpoint**: `privacy@yourdomain` + web form for access/deletion requests; commit to <30-day response (GDPR) / <10-day acknowledgment (PIPA).
- **개인정보 처리방침** (privacy policy in Korean) prominently linked from footer — required by PIPA §30. Template available from KISA.
- **Cookie consent** for EU visitors (geo-detect → show banner); minimum analytics (consider Plausible — no cookies, no consent needed).
- **CPO designation** — required for any 개인정보처리자; for early-stage, founder can serve as CPO. Document the designation.
- **Marketing consent separate from signup consent** — opt-in checkbox, default unchecked.
- Foreign-business representative requirement: if served from Korea this is moot, but if you incorporate elsewhere and serve Korean users, you need a 국내대리인.

**Warning signs:**
- A founder emails: "Please remove my name from your site" — and you have no process.
- Privacy policy is the auto-generated template from a builder, not Korea-specific.
- Person profiles include data not in any single public source (composite reveal).

**Phase to address:**
**Phase 1 (compliance baseline)** — privacy policy, DSAR endpoint, consent flows. **Phase 2 (data model)** — retention rules, person-record lifecycle. **Phase 5+ (scale)** — formal CPO designation, RoPA (Records of Processing Activities).

---

### Pitfall 8: Entity resolution failure — 토스 / 비바리퍼블리카 / Toss Inc. as 3 separate companies

**What goes wrong:**
- 토스 (brand), 비바리퍼블리카 (legal entity), Toss Inc. (English name), 토스뱅크 (subsidiary), 토스증권 (subsidiary), 토스인슈어런스 (subsidiary) — naive ingestion creates 6 disconnected records.
- User searches "토스" gets 6 partial-match results, no clarity which is the parent.
- Funding rounds for Viva Republica appear separately from "토스" coverage.
- Subsidiary's revenue gets summed with parent's, double-counting.

**Why it happens:**
- Press releases use brand names ("토스가 1조원 투자유치"), DART uses legal names ("비바리퍼블리카 주식회사"), users submit either.
- Korean companies routinely operate under brand ≠ legal name ≠ English name (3 distinct strings).
- Subsidiary structure is fluid — 토스뱅크 was a JV, then merged.

**How to avoid:**
- **Canonical company entity** with `aliases (company_id, alias, alias_type ENUM('legal','brand','english','former','common'))`.
- **Identity matching pipeline** at ingestion: (1) exact match on legal name, (2) exact match on alias, (3) fuzzy match (jaro-winkler) on normalized name, (4) match on 사업자번호/법인번호, (5) human review queue if confidence <0.85.
- **Parent/subsidiary relations** as separate `company_relations (parent_id, child_id, relation_type, started_at, ended_at)` — display as company group, but keep financials separate to avoid double-count.
- **Data steward UI** for human merging: show side-by-side, button "merge into" with audit log entry.
- Reference data: OpenCorporates Korea + 국세청 사업자등록 조회 (via API) + DART corp_code as ground truth for 사업자번호.
- For brand → legal mapping at ingestion: maintain a `brand_legal_map` curated table for top 500 startups (high-traffic disambiguation cases).

**Warning signs:**
- Search for known company returns 3+ similar results.
- "총 투자유치 누적" for parent + subsidiaries sums to suspiciously high number.
- User reports: "우리 회사가 두 번 등록되어 있어요."

**Phase to address:**
**Phase 1 (data model)** — alias + relation tables foundational. **Phase 2 (ingestion)** — matching pipeline. **Phase 3-4 (admin)** — merge UI for stewards.

---

### Pitfall 9: Faceted search degrades from <500ms (10k rows) to >5s (100k rows) without warning

**What goes wrong:**
At v1 with 10k companies, the naive query `SELECT ... WHERE sector = X AND round IN (...) AND ... GROUP BY facet` runs in 200ms. At 100k rows + 10 simultaneous facets, the query plan changes — Postgres falls back to seq-scans on missing indexes, facet counts run as N+1 (one count per facet value). Page becomes unusable. Worse: on Vercel serverless, function cold-start (300ms) + 5s query = 5.3s. Function times out at 10s default → 504 to user.

**Why it happens:**
- Missing GIN index on `tsvector` and on filtered array columns (sectors, tags).
- Missing B-tree composite indexes on common filter combinations.
- Facet counts implemented as 10× separate `SELECT COUNT(*) GROUP BY ...` queries instead of a single aggregation pass.
- No query cache layer.
- Vercel function cold start (especially `nodejs-runtime` with heavy bundles) adds 300-2000ms.
- Supabase Pooler (Supavisor in transaction mode) has connection setup overhead per request.

**How to avoid:**
- **Index strategy from Phase 1 schema design:**
  - GIN index on `companies.search_tsv` (combined text vector).
  - GIN index on `companies.sectors text[]` and `companies.tags text[]`.
  - B-tree on each individually-filterable scalar (`founded_year`, `employee_count`, `total_funding_krw`).
  - BRIN on time-series tables (`company_metrics` over `observed_at`).
- **Single-query facet pattern**: use `FILTER` clause aggregations or `GROUPING SETS`/`CUBE` to compute all facets in one pass; or use `pgfaceting` (roaring bitmaps) extension if Supabase supports it.
- **Materialized view of pre-aggregated facets** refreshed nightly for "global" counts (sector totals); on-the-fly for filtered subset.
- **Cache layer**: Vercel Edge Cache for popular filter combinations (key = sorted filter JSON); Supabase `Cache-Control` headers; or Upstash Redis if more is needed.
- **Connection pooling**: use Supabase Supavisor in transaction mode; never open new connections per request from serverless.
- **Edge runtime** for read-heavy endpoints to cut cold-start.
- **Load test** at 5x expected scale before launch (k6 or Artillery, simulate 100 concurrent faceted queries).

**Warning signs:**
- p95 search latency creeps up week over week.
- Vercel logs show `FUNCTION_INVOCATION_TIMEOUT`.
- Postgres slow query log surfaces seq-scans on `companies`.
- Supabase dashboard shows "Database egress" or "Compute" approaching limits.

**Phase to address:**
**Phase 1 (data model + indexes)** — set foundation. **Phase 3 (search feature)** — facet query strategy. **Phase 5+ (scale)** — caching, materialized views, possible Meilisearch migration.

---

### Pitfall 10: SEO penalty for thin/duplicate content on programmatic company pages

**What goes wrong:**
You generate 10,000 company pages programmatically with similar templates: name + boilerplate description + financial table. Google's March 2024 + subsequent algorithm updates aggressively de-rank or manually penalize "scraped, AI-generated, or programmatic content without unique value." Your sitemap-indexed company pages become invisible in search → traffic drops 90% → no inbound users → cold start regression.

**Why it happens:**
- Re-using competitor's company descriptions verbatim (scraped → duplicate content).
- Empty/sparse pages for companies with little data ("Company X, founded 2022, [no other data]") — thin content.
- Identical page structure across 10k pages without unique signal.
- Sitemap exposes all pages including those with zero meaningful data.

**How to avoid:**
- **Unique value per page**: at minimum, original 1-paragraph summary auto-generated from financial trend ("매출 3년 연평균 +47% 성장한 핀테크 스타트업, 시리즈 C 2,000억원 누적 투자"). Different signal per company → not duplicated.
- **Original analysis blocks**: peer comparison ("동일 섹터 매출 상위 30%"), industry rank, growth trend classification.
- **No-index thin pages**: companies with <5 facts get `<meta name="robots" content="noindex">` until enriched.
- **Structured data (JSON-LD Organization)** on every page — gives Google rich-snippet signal that this is a real entity reference.
- **Don't republish scraped descriptions** — write your own, even short.
- Submit sitemap progressively as quality improves; don't dump 10k URLs day 1.
- Monitor Search Console for manual actions weekly during first 6 months.

**Warning signs:**
- Search Console "Indexed" count plateaus or drops below "Submitted."
- Coverage report shows "Crawled - currently not indexed" for thousands of pages.
- Manual action notification in Search Console (highest urgency — fix before continuing).
- Organic traffic from Google drops sharply 7-14 days after a Google update.

**Phase to address:**
**Phase 4-5 (public pages + SEO)** — set noindex thresholds, original-content generation, structured data before opening sitemap to Google.

---

### Pitfall 11: Supabase free-tier wall hits earlier than expected (500MB DB ≠ 500MB user data)

**What goes wrong:**
Founder budgets "we have 500MB free" but reality:
- 500MB total includes WAL, indexes, system catalogs, and `pg_stat_*` overhead → a fresh Supabase project with empty schema already consumes ~200-220MB.
- Free projects **pause after 7 days of inactivity** — first traffic spike hits a paused DB → 30-60s wake-up → users bounce.
- Free tier: 50K MAU, 5GB egress, 1GB file storage, 2 free projects.
- For a startup-data project: 10k companies × ~10kB row (with all related rows + indexes) ≈ 100MB raw, but with FTS GIN indexes (typically 2-3× column size) + audit logs + time-series facts → easily 400MB+.
- **First wall hit is usually database size or egress, NOT MAU** — researchers fetch lots of data per session.

**Why it happens:**
- Underestimating index + WAL overhead.
- Time-series `company_metrics` table grows linearly with metric coverage — 10k companies × 5 metrics × 60 monthly points = 3M rows.
- Audit log / change history table accumulates without retention.

**How to avoid:**
- **Storage budget per data type** in Phase 1 architecture; run estimation spreadsheet.
- **Aggressive vacuum + autovacuum tuning**; periodic `REINDEX` to reclaim bloat.
- **Time-series table partitioning by year** (Postgres declarative partitioning) — drop old partitions cheaply.
- **Move historical / append-only logs to cheap storage**: archive raw DART responses + audit logs to Supabase Storage as JSON (1GB free → S3 if more) instead of Postgres.
- **Plan upgrade trigger**: when DB hits 350MB sustained → start Pro plan ($25/mo, 8GB) preparation.
- **Heartbeat ping** (Vercel Cron every 6 days) to prevent free-tier auto-pause.
- Image hosting (logos): use Supabase Storage with smart-resize, or external CDN (Cloudinary free tier 25GB egress). Don't store images in Postgres.

**Warning signs:**
- Supabase dashboard "Database size" graph trending up >1MB/day.
- Egress graph spikes (a single bot crawler can blow through 5GB).
- Project paused notification — too late.

**Phase to address:**
**Phase 1 (architecture)** — storage budget, partitioning plan, archival strategy. **Phase 5+ (scale)** — plan upgrade.

---

### Pitfall 12: Vercel Hobby tier kills production via free-only commercial restriction

**What goes wrong:**
Vercel Hobby plan **prohibits commercial use** (per ToS — even "monetized" by ads or data subscriptions). If the project monetizes (premium gating in v2, ads, sponsored), Vercel can suspend the project without notice. Even without monetization: 100GB bandwidth, 1M edge requests, 1M function invocations, 4 hr active CPU/month — a single Twitter mention with virality can blow through monthly budget in hours, and Hobby has no overage payment → site goes down for the rest of the month.

**Why it happens:**
- Hobby tier is positioned as "free forever" — easy to assume production-ready.
- Function invocation count balloons because every facet filter change = 1 invocation; SSR pages = 1 invocation per request; image transforms = invocations.
- Cron jobs (ETL) run on Vercel = invocation cost.

**How to avoid:**
- **Plan upgrade to Pro ($20/user/mo) at launch** if monetization is anywhere on roadmap, even v2.
- Move heavy / long-running workloads OFF Vercel: ETL on a $5/mo VPS or Supabase Edge Functions (different quota), scheduled batch on GitHub Actions or Render free tier.
- **Static-first**: company detail pages use ISR (incremental static regeneration) with long revalidate (24h) — caches at edge, doesn't count as function invocation per request.
- **Aggressive caching headers** (`s-maxage=3600, stale-while-revalidate=86400`) for facet API responses.
- Consider Cloudflare Pages + Workers as alternative (more generous free tier; commercial OK).
- Monitor Vercel Usage dashboard weekly; set spend cap on Pro to prevent surprise bills.

**Warning signs:**
- Vercel Usage dashboard: bandwidth or invocations >50% of monthly limit by mid-month.
- 429 / "rate limited" errors in Vercel logs.
- Email from Vercel about ToS or usage.

**Phase to address:**
**Phase 1 (infrastructure)** — decision on commercial-eligible tier; **Phase 4-5 (launch)** — caching strategy; **Phase 5+ (post-launch)** — monitoring + auto-scale plan.

---

### Pitfall 13: Premium gating that backfires (Crunchbase mistake) → no mindshare, no growth

**What goes wrong:**
v2 introduces premium tier. Founder gates too aggressively (e.g., funding round details behind paywall, search results capped to 5). Researchers/journalists hit the wall, conclude product is hostile, share alternatives. Crunchbase historically gated so heavily that 2010s startup ecosystem migrated to free alternatives (AngelList, Product Hunt, Tracxn) for top-of-funnel.

**Why it happens:**
- Pressure to monetize before product-market fit.
- Mistaking "users tolerate gating" (because no alternative exists in your case yet) for "users prefer this product."
- Confusing gate metrics (conversion rate) with growth metrics (DAU, citations, referrals).

**How to avoid:**
- **v1 is 100% free, no gates**: build mindshare first. Researcher persona is the marketing channel — they cite you publicly.
- v2 gating principles:
  - **Free**: All search, all view, all detail. SEO depends on it.
  - **Free with login**: Watchlist, saved searches, alerts (gentle conversion incentive).
  - **Paid**: Bulk export (CSV/API), advanced filters (custom comparison sets), team workspace, write-API.
- Revenue from B2B (corporate accounts, API for HR-tech / market intel firms) — NOT from researchers/journalists.
- Always offer free tier for verified journalists/academics (proof = .ac.kr or press-card upload).
- Watch competitor pricing disasters — Crunchbase's 2017 paywall expansion is the cautionary case study.

**Warning signs:**
- After premium launch: organic traffic stagnates, signups drop, social mentions decline.
- "Free alternatives to [your name]" appearing in search results.
- Researcher persona stops citing you.

**Phase to address:**
**v2 (out of v1 scope per PROJECT.md)** — but document principles in **Phase 1 (positioning)** so future decisions inherit them.

---

### Pitfall 14: Admin/curation UX neglected → corrupt data piles up, can't roll back

**What goes wrong:**
Public-facing UI is polished. Admin tooling is `pgAdmin` or "Supabase Studio direct edit." User submissions queue grows to 500 unprocessed entries because the moderator interface is painful. Bad data gets approved by accident; no diff view, no rollback, no audit trail of who changed what. A fired admin's last act is changing 100 records — silent damage discovered weeks later.

**Why it happens:**
- "Admin can use SQL" mindset.
- No bandwidth to build CRUD admin alongside public UI.
- Underestimate moderation workload.

**How to avoid:**
- **Build admin UI as a first-class app**, not a SQL frontend. Suggested stack: Next.js admin route group `app/(admin)` with Supabase RLS policies + role check, or Refine.dev / React-admin / Retool for speed.
- **Audit log table** for every write: `(actor_id, action, entity_type, entity_id, before_jsonb, after_jsonb, source, occurred_at)`. Append-only, never deleted.
- **Soft-delete + version history** on key tables: `is_deleted`, `version`, never hard-delete user-visible data.
- **Diff view for user submissions**: side-by-side current value vs proposed value, one-click approve/reject with optional note.
- **Approval queue with assignment**: avoid race conditions, track time-to-approval as KPI.
- **Role separation**: data steward (can edit), reviewer (can approve), admin (can manage roles). RLS enforces.
- **Daily snapshot** of `companies` table to Storage as JSON (cheap insurance) — full restore possible.

**Warning signs:**
- Submission queue length grows over time (sustained backlog).
- "Why did X data change?" question can't be answered.
- Moderator complaints about workflow speed.
- Mass-edit incident → no way to revert.

**Phase to address:**
**Phase 2-3 (data ingestion)** — audit log + soft-delete in schema. **Phase 3-4 (admin UX)** — moderator app build. Don't defer to "after launch" — backlog compounds.

---

### Pitfall 15: Cold-start chicken-and-egg — no data → no users → no data submissions

**What goes wrong:**
Day 1 launch: 50 companies seeded. User visits, finds 8 of 10 lookups missing → leaves, doesn't return. No traffic → no submissions → no data growth → permanent <100-user purgatory.

**Why it happens:**
- Underestimating the seed-data threshold for usefulness.
- Assuming "users will fill it in" — they won't, until the data is already 70% useful.
- No partnerships strategy.

**How to avoid:**
- **Seed minimum 5,000 companies before any public launch** (matches PROJECT.md target). DART corp_code list has ~100k entities — filter to active + recent + tech sectors.
- **Bootstrap data sources** (legal, prioritized):
  1. **DART** (official, free, fully open) — financials, exec lists, major investments triggering disclosure. ~20k 외감 entities, narrow by industry/size.
  2. **K-Startup, TIPS, 창조경제혁신센터 portals** — government-published startup lists (public domain).
  3. **Government open data** (data.go.kr): 사업자등록정보, 벤처기업확인 list — bulk CSV downloads.
  4. **Boilerplate company info** from 사업자번호 (via 국세청 API) — name, address, 업종.
  5. **Manual curation of top 1000** startups (1 person × 2 weeks at 50/day).
- **Partnerships** (high-leverage):
  - 액셀러레이터/VC portfolio pages — request permission to mirror with attribution.
  - 스타트업 미디어 (Platum, 벤처스퀘어) — content partnership exchanges.
  - 대학 창업지원단 — student internship → manual curation.
- **Public submission flow** with low friction: 1-field form (URL or company name), AI-extract draft, moderator approve.
- **Show the cold-start gracefully**: if 0 results, "검색하신 기업이 등록되지 않았네요. [등록 제안하기]" — converts miss to contribution.
- **Pick a vertical to dominate first** (e.g., 핀테크 or AI 스타트업) — be 95% complete in one slice before going wide.

**Warning signs:**
- DAU stays flat below 100 for 2+ months post-launch.
- Submission rate ≈ 0 even with traffic.
- Direct user feedback: "내가 찾는 회사가 없어요."

**Phase to address:**
**Phase 0/1 (pre-launch)** — bootstrap pipeline + 5k company seed. **Phase 2-3 (ETL)** — automation for ongoing growth. **Phase 5 (launch)** — partnerships activated.

---

### Pitfall 16: Time-series chart pitfalls — unit mismatch, gap silence, axis traps

**What goes wrong:**
- Chart shows revenue 2020-2024 at 만원, but 2024 datapoint accidentally 억원 → 10000× spike makes pre-IPO appear to dwarf Apple.
- Missing year (no DART filing 2021) shown as 0 → looks like company collapsed; real reason: data gap.
- Linear Y-axis with 1억원 + 1조원 on same chart → smaller value invisible.
- Comparison overlay ("토스 vs 카카오뱅크") with shared Y-axis → small player flatlined.
- Stacked area where one series has missing periods → others rescale weirdly.

**Why it happens:**
- Charts auto-render from raw `value` without unit-validation.
- Charting library defaults (Recharts/Chart.js/ECharts) hide gaps as zeros.
- No human review of chart output before display.

**How to avoid:**
- **Unit-aware data model** (already in Pitfall 5): `value + unit` always together.
- **Render with explicit unit conversion** to display unit (KRW 억원); validate at render that all series share unit.
- **Gap visualization**: missing data → broken line + gap marker, NOT zero. (Recharts: `connectNulls={false}`.)
- **Y-axis log toggle** for charts spanning 3+ orders of magnitude.
- **Comparison normalization**: indexed view (year 0 = 100) for trajectory comparison; absolute view for size comparison; let user toggle.
- **Sanity-check at ingestion**: if YoY change >300% or <-90%, flag for review (probably a unit error).
- **Snapshot test** charts during CI — visual diff catches regressions.
- **Chart annotation** for known events ("IPO 2021-08", "사업분할 2023") — explains discontinuities.

**Warning signs:**
- Reader emails: "차트가 이상해요" — usually unit error.
- Chart shows impossible values (1조원 시드 라운드).
- Same company chart looks different on consecutive page loads (data race).

**Phase to address:**
**Phase 4 (visualization)** — unit-validation + gap handling at chart-component level. **Phase 1 (data model)** — value+unit pair as data foundation.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single `description TEXT` column scraped from source | Quick page rendering | Duplicate content SEO penalty; can't update without re-scrape; copyright exposure | NEVER — always derive original text |
| `companies.employee_count INT` instead of `facts` table | Simple SELECT | Loses provenance, version, source, date | NEVER for production — only acceptable in throwaway prototype |
| Use Supabase free tier through launch | $0 cost | Auto-pause on inactive, hard cap at 500MB, no support | OK pre-launch + closed beta only; upgrade before public launch |
| Vercel Hobby in production | $0 cost | ToS violation if monetized; site goes down on viral spike | Pre-launch only; switch to Pro before public |
| Default `to_tsvector('simple')` for Korean | Works in 1 line | Search broken for Korean compounds | Acceptable in earliest prototype week 1; replace before any user testing |
| User submissions auto-published | Faster contribution loop | Spam, vandalism, bad data | NEVER — always moderate before public |
| No audit log on data writes | Faster Phase 2 | Can't trace bad data; can't roll back; compliance fail | NEVER — log table is 1 day of work, save 1 month later |
| Skip DSAR endpoint pre-EU traffic | Faster launch | First privacy complaint = regulatory incident | NEVER — implement at launch |
| Hardcode KRW everywhere (no currency col) | Simpler queries | Rework when adding 일본/싱가폴 (in scope!) | NEVER for this project — multi-currency is roadmap-required |
| Identity dedupe deferred | Faster ingestion | Rework on tens of thousands of rows; user-visible duplicates | OK during seed phase IF dedupe pipeline is built before public launch |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| DART OpenAPI | Sharing one API key across all environments → quota exhaustion | One key per environment (dev/staging/prod); separate ETL key from ad-hoc |
| DART OpenAPI | Parsing `fnlttSinglAcnt` for non-listed (외감 only) companies → empty | Check `corp_cls` (Y/K/N/E) before financial query; many startups are `N`(기타) with no statements |
| DART OpenAPI | Treating `corp_code` as company identity | corp_code is per filing entity; map to canonical company via 사업자번호 + name dedup |
| Supabase Auth | Using Supabase JWT directly for RLS without role claim | Add custom claim via auth hook; map to `roles` table for moderator/admin |
| Supabase RLS | Forgetting RLS on storage buckets → public file leak | Set RLS policies on `storage.objects` per bucket explicitly |
| Supabase Realtime | Subscribing to entire `companies` table → bandwidth bill | Filter subscriptions narrowly; consider polling for low-frequency updates |
| Vercel Cron | Using Vercel Cron for >5min ETL → function timeout | Vercel Cron triggers a webhook into a worker (Render/Fly/VPS) for long jobs |
| Vercel ISR | Forgetting `revalidate` → infinite cache; or too short → cost spike | `revalidate: 86400` (24h) for company pages; on-demand revalidate via API on data update |
| Kakao OAuth | Using only Google login (excludes 60% of Korean users) | Both Google + Kakao from day 1; Kakao requires business app registration |
| 국세청 사업자조회 API | Direct call from browser → CORS + key leak | Server-side proxy; cache results 30 days |
| Google Search Console | Submitting 10k pages day 1 → crawl budget waste | Progressive sitemap; submit by sitemap-index, prioritize high-quality first |
| `pg_trgm` | No GIN index → seq-scan trigram match | `CREATE INDEX ... USING GIN (col gin_trgm_ops)` mandatory |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Naive facet COUNT(*) per filter | Page load 3-10s | Single aggregation w/ FILTER clauses or `pgfaceting` | ~50k rows × 5+ facets |
| Missing GIN index on tsvector | Search 2s+ for common terms | `CREATE INDEX ... USING GIN(search_tsv)` at table create | ~10k rows |
| N+1 in company list (fetch logo, latest round, employee count separately) | Network waterfall in DevTools | Single SQL with joins or `select=*,latest_round(*),latest_metric(*)` (PostgREST) | Any list >20 items |
| Unbounded time-series fetch for chart | Chart loads 5s, payload 5MB | Server-side downsampling (`time_bucket` from TimescaleDB or LTTB algorithm) | ~100 points |
| Storing logos in Postgres `bytea` | DB bloat 10× user data | Supabase Storage + CDN URL in DB | Any image storage |
| ISR with `revalidate: 0` | Function invocation per request → quota exhaust | Set realistic `revalidate` (3600+) | Day 1 of public traffic |
| No connection pool (direct Postgres from serverless) | Connection exhaustion under load | Supavisor/PgBouncer transaction mode | ~50 concurrent users |
| `SELECT *` from wide tables | Row size large, all columns shipped | Explicit column projection; consider denormalized read model | ~10k rows × 50 columns |
| Browser-side JSON sort/filter on large lists | UI freezes on pagination | Server-side sort/filter; virtualize lists >100 rows | Mobile or 1000+ row lists |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS disabled "temporarily" for ETL | All user data world-readable until re-enabled | Use service-role key for ETL; never disable RLS |
| Service-role key in client bundle | Full DB access leaked | Service-role only in server env vars; CI secret scan (gitleaks) |
| User-supplied URL fetched server-side without SSRF protection | Internal-network access (e.g., http://169.254.169.254) | URL allowlist + DNS resolution check + private-IP rejection |
| Email alerts without unsubscribe link | PIPA §22-2 violation, can-spam | One-click unsubscribe in every marketing email; honor within 7 days |
| Storing scraped LinkedIn data | PIPA + LinkedIn ToS violation | Don't scrape LinkedIn; person data only from DART/IR/user-volunteered |
| Public profile of private founder (without their knowledge) | Defamation / privacy claim | Only persons with public role disclosure (DART 임원, IR site, public statement); takedown on request |
| No rate limit on submission form | Spam, automated junk submissions | Cloudflare Turnstile (free) + 5/hr/IP limit |
| Unsigned JWT or weak secret | Auth bypass | Supabase manages JWT; if custom, ≥256-bit secret in env; rotate quarterly |
| Logging full request body (incl. password fields) | Credential leak in logs | Structured logger with field redaction (`pino` w/ redact paths) |
| Open API for bulk download w/o auth | Whole DB scraped by competitor | Authenticated, rate-limited, watermarked, ToS-bound API only |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No "as-of" timestamp on data | Researcher cites stale data → public retraction | Visible freshness badge on every metric/page |
| 0-result search dead-end | User leaves; no contribution loop | "Suggest a company" inline; near-match suggestions; partial-match fallback |
| Filters don't show available count per option | User clicks filter, gets 0 results, frustrated | Inline counts beside each option ("핀테크 (342)") |
| Chart without unit label | Misreading values | "₩억원" / "USD M" / "명" labels prominent on axis |
| Korean+English mixed inconsistently in UI | Researcher confusion | Pick one (Korean primary), translate consistently; i18n key structure from v1 |
| Modal-dialog for company detail | Can't share URL | Dedicated URL per company `/companies/[slug]` |
| Pagination only (no jump-to / no URL state) | Lost position on back button | URL-encoded filters + page; preserve via Next.js router |
| Mobile layout shows desktop facets | 10 sidebar filters unusable on phone | Filter modal w/ apply button; chip-based selected display |
| No print/export for researchers | Workflow break (researcher needs to copy data) | "Export CSV" button (free for table data); "Print-friendly view" |
| No keyboard nav for power users | Researcher productivity loss | `/` to focus search, `j/k` to navigate results, `?` for shortcut help |
| Login wall before exploring value | Users bounce before signup | All search/view free; login only for save/alert (per Pitfall 13) |

## "Looks Done But Isn't" Checklist

- [ ] **Search:** Tested with Korean compound nouns (토스뱅크), 영문 (Toss), 자모 (ㅌㅗㅅㅡ — typo tolerance), aliases (당근/당근마켓), 사업자번호 — all return reasonable results
- [ ] **Faceted filters:** Inline option counts present; combinations of 5+ filters return in <1s; "0 results" state has helpful CTA
- [ ] **Company detail:** "출처" + "마지막 업데이트" present on every fact; "report correction" form works; missing data shown as gap not zero
- [ ] **DART ingestion:** Handles 비외감 (no statements), 연결/별도 selection, account-name normalization, partial-year fiscal periods
- [ ] **Provenance:** Pick any 10 random facts on the site → can answer "where did this come from?" within 30s using the admin tool
- [ ] **Privacy:** `/privacy` page in Korean exists; `/contact` for DSAR works; cookie consent banner for EU IPs; CPO contact published
- [ ] **Auth:** Both Google + Kakao login work; logout clears session; session expiry handled gracefully
- [ ] **Admin moderation:** Approval queue accessible; diff view side-by-side; audit log records every change with actor; rollback possible
- [ ] **Identity:** Searching for parent company surfaces subsidiaries; "토스" / "비바리퍼블리카" / "Toss" all reach the same canonical entity
- [ ] **Time-series charts:** Unit consistent across series; gaps shown as breaks; comparison mode toggleable
- [ ] **SEO:** Sitemap excludes thin pages (<5 facts); company pages have unique meta descriptions; structured-data Organization JSON-LD valid
- [ ] **Performance:** Lighthouse mobile ≥85; p95 search <1s; first contentful paint <2s on 4G
- [ ] **Mobile:** Faceted search usable on 375px; sticky filter button; charts horizontally scrollable
- [ ] **Free-tier monitoring:** Supabase + Vercel usage dashboards bookmarked; alerts at 70% threshold
- [ ] **Cold-start:** ≥5,000 quality companies seeded BEFORE public sitemap submitted to Google
- [ ] **i18n:** All user-facing strings via i18n key (no hardcoded Korean in JSX); English translation file scaffolded (even if empty)
- [ ] **Backups:** Daily Postgres snapshot to Supabase Storage; verified restore-ability monthly

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Scraping C&D from 더브이씨 | HIGH | (1) Stop crawler immediately, (2) delete all derived data, (3) document removal, (4) reply to counsel within 7 days, (5) re-architect ingestion from primary sources, (6) consider partnership outreach |
| Stale data publicly cited wrong | MEDIUM | (1) Issue correction with timestamp, (2) public methodology note, (3) accelerate freshness audit, (4) personal apology to cited journalist |
| Provenance retrofit on existing schema | HIGH | (1) Add `facts` table parallel to current columns, (2) backfill from raw sources where possible, (3) mark un-traceable as "legacy import", (4) deprecate old columns over 3 months |
| Korean search returns nothing | MEDIUM | (1) Audit failing queries from logs, (2) add aliases for top 100 misses, (3) implement n-gram fallback, (4) consider Meilisearch swap |
| Currency/unit error in displayed funding | MEDIUM | (1) SQL audit for outliers (>100x sector median), (2) bulk-correct with audit log entries, (3) add ingestion validation rule, (4) public methodology disclosure |
| DART quota exhausted | LOW | (1) Wait for next-day reset, (2) split by additional API key, (3) add caching layer to reduce calls, (4) prioritize endpoints |
| PIPA / GDPR complaint or DSAR | HIGH | (1) Acknowledge within 24h, (2) fulfill DSAR within 30d (GDPR) / 10d acknowledgment (PIPA), (3) review data minimization, (4) update RoPA, (5) report to KISA/PIPC if breach |
| Identity dedupe failure (duplicate companies) | MEDIUM | (1) Stewards merge in admin tool, (2) preserve URLs via 301 redirect, (3) backfill matching pipeline, (4) re-run on full dataset |
| Faceted search slow at scale | MEDIUM | (1) Profile with `EXPLAIN ANALYZE`, (2) add missing indexes, (3) materialized view for global facets, (4) cache layer (Edge/Redis), (5) consider Meilisearch |
| SEO thin-content penalty | HIGH | (1) Identify penalized URLs in Search Console, (2) noindex thin pages, (3) enrich content, (4) submit reconsideration request, (5) wait 1-3 months |
| Supabase free-tier paused | LOW | (1) Upgrade to Pro ($25/mo), (2) project resumes, (3) implement heartbeat to prevent recurrence |
| Vercel quota exhausted mid-month | MEDIUM | (1) Upgrade to Pro, (2) audit invocation hot spots, (3) increase ISR revalidate, (4) move heavy work off Vercel |
| Bad data mass-modified by admin | HIGH if no audit log; LOW if logged | With audit log: replay before-state from log table. Without: restore from snapshot, lose changes since snapshot |
| Cold start no growth | HIGH | (1) Pivot to vertical focus (one sector), (2) media partnerships, (3) manual high-quality seed top 1000, (4) PR push with Platum/Vingle |

## Pitfall-to-Phase Mapping

Suggested phases (orchestrator may reorganize):
- **Phase 1: Foundation** — schema, RLS, identity, provenance, compliance baseline
- **Phase 2: Data ingestion** — DART ETL, scraping policy, moderation queue
- **Phase 3: Search & filters** — Korean tokenization, faceted UI, indexes
- **Phase 4: Public site** — company pages, charts, SEO foundations
- **Phase 5: Auth & accounts** — social login, watchlist, alerts
- **Phase 6: Admin & curation** — steward UI, audit log, rollback

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Scraping legality (THE VC) | Phase 1 (policy) + Phase 2 (ingestion) | Code review: no `thevc.kr` in any crawler config; legal sign-off on data sources list |
| Stale data perception | Phase 1 (schema) + Phase 4 (UI badges) | UI test: every fact display has freshness indicator |
| No provenance per fact | Phase 1 (schema, non-negotiable) | Schema review: no scalar metric column exists without companion source ref |
| Korean search broken | Phase 1 (decision) + Phase 3 (build) | Test suite: 20-query benchmark covering compounds/aliases passes |
| Investor/round data quality | Phase 1 (money type) + Phase 2 (parsing) + Phase 6 (review) | Data audit: random 50-row sample, ≥95% accuracy vs primary source |
| DART parsing complexity | Phase 1 (architecture) + Phase 2 (ETL) | Coverage report: ≥80% of seeded 외감 companies have ≥3 years financials |
| PIPA / GDPR exposure | Phase 1 (policies + DSAR endpoint) | Compliance checklist: privacy policy live, DSAR form works, CPO designated |
| Entity resolution failures | Phase 1 (alias model) + Phase 2 (matcher) | Manual test: 30 known parent/sub/alias cases all merge correctly |
| Faceted search performance | Phase 1 (indexes) + Phase 3 (query) | Load test: 100 concurrent users, 5-facet query, p95 <1s at 100k rows |
| SEO thin-content penalty | Phase 4 (content + noindex) | Search Console: 0 manual actions; ≥80% submitted-vs-indexed ratio |
| Supabase free-tier wall | Phase 1 (storage budget) + Phase 5+ (upgrade plan) | Monitoring: alert at 70% of any quota; documented upgrade path |
| Vercel free-tier wall | Phase 1 (decision) + Phase 4 (caching) | Pro plan active before public launch; usage dashboard reviewed weekly |
| Premium gating backfire | Phase 1 (positioning principles) + v2 design | Documented in PROJECT.md key decisions; v2 review against principles |
| Admin / curation neglect | Phase 1 (audit-log schema) + Phase 6 (UI) | Moderator can complete: review-edit-approve-rollback in <30s per item |
| Cold-start chicken-and-egg | Phase 0 / pre-launch (seed 5k) + Phase 5 (partnerships) | Public launch gate: ≥5k companies + ≥1 media partnership |
| Time-series chart pitfalls | Phase 1 (value+unit) + Phase 4 (chart component) | Visual snapshot tests; "report wrong chart" link per chart |

## Sources

- [대법원 2022.5.12. 선고 2021도1533 판결 (야놀자 vs 여기어때) — file.scourt.go.kr](https://file.scourt.go.kr/dcboard/1727143941701_111221.pdf)
- [Korean Supreme Court Provides Clarity on Web Scraping — Lexology](https://www.lexology.com/library/detail.aspx?g=1ae8c0a9-660b-45b7-9ef6-030f387d6e29)
- [잡코리아 vs 사람인 무단 크롤링 판결 — Law Times](https://m.lawtimes.co.kr/Content/Article?serial=98844)
- [크롤링 관련 최근 대법원 판결과 그 시사점 — Shin & Kim newsletter](https://www.shinkim.com/kor/media/newsletter/1843)
- [THE VC 이용약관 (terms of use)](https://guide.thevc.kr/terms-of-use)
- [OpenDART 이용약관 — opendart.fss.or.kr](https://opendart.fss.or.kr/intro/terms.do)
- [OpenDART 개발가이드 — opendart.fss.or.kr](https://opendart.fss.or.kr/intro/main.do)
- [dart-fss documentation (XBRL extraction)](https://dart-fss.readthedocs.io/en/latest/dart_xbrl.html)
- [OpenDartReader — GitHub](https://github.com/FinanceData/OpenDartReader)
- [Personal Information Protection Act (PIPA) Updates 2025 — DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=KR)
- [South Korea PIPA 2026 — Pureum Law Office](https://pureumlawoffice.com/personal-information-protection-act-pipa/)
- [PIPA 2025 Updates — Cross Border Advisory](https://crossborderadvisorysolutions.com/personal-information-protection-act-pipa-updates-2025/)
- [Supabase Pricing & Free Tier Limits — supabase.com](https://supabase.com/pricing)
- [Supabase Pricing 2026 Breakdown — UI Bakery](https://uibakery.io/blog/supabase-pricing)
- [Vercel Pricing & Hobby Plan Limits 2026 — vercel.com](https://vercel.com/pricing)
- [Vercel Hobby Plan Documentation](https://vercel.com/docs/plans/hobby)
- [textsearch_ko mecab-ko PostgreSQL extension — GitHub i0seph](https://github.com/i0seph/textsearch_ko)
- [PostgreSQL Full-Text Search Documentation v18](https://www.postgresql.org/docs/current/textsearch-indexes.html)
- [pgfaceting roaring bitmap extension — GitHub cybertec-postgresql](https://github.com/cybertec-postgresql/pgfaceting)
- [Faceting large result sets in PostgreSQL — Cybertec](https://www.cybertec-postgresql.com/en/faceting-large-result-sets/)
- [Teaching Postgres to Facet Like Elasticsearch — ParadeDB](https://www.paradedb.com/blog/faceting)
- [How Crunchbase Gets Its Data — Bardeen.ai](https://www.bardeen.ai/answers/how-does-crunchbase-get-its-data)
- [Financial Details on Profiles (currency conversion) — Crunchbase Knowledge Center](https://support.crunchbase.com/hc/en-us/articles/39909512326547-Financial-Details-on-Profiles)
- [Adding Investors to a Funding Round — Crunchbase Knowledge Center](https://support.crunchbase.com/hc/en-us/articles/360011523313-Adding-Investors-to-a-Funding-Round)
- [Google Penalty Recovery Guide for Programmatic SEO Sites — SEOmatic](https://seomatic.ai/blog/google-penalty-recovery-process-programmatic-seo-sites)
- [Manual actions report — Google Search Console Help](https://support.google.com/webmasters/answer/9044175?hl=en)
- [Entity resolution for data aggregators — OpenCorporates blog](https://blog.opencorporates.com/2025/06/17/entity-resolution-for-data-aggregators/)
- [How to Normalize Company Names for Deduplication — Tilores / Medium](https://medium.com/tilo-tech/how-to-normalize-company-names-for-deduplication-and-matching-21e9720b30ba)
- [Audit Logging Best Practices — Sonar](https://www.sonarsource.com/resources/library/audit-logging/)
- [Audit Log Best Practices for Security & Compliance — Fortra](https://www.fortra.com/blog/audit-log-best-practices-security-compliance)
- [PitchBook Methodology — pitchbook.com](https://pitchbook.com/news/pitchbook-report-methodologies)

---
*Pitfalls research for: Korean/Asian startup intelligence platform (vc-co-finder)*
*Researched: 2026-04-20*
