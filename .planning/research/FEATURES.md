# Feature Research

**Domain:** Korean/Asian startup intelligence platform
**Persona:** Researcher / Journalist / Job-seeker (NOT investor)
**Researched:** 2026-04-20
**Confidence:** MEDIUM-HIGH (Crunchbase/PitchBook/Dealroom features verified via official docs; Korean platform features verified via WebSearch + secondary sources)

## Persona Anchoring

Throughout this document, "user value" is judged from the lens of:

- **Researcher (academic/think-tank/consulting):** needs broad coverage, exportable lists, time-series trends, data-source citations. Highly intolerant of unverified data.
- **Journalist:** needs fast company lookup, recent news context, exportable quotes/numbers, "competitor map" snapshots for stories.
- **Job-seeker:** needs growth signals (employee count trend, recent funding, news mentions), team/culture context, links to careers pages. Comparing 5-15 companies before applying.

All three share: **read-mostly, not write/transact, comparison-heavy, trust-sensitive, occasional return visit (not daily SaaS)**.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy for this persona.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Company search by name** (autocomplete, Korean+English) | Researcher's first action is "find Company X". Korean⇄English alias matching is a Korean-market non-negotiable (e.g. "토스" ⇄ "Toss" ⇄ "비바리퍼블리카") | M | Postgres trigram + full-text + alias table; "search-as-you-type" within ~100ms |
| **Company profile page with overview** (logo, 1-line desc, sector, HQ, founded, employees, status, founders) | Universal pattern across Crunchbase / PitchBook / 더브이씨 / 혁신의숲 — users will assume page is broken without it | S | Hero card with key facts; data-source + last-updated meta visible |
| **Funding round history table** (date, stage, amount, lead investor, participants) | Core reason these platforms exist. The 1순위 reason a journalist visits | M | Reverse-chronological; missing data shown as "비공개" not blank |
| **Faceted multi-condition filter** (sector, stage, region, employee count, cumulative funding, founded year) | THE differentiator per PROJECT.md, but also table stakes vs innoforest/더브이씨 — they all have it. Quality bar is "1초 이내 응답" | L | Postgres GIN indexes or Meilisearch; OR within facet, AND across facets (industry standard pattern) |
| **Active filter chips with X-to-remove + "Clear all"** | Faceted UX expectation since 2018 — without this, users get lost in filter state | S | Above results grid; mobile-critical |
| **Result count + sort options** (relevance, founded date, funding amount, employee count) | "76% of major ecommerce sites have filter usability issues serious enough to cause abandonment" — researchers need to verify their filter narrowed correctly | S | Display "1,234 companies match" prominently |
| **Data source attribution + last-updated timestamp** (per data point or section) | Korean-market non-negotiable for research/journalism. PROJECT.md explicitly calls this out. DART/더브이씨/사용자제보 must be labeled | S | "출처: DART · 2026-03-15 업데이트" footnote pattern |
| **5-year financial trend chart** (revenue, operating profit, assets, liabilities) | DART data is public — users expect anyone aggregating it to chart it. 혁신의숲 2.0 extended this from 3 to 7 years, raising the bar | M | Line chart preferred for trends; bar for single-year compare. Recharts/Visx |
| **Investor list per round** (with link to investor pages OR at minimum names) | Without this, funding data feels gutted. Even if v1 doesn't have investor profile pages, names must be present | S | Names as plain text in v1 → linked entities in v2 |
| **Mobile responsive read experience** | PROJECT.md explicitly requires; journalists check on mobile during reporting | M | Tailwind responsive + drawer-based filter UI on mobile |
| **Korean-first UI with proper number formatting** (억, 조 units, 한국어 날짜) | "10억원" not "1B KRW" — non-negotiable for Korean researchers | S | i18n keys + locale-aware Intl.NumberFormat with custom 억/조 logic |
| **Social login (Google + Kakao)** | Kakao login is table stakes for Korean B2C/freemium products. Forms-based signup feels dated | S | Supabase Auth supports both natively |
| **Watchlist (saved companies) for logged-in users** | Job-seekers tracking 5-15 target companies; researchers tracking sector cohorts. Crunchbase, 혁신의숲, 더브이씨 all gate this | S | Simple `user_watchlist(user_id, company_id, added_at)` table; RLS enforces |
| **Saved searches for logged-in users** | The faceted-search differentiator is wasted if users must rebuild the filter every visit | S | Serialize filter state as URL params + named save |
| **Email alert: new funding round on watched company** | The single most-cited alert use case across Crunchbase, Dealroom, 더브이씨. "Real-time" not needed — daily/weekly digest is fine for this persona | M | Cron job diffs new rounds against watchlists; Resend/Supabase email |
| **Pagination or infinite scroll on result lists** | Search results can return 1,000+ companies; no pagination = unusable | S | Cursor-based pagination preferred for stable URLs |
| **CSV/Excel export of search results** (gated behind login at minimum) | Researchers WILL leave for a competitor without this. Crunchbase Free has zero export — that's the feature the most complaints reference | M | Server-side stream; cap at e.g. 1,000 rows for free login tier |
| **Open Graph / SEO-friendly company URLs** | Journalists share URLs in articles; researchers cite URLs in papers | S | `/company/[slug]` with og:image (auto-generated card) |

### Differentiators (Competitive Advantage for Researcher Persona)

Features that set the product apart specifically for the **researcher/journalist/job-seeker** persona — not investors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Faceted smart search with cross-facet logic preview** ("filtering by Series B AND Seoul AND >50 employees → 47 companies") | THE differentiator per PROJECT.md. Quality bar = innoforest's filter is functional but visually noisy; PitchBook is powerful but paywalled | L | Live count update as facets toggle; debounced; URL-shareable filter state |
| **Side-by-side multi-company comparison** (3-5 companies, financial + funding + employee + traffic overlay) | Crunchbase Pro has this; 혁신의숲 highlights "최대 3년 비교"; PitchBook charges premium. For our persona this is a "must-have for the comparison job" | L | Tab/split view with stacked time-series charts; export comparison as PNG/PDF for journalists |
| **Time-series chart overlay across multiple companies** (revenue, employees, traffic on same X-axis) | "Compare growth of 토스 vs 카카오뱅크 vs 케이뱅크" is the canonical journalist task. Differentiator: most platforms force one chart per company | M | Recharts with normalization toggle (absolute vs % change from base) |
| **Public, SEO-indexed company pages with no login wall** | Crunchbase paywalls heavily; 더브이씨 also gates. Public pages → Google traffic → researcher acquisition flywheel | S | robots.txt + sitemap.xml + structured data (Organization JSON-LD) |
| **Deep-linkable filter URLs** (`?sector=fintech&stage=seriesB&region=seoul`) | Journalists embed filtered search URLs in articles ("이 기사에 등장한 핀테크 시드 라운드 18개사"); researchers reproduce queries in papers | S | URL state synchronization; copy-link button on filter bar |
| **"As-of date" toggle on time-series** (view historical state of company at a specific date) | Researchers writing about 2023 fintech wave need 2023 employee/funding state, not today's. Differentiator vs all current competitors | L | Requires storing historical snapshots, not just current state — pushes to v2 unless designed in from day 1 |
| **Sector trend dashboards** (aggregated funding by sector by quarter, regional breakdown) | Dealroom does this well; 혁신의숲 has "분석리포트" but as PDF. Differentiator = embeddable + filterable in-product | M | Pre-aggregated materialized views in Postgres; refresh nightly |
| **Aliases & rebranding history** ("비바리퍼블리카 → 토스") | Korean startups rebrand frequently; researchers/journalists confused by name mismatches in archives | S | `company_aliases(company_id, alias, valid_from, valid_to)` |
| **News/press mention feed per company** (curated or aggregated) | Journalists need recent context fast; researchers need citation sources. Differentiator if scoped to *Korean* media (플래텀, 아웃스탠딩, 바이라인네트워크) where global tools are weak | M | Start with RSS aggregation from 5-10 Korean tech outlets; fuzzy-match company names |
| **"Similar companies" suggestions** (by sector + stage + employee range) | Journalists writing competitive landscape; job-seekers exploring alternatives. Crunchbase has this; differentiator if Korea-aware | M | Embedding similarity OR rule-based (same sub-sector + closest funding stage) |
| **User-submitted corrections / missing-round form** | PROJECT.md commits to this. Researchers will *contribute* if it builds trust + their corrections appear visibly attributed | M | Lightweight form → admin queue → curator approves; "Updated based on user submission" badge |
| **Source-citation export** (when exporting CSV, include "source" + "as_of" columns) | Researchers cite in papers; journalists need provenance for fact-checking. Almost no competitor does this well | S | Append metadata columns to every export by default |
| **Bilingual company info (Korean + English fields)** | Asian-expansion users (Japanese/SG researchers studying Korea) and Korean researchers writing English papers both need this | M | Both fields on schema from day 1, even if v1 only fills Korean |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems — explicitly avoid in v1 (and possibly forever for this persona).

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **VC matching / dealflow workflow / "Connect with founder"** | Crunchbase Business plan pushes this hard | Wrong persona — our user is NOT investor. Builds the wrong product reputation, attracts wrong audience, distracts roadmap | Out of scope per PROJECT.md; if added, separate product |
| **Direct messaging between users** | "Network with other researchers" sounds nice | Moderation cost, spam, abuse risk, near-zero usage by read-mostly persona | Email alerts + public profile pages instead. No DM. |
| **User-generated company reviews / ratings (Glassdoor-style)** | "Help job-seekers!" | Defamation risk, low signal (small N), dilutes data-platform positioning, opens moderation rabbit hole | Link out to 잡플래닛/Glassdoor instead |
| **Real-time websocket data feed / "live" stock-style ticker** | Looks impressive in demos | Researchers don't need realtime — daily/weekly batch is correct (PROJECT.md confirms). Adds infra cost + complexity | Daily ETL with clear "마지막 업데이트" timestamps |
| **Natural-language / LLM semantic search in v1** | AI hype | Researchers explicitly trust manual filters more (PROJECT.md decision). LLM search hallucinates entities, hard to debug "why didn't X appear" | Faceted filter as v1 ONE thing; revisit LLM in v2 as filter-builder assistant only |
| **Founder/exec personal profile pages with full career history** | "LinkedIn-but-for-startups" temptation | Privacy risk under PIPA, scrape ToS issues, low researcher value vs cost. Job-seekers can use LinkedIn directly | Limit person data to "executives as listed in 공시" only; no separate person profiles in v1 |
| **AI-generated company summaries** (auto-write the 1-line description) | Scales content quickly | Hallucination risk destroys trust — the ONE thing this persona will not forgive. PROJECT.md emphasizes trust | Curator-written or DART-extracted descriptions only; if AI-assisted, clearly labeled "AI 생성" + reviewed |
| **Public job posting board** | "Help job-seekers find jobs!" | Wanted/LinkedIn dominate this; competing is suicide. Out of scope per PROJECT.md | External link button: "채용 공고 보기 →" (deeplink to company's careers page or 원티드) |
| **Native mobile apps (iOS/Android) in v1** | "Mobile-first 2026" | Read-only persona served fine by responsive web. Native = 3x dev cost, app store approval friction, push notification infra | PWA with installable prompt; native deferred indefinitely |
| **Crowd-sourced editing wiki-style** | "Wikipedia of startups" | Vandalism, spam, requires moderator team day 1 — burns runway | Structured submission form → admin review queue (per PROJECT.md) |
| **Discussion forum / comments per company** | "Community engagement" | Moderation tax, off-topic drift, often becomes promotional spam from companies themselves | Out of scope; researchers communicate elsewhere (Twitter/X, Brunch, Slack) |
| **Price/payment integration in v1** | "Monetize early" | PROJECT.md explicitly: 결제는 v2. v1 = build trust + traffic flywheel via free tier first | Login-gated premium features (export, alerts, watchlist) without payment |
| **Investor-side workflow (LP reporting, deal pipeline)** | Adjacent revenue | Wrong persona, different SaaS category (Affinity, Salesforce alternatives). Distracts focus | Hard pass; could be separate product later |

## Feature Sub-Domain Deep-Dives

### 1. Search & Discovery

**Filter dimensions to expose in v1 (faceted):**

| Dimension | Type | Source | Notes |
|-----------|------|--------|-------|
| Sector / sub-sector | Multi-select hierarchical | Curated taxonomy | Borrow Dealroom-style "50 primary + sub" but Korea-tuned. Don't invent from scratch — start with 더브이씨 categories + adjust |
| Funding stage | Multi-select | 더브이씨 / DART / curated | Pre-seed, Seed, Pre-A, Series A-D, Pre-IPO, IPO, M&A, Undisclosed/비공개 |
| Region (시/도, 시/군/구 level) | Multi-select hierarchical | DART (HQ address) | 서울 → 강남구, 경기 → 성남시 등 |
| Employee count band | Range slider with bands | 공시 / NPS data / scraped | 1-10 / 11-50 / 51-200 / 201-500 / 500+ |
| Cumulative funding (KRW) | Range slider | Sum of rounds | 0-1억 / 1-10억 / 10-100억 / 100-1000억 / 1000억+ |
| Founded year | Range slider | DART | 1995-current; default last 10 years |
| Latest round date | Date range | 더브이씨 / 공시 | "Companies that raised in last 12 months" is the canonical journalist filter |
| Company status | Multi-select | Curated | 운영중 / 폐업 / 인수됨 / IPO 완료 |
| Has revenue >X | Boolean threshold | DART | Useful filter for "real businesses" subset |

**Sort options:** Relevance (default for query), Latest funding date, Cumulative funding, Founded date (newest/oldest), Employee count, Recent news activity.

**Saved searches & alerts:** TABLE STAKES (login-gated). Alert types: new funding round on saved company, new company matching saved filter, employee count threshold crossed, news mention spike. Channel = email (daily/weekly digest); Slack/webhook is v2.

**Search-as-you-type:** TABLE STAKES for the company name search box (top-of-page autocomplete). NOT needed for faceted filters (they update result count on toggle, which is the equivalent).

### 2. Company Profile Page

Recommended section order (top to bottom), based on Crunchbase, PitchBook, 혁신의숲, 더브이씨 conventions:

1. **Hero / About** — Logo, name (KO + EN), 1-line description, sector tags, HQ city, founded, status, current employee count, total funding raised, last-updated timestamp
2. **Key metrics summary** (small-multiple sparklines) — Revenue, Employees, Funding rounds count, Web traffic — clickable to jump to detail section
3. **Funding rounds** — Reverse-chronological table; expandable rows for investor list per round
4. **Financials** (5-year time-series charts) — Revenue, Operating profit, Assets, Liabilities (DART data); each chart has "출처: DART · 분기/연간"
5. **Service/Traffic metrics** — Web traffic trend, App MAU (if available), Employee count over time
6. **Team / Executives** (공시 기준) — Limited to publicly-disclosed exec list; no full LinkedIn-style profiles
7. **News & mentions** — Aggregated press mentions (Korean tech media), 5-10 recent items
8. **Similar companies** — 4-6 cards based on sector + stage + employee range
9. **Sources & corrections** — Footer block listing all data sources + "데이터 수정 제보" link

Density: PitchBook-dense (lots of data above fold) is more researcher-appropriate than Crunchbase-airy. Borrow PitchBook density + Linear/Stripe visual polish per PROJECT.md.

### 3. Funding/Round Display

**Round stage taxonomy (for v1):**

```
Pre-Seed → Seed → Pre-A → Series A → Series B → Series C → Series D → Series E+ →
Pre-IPO / Bridge → IPO → Post-IPO → M&A
+ "Convertible Note", "SAFE", "Grant" (정부지원금), "Crowdfunding", "Undisclosed/비공개"
```

**Visualization choices:**
- **Vertical timeline** (newer-on-top) for the round list — most common pattern, easy to scan
- **Cumulative funding curve** (small chart) for at-a-glance trajectory
- **Investor relationship graph** — DIFFERENTIATOR but L complexity; defer to v2
- **Round size distribution by stage** — relevant for sector dashboards, not company page

**Handling missing/inferred data:**
- "비공개" badge for known-but-undisclosed amounts (e.g., DART filing exists but amount redacted)
- "추정치" badge for inferred figures (italicized number with tooltip explaining inference)
- Empty rows ALLOWED — shown as "정보 없음" with submit-correction CTA, NOT hidden
- Data lineage: every round must have at least one source citation

### 4. Financial Visualization

- **Chart types:** Line for trend (revenue, profit over time), Bar for single-period compare, Area for cumulative funding. AVOID pie/donut (low information density for researchers)
- **5-year default range, with toggle for 3/7/10 years** (혁신의숲 2.0 supports up to 7)
- **Y-axis units:** 억원 (default), with toggle to 만원 / 백만원 for small companies
- **Comparison overlay (multi-company):** core differentiator — must work for revenue, profit, employees, traffic
- **Normalization toggle:** absolute (KRW values) vs indexed (% change from base year) — critical for comparing companies of different sizes
- **Export chart as PNG** — journalists embed in articles
- **Source watermark on chart export** — "출처: vc-co-finder · DART 데이터" reinforces brand on shared images

### 5. Traffic / Service Metrics

**Sourcing reality:**
- SimilarWeb has paid API (DaaS), free tier limited and rate-capped
- App store data (Sensor Tower, App Annie) is expensive
- Proxy signals: company's own IR reports, press releases citing MAU, public open job count

**v1 recommendation:** Start with employee count trend (scrapeable from job boards / 공시 / NPS data) — it's the most credible growth signal AND cheapest. Web traffic = MEDIUM priority, app MAU = defer to v2.

**Accuracy disclosure:** ALWAYS label estimate vs actual. "추정" badge + tooltip explaining methodology. Researchers WILL leave if traffic numbers feel made up.

### 6. Comparison View

**Verdict: TABLE STAKES (not just differentiator)** for this persona. Crunchbase locks it behind Pro; 혁신의숲 highlights it as a top feature; PitchBook charges for it. Free public side-by-side comparison would be a meaningful wedge.

Implementation:
- 2-5 companies maximum
- Sticky left column = metric name; columns = companies
- Sections collapsible (basics, funding, financials, employees, traffic)
- Time-series charts overlay all selected companies in one chart
- Shareable URL: `/compare?companies=toss,kakaobank,kbank`
- Export: PNG (image), PDF (full report), CSV (raw data)

### 7. Watchlists & Alerts

**List management UX:**
- Single default "내 관심 기업" list for v1 (multiple lists = v1.x)
- Inline "♡ 저장" button on every company card and profile page
- Watchlist page: sortable table view + summary stats (total funding, latest round across list)

**Alert triggers (v1):**
- New funding round on watched company
- New company matches saved search criteria
- (v1.x) Employee count milestone crossed (e.g., +50% YoY)
- (v1.x) News mention spike

**Channels:** Email (Resend or Supabase email) only in v1. Slack/webhook/Push = v2.

### 8. Data Export

**Verdict: TABLE STAKES for researchers.** This is the #1 missing-feature complaint about Crunchbase Free.

**Tier proposal (consistent with PROJECT.md "v1은 무료, 결제는 v2"):**
- **Anonymous / no login:** view but no export
- **Logged-in (free):** CSV export up to 1,000 rows, Excel up to 500 rows. Watermark with "vc-co-finder · 출처 표기 필수" line at top of CSV
- **v2 paid tier:** higher limits, API access

**Export formats:**
- CSV (UTF-8 with BOM for Excel-Korean compatibility) — non-negotiable for Korean users
- Excel (.xlsx) with formatted columns
- (v1.x) JSON for technical users

**Always include source/as-of columns** — researcher trust differentiator.

### 9. News / Mentions Aggregation

**Decision:** Include in v1 BUT scope tightly to Korean tech media to be a real differentiator vs global tools.

**Approach:**
- v1: RSS-poll 8-12 Korean outlets (플래텀, 아웃스탠딩, 바이라인네트워크, 더밀크, 한국경제 스타트업, 매경 벤처, ZDNet Korea, 디지털타임스, etc.)
- Fuzzy-match company name + alias against article title/body
- Display 5-10 recent mentions per company with source/date/excerpt
- Link out to original article (no scraping full content — copyright)
- **Anti-feature:** do NOT republish full articles; do NOT auto-summarize with LLM in v1

### 10. Investor Pages

**Verdict: SKIP for v1, plan schema for v2.**

Rationale: PROJECT.md persona = researcher/journalist/job-seeker, NOT investor. Investor profile pages primarily serve other-investors. For v1, show investor names as plain text in funding rounds; the schema should already model investors as entities so v2 can light up profile pages without migration.

Schema readiness:
```
investors (id, name, type{VC|CVC|Angel|GovFund|Accelerator}, hq_country, founded, ...)
funding_round_investors (round_id, investor_id, role{lead|participant})
```

When investor pages ship (v2): portfolio list, sector focus heatmap, co-investor graph, recent activity timeline.

### 11. Trends / Sector Reports

**Verdict: DIFFERENTIATOR (not table stakes) for this persona.**

Rationale: Dealroom does it best (sector signal algorithm); 혁신의숲 publishes PDF reports. The differentiator opportunity = **interactive in-product dashboards** where researchers/journalists can drill into the chart that informs their story.

**v1 scope (small):**
- Total funding by sector by quarter (stacked bar)
- Round count by stage by quarter
- Top-10 most-funded companies by sector (filterable)
- Embeddable charts (iframe with attribution) for journalists/bloggers

**v1.x:** Auto-generated quarterly Korea startup funding report (PDF + web), cited as "based on vc-co-finder data" → builds backlinks → SEO flywheel.

**Defer:** ML-driven "rising sector" prediction (Dealroom's Sector Signal). Risk of false signals damages trust.

### 12. Authentication & Premium Gating

**Freemium-with-social-proof boundaries (no payment in v1):**

| Feature | Anonymous (no login) | Logged-in (free) | v2 Paid |
|---------|---------------------|------------------|---------|
| Search + faceted filters | YES | YES | YES |
| View company profile | YES | YES | YES |
| View time-series charts | YES | YES | YES |
| View news mentions | YES | YES | YES |
| Side-by-side comparison (up to 3) | YES | YES (up to 5) | YES (up to 10) |
| Watchlist | NO | YES | YES |
| Saved searches | NO | YES (up to 5) | YES (unlimited) |
| Email alerts | NO | YES (daily digest) | YES (real-time) |
| CSV/Excel export | NO | YES (1,000 rows) | YES (10,000+ rows) |
| API access | NO | NO | YES |
| Sector dashboards | YES (read) | YES (filter) | YES (custom + export) |
| User correction submissions | YES (rate-limited) | YES | YES |

**Why search is fully public:** SEO indexing → Google traffic → user acquisition. PROJECT.md confirms this approach.

**Why export gated behind login (free):** Captures email for alert opt-in; meaningful conversion gate without payment friction.

### 13. Korean-Market Specific Norms

| Feature | Korean Norm | Differs From Western |
|---------|------------|----------------------|
| Login providers | Kakao + Naver expected; Google secondary | Western = Google + GitHub primary |
| Number formatting | 억/조 units, comma every 4 digits in casual writing | Western = K/M/B, comma every 3 |
| Company name | Both 법인명 (비바리퍼블리카) and 서비스명 (토스) needed | Western = mostly single brand |
| Address | 시/도 → 시/군/구 → 읍/면/동 hierarchy | Western = state → city → street |
| Funding stage | "Pre-A" is common in Korea, less in West | Stage taxonomy must include it |
| Data source trust | DART (정부) > 더브이씨 (민간) > 추정치 — explicit trust hierarchy | Western users less anchored on government source |
| "검증된 데이터" badge | Government-data-sourced fields can carry trust badge | Less common in Western platforms |
| Mobile share to KakaoTalk | Sharing to KakaoTalk = primary distribution channel | Western = Twitter/X, LinkedIn |

## Feature Dependencies

```
[Faceted Search]
    └──requires──> [Company taxonomy + sector tags]
                       └──requires──> [Curated sector taxonomy decision]
    └──requires──> [Search index (Postgres FTS or Meilisearch)]
    └──enables──> [Saved Searches]
                       └──requires──> [Auth/Login]
                       └──enables──> [Email Alerts]

[Company Profile Page]
    └──requires──> [Company data ETL]
                       └──requires──> [DART pipeline]
                       └──requires──> [더브이씨 / curated investment data]
    └──requires──> [Data source attribution model] (cross-cutting)
    └──enables──> [Watchlist]
                       └──requires──> [Auth/Login]
    └──enables──> [Comparison View]

[Comparison View]
    └──requires──> [Time-series chart component]
    └──requires──> [Normalization toggle logic]
    └──enables──> [Shareable comparison URLs]

[CSV Export]
    └──requires──> [Auth/Login (gating)]
    └──requires──> [Server-side stream w/ row limits]
    └──requires──> [Source citation columns]

[News Aggregation]
    └──requires──> [RSS poller infrastructure]
    └──requires──> [Company alias matching]
    └──enables──> [News mention alert trigger] (v1.x)

[Sector Dashboards]
    └──requires──> [Pre-aggregated materialized views]
    └──requires──> [Sector taxonomy stable]

[Investor Pages] (v2)
    └──requires──> [Investor entity schema] (build in v1, render in v2)
    └──requires──> [Funding round → investor link table]
```

### Dependency Notes

- **Sector taxonomy is the keystone:** Many features depend on it (filter, similar-companies, sector dashboards, news matching). Lock taxonomy v1 BEFORE building features that depend on it. Borrow + adapt 더브이씨's taxonomy rather than invent.
- **Data source attribution is cross-cutting:** Must be designed into schema from day 1. Retrofitting source/as-of fields onto every entity is painful.
- **Auth gates the full "logged-in feature stack":** Watchlist, saved searches, alerts, export all require auth — ship auth early in roadmap.
- **Investor schema in v1 even though investor pages defer:** Modeling investors as entities (not text blobs) in v1 prevents painful migration when investor pages ship in v2.
- **News aggregation depends on alias-matching quality:** If aliases are weak, news matching produces noise. Build alias system before turning on news aggregation publicly.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate "researcher will return weekly" hypothesis.

- [ ] **Search by company name** with Korean+English alias autocomplete — entry point
- [ ] **Faceted multi-condition filter** (sector, stage, region, employee, funding, founded year) with active chips, result count, URL state — THE differentiator
- [ ] **Company profile page** with Hero/Funding/Financials (5yr)/Employees/News/Similar sections — core read experience
- [ ] **5-year time-series charts** for revenue, profit, employees — credibility
- [ ] **Funding round table** with stage taxonomy + investor names + missing-data handling — core data
- [ ] **Side-by-side comparison view (up to 5 companies)** with overlay charts — researcher's job-to-be-done
- [ ] **Public, SEO-indexed company URLs** — acquisition flywheel
- [ ] **Data source + last-updated badges everywhere** — trust
- [ ] **Korean-first UI with proper 억/조 formatting** — basic table stakes
- [ ] **Social login (Kakao + Google)** — Korean expectation
- [ ] **Watchlist** (single default list) — login conversion gate
- [ ] **Saved searches** (up to 5) — repeat-use loop
- [ ] **Email alert: new funding round on watched company** (daily digest) — return mechanism
- [ ] **CSV/Excel export** (logged-in, 1,000 row cap) — researcher non-negotiable
- [ ] **News mention feed per company** (8-12 Korean outlets, RSS-based) — journalism differentiator
- [ ] **User correction submission form** — trust + community signal
- [ ] **Mobile responsive** (drawer-based filter on mobile) — table stakes
- [ ] **Sector dashboard (basic)** — total funding by sector by quarter — bonus credibility

### Add After Validation (v1.x)

Features to add once core is working and user behavior is observed.

- [ ] **Multiple watchlists per user** — once power users emerge
- [ ] **Slack/webhook alert channel** — once API users exist
- [ ] **Embeddable charts (iframe)** — once journalist usage is observed
- [ ] **Quarterly Korea startup funding report (PDF)** — backlink/SEO play once data depth is sufficient
- [ ] **Web traffic trend integration (SimilarWeb)** — once budget allows the API
- [ ] **App MAU integration** — once data partnerships are negotiated
- [ ] **Investor name → entity normalization (linked but no profile page yet)** — preparation for v2
- [ ] **Employee count milestone alerts** — once employee data is reliable
- [ ] **News mention spike alerts** — once news matching quality is validated
- [ ] **Filter preset bundles** ("최근 1년 시리즈A 핀테크" one-click) — UX polish
- [ ] **English UI toggle** (i18n keys exist from v1 — flip on when content translated)

### Future Consideration (v2+)

Features to defer until product-market fit is established and v2 unlocks paid tier infrastructure.

- [ ] **Investor profile pages with portfolio visualization** — defer until investor persona research validates
- [ ] **Investor relationship/co-investor graph** — visually impressive but L complexity, niche use
- [ ] **"As-of date" historical state of company** — research-killer feature but requires snapshot schema redesign
- [ ] **LLM-assisted filter builder** ("핀테크 시드 받은 50명 미만 기업" → faceted filter prefill) — only after manual filter is mature and trusted
- [ ] **Paid tier with payment integration** — when free tier validates value
- [ ] **API access** — when paid tier exists
- [ ] **Asian market expansion (Japan, SG, SEA)** — schema ready in v1, content fills in v2+
- [ ] **Custom alert recipes** (combine triggers) — power-user feature
- [ ] **Native mobile apps** — likely never; PWA suffices

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Faceted multi-condition filter | HIGH | HIGH | P1 |
| Company profile page | HIGH | MEDIUM | P1 |
| 5-yr financial time-series | HIGH | MEDIUM | P1 |
| Funding round table | HIGH | MEDIUM | P1 |
| Side-by-side comparison | HIGH | HIGH | P1 |
| Data source + as-of badges | HIGH | LOW | P1 |
| Korean-first UI (억/조, Kakao login) | HIGH | LOW | P1 |
| Watchlist + saved searches | HIGH | LOW | P1 |
| Email alert (new round) | HIGH | MEDIUM | P1 |
| CSV/Excel export | HIGH | MEDIUM | P1 |
| News mention feed (KR media) | MEDIUM | MEDIUM | P1 |
| Public SEO-indexed URLs | HIGH | LOW | P1 |
| User correction form | MEDIUM | LOW | P1 |
| Mobile responsive | HIGH | MEDIUM | P1 |
| Basic sector dashboard | MEDIUM | MEDIUM | P1-P2 |
| Multiple watchlists | LOW | LOW | P2 |
| Embeddable charts | MEDIUM | MEDIUM | P2 |
| SimilarWeb traffic data | MEDIUM | HIGH (cost) | P2 |
| Investor entity schema (no UI) | HIGH (future) | LOW | P1 (schema only) |
| Investor profile pages | LOW (this persona) | HIGH | P3 |
| LLM semantic search | LOW | HIGH | P3 |
| Native mobile apps | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1 launch
- P2: Should have, add when possible (v1.x)
- P3: Future consideration (v2+)

## Competitor Feature Analysis

| Feature | Crunchbase | PitchBook | innoforest | 더브이씨 | Our Approach |
|---------|------------|-----------|------------|---------|--------------|
| Public free search | Limited filters | Heavily paywalled | Free with login | Free with login | Fully public faceted search (SEO play) |
| Faceted filter depth | Strong (Pro) | Strongest (paid) | Moderate | Moderate | Match Pro depth, free + better UX |
| Comparison (multi-co) | Pro feature | Premium | Up to 3, basic | Limited | Free up to 5, with overlay charts |
| Time-series charts | Limited | Strong | 3yr (now 7yr v2.0) | Strong (7yr) | 5yr default, 3/7yr toggle, multi-co overlay |
| News per company | YES (signals) | YES | Limited | YES | KR-media-tight curation (differentiator) |
| Watchlist | Free | Premium | Free with login | Free with login | Free with login |
| Saved searches | Pro | Premium | Limited | YES | Free with login (up to 5) |
| Email alerts | Pro | Premium | Limited | YES | Free with login (daily digest) |
| CSV export | Pro (2K rows) | Premium | Limited | Limited | Free with login (1K rows) |
| Investor pages | YES | YES | YES | YES | Schema ready in v1, UI in v2 |
| Sector dashboards | Limited | YES | PDF reports | YES | Interactive in-product (differentiator) |
| Korean coverage depth | Weak | Weak | Strong | Strongest | Match 더브이씨 depth |
| Asian coverage | Weak (US-centric) | Moderate | Korea-only | Korea-mostly | Korea-strong + JP/SG/SEA seed |
| API access | Pro | Premium | Limited | Limited | v2 paid tier |
| Korean number formatting | NO | NO | YES | YES | YES, plus alias resolver |
| Source attribution | Weak | Strong | Moderate | Moderate | Strong (per data point) |

**Wedge summary:** Public + free + Korean-first + faceted-search-best-in-class + comparison-without-paywall + source-trust + Korean-news-aware. The persona (researcher/journalist/job-seeker) is underserved because every competitor optimizes for investors or PR.

## Key Strategic Tensions

1. **Trust vs Coverage:** More data = more chance of errors. For this persona, "fewer companies done well" beats "10x companies with stale/wrong data". Recommend launching with 5K well-curated companies before pushing to 10K.

2. **Free public search vs Conversion gate:** PROJECT.md commits to public search (correct for SEO/acquisition). The gate must be at "save/export/alert" — features power users actually want.

3. **Differentiator depth vs MVP scope:** Faceted search is THE differentiator. Don't ship a mediocre version of it just to ship. Better to defer comparison view than to ship a weak filter UX.

4. **Korean-first vs Asian-ready schema:** v1 ships Korean only, but schema must support multi-country from day 1 (country code, locale-aware fields). Otherwise v2 expansion = rewrite.

5. **News aggregation copyright vs value:** Keep mention feed = title + 1-line excerpt + outbound link. Never republish full content. Some Korean outlets are aggressive about scraping — outreach for partnership > guerrilla scraping.

## Sources

### Primary Competitor Documentation
- [Crunchbase Free vs Paid features (Crunchbase Knowledge Center)](https://support.crunchbase.com/hc/en-us/articles/360062989313-What-is-the-Difference-between-a-Free-Crunchbase-Account-and-Crunchbase-Paid-Subscriptions)
- [Crunchbase Set Up Alerts](https://support.crunchbase.com/hc/en-us/articles/25315764808467-Set-Up-Alerts)
- [Crunchbase Set Up and Manage Alerts (Pro)](https://support.crunchbase.com/hc/en-us/articles/115010462027-Set-Up-and-Manage-Your-Alerts-using-Crunchbase-Pro)
- [Crunchbase Export to CSV](https://support.crunchbase.com/hc/en-us/articles/115010610787-Export-to-CSV)
- [Crunchbase CSV Export FAQ](https://support.crunchbase.com/hc/en-us/articles/32197713858195-CSV-Export-FAQ)
- [Crunchbase Navigating a Company Profile](https://support.crunchbase.com/hc/en-us/articles/360052260893-Navigating-a-company-profile-on-Crunchbase)
- [Crunchbase New Profile Design](https://about.crunchbase.com/blog/new-crunchbase-profile-design)
- [Crunchbase Pricing 2026 (G2)](https://www.g2.com/products/crunchbase/pricing)
- [Crunchbase Pricing Review 2026 (EasyVC)](https://easyvc.ai/vs/crunchbase-pricing/)

### Korean Platforms
- [혁신의숲 (InnoForest)](https://www.innoforest.co.kr/)
- [혁신의숲 데이터룸](https://www.innoforest.co.kr/dataroom)
- [혁신의숲 분석리포트](https://www.innoforest.co.kr/report)
- [혁신의숲 2.0 공개 (플래텀, 2025)](https://platum.kr/archives/267893)
- [혁신의숲 데이터 출처 (아웃스탠딩)](https://outstanding.kr/innoforest20220823)
- [더브이씨 (THE VC)](https://thevc.kr/)
- [더브이씨 사용 가이드](https://guide.thevc.kr/)
- [더브이씨 회사 소개](https://www.thevc.team/)
- [더브이씨-넥스트유니콘-혁신의숲 비교 (아웃스탠딩)](https://outstanding.kr/startupdatabase20220318)
- [한국 스타트업 정보 사이트 7곳 (Brunch)](https://brunch.co.kr/@ashashash/53)

### Other Platforms
- [PitchBook Company Profiles](https://pitchbook.com/)
- [Dealroom.co](https://dealroom.co/)
- [Dealroom Solutions](https://dealroom.co/solutions/)
- [Dealroom Reports](https://dealroom.co/reports)
- [Tracxn vs Crunchbase vs Dealroom vs PitchBook vs CB Insights](https://www.reviewadda.com/institute/article/518/tracxn-vs-crunchbase-vs-dealroom-vs-pitchbook-vs-cb-insights)
- [Startup Database Comparison 2026 (BounceWatch)](https://bouncewatch.com/blog/startup-analysis/startup-database-comparison-2026)

### Data Sources
- [DART 전자공시시스템](https://dart.fss.or.kr/)
- [DART 보고서 정보](https://dart.fss.or.kr/introduction/content2.do)
- [OpenDartReader (GitHub)](https://github.com/FinanceData/OpenDartReader)
- [SimilarWeb Data Methodology](https://support.similarweb.com/hc/en-us/articles/360001631538-Similarweb-Data-Methodology)
- [SimilarWeb Data Partnerships](https://www.similarweb.com/corp/daas/data-partnerships/)
- [SimilarWeb Web Traffic API](https://developers.similarweb.com/docs/similarweb-web-traffic-api)

### UX Patterns
- [Faceted Search Best Practices 2026 (BrokenRubik)](https://www.brokenrubik.com/blog/faceted-search-best-practices)
- [Ecommerce Filter UX 2026 (BTNG.studio)](https://www.btng.studio/articles/top-ecommerce-ux-filter-design-patterns-practical-tips-for-2025/)
- [Faceted Filtering UX (LogRocket)](https://blog.logrocket.com/ux-design/faceted-filtering-better-ecommerce-experiences/)
- [Filter UI Patterns 2026 (Bricxlabs)](https://bricxlabs.com/blogs/universal-search-and-filters-ui)
- [Advanced Search UX 2026 (UXPin)](https://www.uxpin.com/studio/blog/advanced-search-ux/)

### Funding Stage Taxonomy
- [Startup Funding Stages (Visible.vc)](https://visible.vc/blog/startup-funding-stages/)
- [Startup Funding Rounds Pre-Seed to IPO (Qubit Capital)](https://qubit.capital/blog/startup-funding-rounds-guide)
- [Series A B C D E Funding (Startups.com)](https://www.startups.com/articles/series-funding-a-b-c-d-e)

---
*Feature research for: Korean/Asian startup intelligence platform — researcher/journalist/job-seeker persona*
*Researched: 2026-04-20*
