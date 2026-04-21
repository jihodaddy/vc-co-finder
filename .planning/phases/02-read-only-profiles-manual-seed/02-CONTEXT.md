# Phase 2: Read-Only Profiles + Manual Seed — Context

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Mode:** discuss (interactive; Provenance/Layout area covered in depth — remaining areas delegated to Claude's Discretion)

<domain>
## Phase Boundary

Deliverable: A researcher can visit `/ko/companies/[slug]` for any of 50–200 manually-curated Korean startups and read (a) a Hero with logo + name_ko + name_en + sector + HQ + one-liner + website, (b) current/former Korean aliases, (c) a funding-round table using the full Phase 1 `funding_stage` taxonomy with 억/조 KRW formatting and USD conversion, (d) primary identifiers (corp_code / 사업자번호 / domain). Every numeric fact renders an inline "출처: [DART|수동] · YYYY-MM-DD 업데이트" badge with a freshness dot (green/yellow/red on ≤30/≤180/>180-day thresholds). Page is ISR-rendered with 1-hour revalidate; 375 px mobile viewport is first-class.

**In scope (Phase 2):**
- `/[locale]/companies/[slug]` route under `(public)` route group (ISR, 1 h revalidate, locale-aware)
- Hero section (PROF-02): logo, display_name_ko / _en, sector tag, hq_address, description_ko one-liner, website_url
- Funding-round table (PROF-03): full `funding_stage` ENUM rendering, KRW + USD, lead vs participant investors
- Korean alias list (PROF-10): current + former names surfaced from `public.aliases`
- Inline source badge + freshness dot on every fact (TRUST-04, TRUST-05)
- 한국 통화 포맷 헬퍼 (PROF-11): 원 → 만/억/조 rendering helper under `src/lib/format/`
- Mobile responsive at 375 px (PROF-08)
- 50–200 seed companies committed via a seed mechanism of the planner's choosing, every row pointing to a `data_sources` row of `source_type = 'manual'`
- `src/lib/data/companies.ts` read wrapper that joins `public.data_sources` and returns `WithMeta<Company>` (consuming the Phase 1 `lib/data/_meta.ts` infra)
- "데이터 완전성을 보장하지 않습니다" disclaimer verified on every company page via the existing `Footer` component

**Out of scope (other phases):**
- `/search` or any listing/filter page (Phase 3)
- Time-series charts — revenue / op income / assets / employees (Phase 6)
- Similar companies, news mentions (Phase 6 / 7)
- DART ETL that fills `funding_rounds` from real filings (Phase 4a)
- Admin curation UI that would let us edit seed via browser (Phase 4b)
- Watchlist ♡ button wiring (Phase 4c — schema exists, UI lands then)
- SEO JSON-LD, sitemap, noindex-thin policy (Phase 8)

</domain>

<decisions>
## Implementation Decisions

### D-01 — TRUST-04 Source-Badge Placement & Style

**Decision:** **Inline per-fact** pill rendered immediately after every numeric fact, alias row, funding-round cell, and identifier value on `/companies/[slug]`.

**Shape:**
- Text: "출처: {sourceLabel} · {YYYY-MM-DD} 업데이트"
  - `sourceLabel` maps from `_meta.sourceType` via a translation helper (e.g., `dart → 'DART'`, `manual → '수동 큐레이션'`, `user_submission → '사용자 제보'`).
  - Date is `_meta.lastVerifiedAt` formatted with `date-fns` + Korean locale (not `updated_at`, per TRUST-02 / Phase 1 D-03.9).
- Style: small neutral pill (~11 px text, low-contrast gray fill), left-aligned beside the fact. Stripe/Linear tone per PROJECT.md — no color by default.
- Badge text flows through `next-intl` `t()`; no hardcoded Korean in JSX (Phase 1 D-05.4).

**Why:** Researchers judge trust at the fact level, not the page level (PITFALLS #3, TRUST-04 verbatim). The Phase 1 `WithMeta<T>` pattern already carries per-row provenance — inline rendering is the shortest path. Section-level summaries hide which specific round / alias came from which source.

**How to apply:**
- `src/components/profile/SourceBadge.tsx` (new) takes a `SourceMeta` and renders pill + dot.
- Consumed by Hero, funding-round rows, alias rows, identifier rows.
- When multiple facts in one row share the same source (e.g., a whole funding round), render ONE badge on the row — not one per cell — to keep density low.

### D-02 — TRUST-05 Freshness-Dot Thresholds & Position

**Decision:** **30 / 180-day thresholds + per-fact dot embedded inside the SourceBadge.**

- `diffInDays(now, lastVerifiedAt) ≤ 30` → green (#16a34a or Tailwind `text-green-600`)
- `≤ 180` → amber (`text-amber-500`)
- `> 180` → red (`text-red-600`)
- Dot renders as 6 px (`h-1.5 w-1.5`) filled circle **inside** the badge, to the left of "출처:" text. Keeps the fact line visually tight and avoids a second UI element competing for the reader's eye.

**Why:** Thresholds mirror ROADMAP § Phase 2 success criteria #2 verbatim. Per-fact placement matches D-01 — the whole point is "this specific number is fresh / stale". 90/365 was considered and rejected: Phase 2 is manual curation, so dates will be mostly < 180 days; using 90/365 would make the indicator mostly green and trust-useless later when DART data arrives with older `last_verified_at` values.

**How to apply:**
- Helper `freshnessColor(lastVerifiedAt: string): 'green'|'amber'|'red'` lives in `src/lib/data/freshness.ts` (server-only OK).
- `SourceBadge` reads color and applies Tailwind class. No direct hex literals.
- Unit test covering the two boundary days (30, 180) + today + >180.

### D-03 — Company Page Section Order

**Decision:** **Hero → 별칭 (Aliases) → 투자 라운드 (Funding rounds) → 식별자 (Identifiers).**

1. **Hero** — logo + name_ko + name_en + sector tag + HQ + one-liner + website. Builds recognition in one glance.
2. **Aliases** — current + past Korean names (브랜드 / 법인명 / 영문명 with valid_from/valid_to annotation). Positioned second so the researcher instantly confirms "토스 = 비바리퍼블리카" before reading financials.
3. **Funding rounds** — full taxonomy table. Core commercial signal.
4. **Identifiers** — corp_code / 사업자등록번호 / domain. Placed last as "look deeper" detail, not headline content.

**Why:** A researcher's first cognitive question on a profile is "is this the right entity?" (identity) — aliases answer it fastest (pitfall #8 is specifically about Korean identity plurality). Funding rounds are the primary signal once identity is confirmed. Identifiers are a credibility marker that supports the data rather than leading it. Tab layout was rejected because URL-state sharing is only solved generally in Phase 3 (nuqs); tab state on a profile page without URL persistence breaks the sharing muscle we want researchers to build.

**How to apply:**
- Single-column linear layout (no tabs). Section headings visible; `<section id="...">` so future in-page anchors (`#funding-rounds`) work.
- Sticky Hero on desktop (optional for planner) but content order is fixed.
- Mobile (375 px): sections stack in the same order; Hero can collapse the one-liner after ~2 lines with `line-clamp` but alias/funding/identifier sections are fully visible.

### D-04 — Handling of Sections That Arrive in Later Phases

**Decision:** **Phase 2 simply omits Phase 4a / 6 / 7 sections.** The page contains only Hero / Aliases / Funding rounds / Identifiers — no placeholder blocks, no "Coming Soon" panels, no skeleton shimmer for data that hasn't been wired.

**Why:** (a) Researcher-first copy tone from Phase 1 rejects marketing framing — a `/companies/[slug]` that mostly contains "곧 연동 예정" strips signal-to-noise. (b) SEO: Phase 8 LAUNCH-02 emits `noindex` when a company has < 5 facts; Phase 2 pages already ride that line, so adding empty sections would push us further into thin-content territory. (c) Skeletons would persist indefinitely for companies DART never covers (e.g., early-stage non-외감) — a stale UX hazard. Sections will be added by the phase that fills them, not reserved.

**How to apply:**
- Page renders only sections for which the query returned data + placeholder copy if a whole *already-in-scope* section is empty (e.g., a seed company with zero funding rounds → render a single line "공시된 투자 라운드가 없습니다" inside the Rounds section, not a shimmer).
- `src/app/[locale]/(public)/companies/[slug]/page.tsx` composition explicitly does NOT reserve space for charts / news / similar-companies.
- Planner note: when Phase 4a / 6 / 7 arrive, insertion points go *after* Funding rounds and *before* Identifiers — adding them should not require reshuffling.

### Claude's Discretion (downstream agents decide)

The user explicitly did not open discussion on these areas. Defaults below are acceptable; downstream researcher / planner may refine.

- **D-Discretion-1 — Seed data strategy.** Recommended default: a curated mix of ~120 companies weighted toward *well-known Korean startups with clean public data* (e.g., 토스, 당근, 쿠팡, 배민, 크래프톤, 컬리, …) so Phase 3 Korean search QA is meaningful, plus sector-diverse coverage (fintech / mobility / commerce / AI / healthcare / enterprise SaaS / proptech / gaming). Depth per company = Hero + ≥3 aliases (brand + legal + English) + ≥2 funding rounds when publicly verifiable + corp_code / 사업자번호 where findable in DART. Seed stored as TypeScript module (`scripts/seed/companies/*.ts`) per `data_sources` row for PR-reviewability + typesafety; `npm run seed` calls a one-shot import against a local or service-role Supabase client. Single `data_sources` row of `source_type='manual'` covers all manual-curation seeding; user_submission + DART sources get created with zero rows (needed for schema integrity in Phase 4).

- **D-Discretion-2 — Funding-round table rendering.** Recommended default: one row per round, columns = (단계 / 발표일 / 금액 / 투자자). Stage labels rendered in Korean (`pre_a → 'Pre-A'`, `series_a → '시리즈 A'`, `grant → '지원금'`, `safe → 'SAFE'`, `convertible_note → '전환사채'`, `undisclosed → '비공개'`) via a `stageLabel(stage, locale)` helper; invariant that the ENUM value remains English in JSON/URLs. Lead investors rendered as bolded chips, participants as plain chips on the same row — NOT two columns (a round with no identified lead collapses gracefully). Amounts: display KRW as "{억·조 formatted}원" using D-Discretion-3's helper; USD conversion computed at *seed time* with a hardcoded FX table per announce-year and stored in `original_text` for transparency (no runtime FX API in Phase 2). Rounds with `amount_minor IS NULL` render "비공개" with no freshness dot (nothing to verify).

- **D-Discretion-3 — Korean currency formatter (PROF-11).** Recommended default: `formatKRW(amountMinor: bigint | number, opts?)` in `src/lib/format/currency.ts`. Rules: (i) `< 1_0000` → "{n.toLocaleString('ko-KR')}원" (e.g., 5,000원); (ii) `< 1_0000_0000` → "{n/10000}만원" with up to 1 decimal trimmed (e.g., "5,000만원", "1.5만원"); (iii) `< 1_0000_0000_0000` → "{억 part}억 {만 part}만원" when 만 part ≥ 1000만, else just "{억 part}억원" (e.g., "1억 2,000만원", "250억원"); (iv) `≥ 1_0000_0000_0000` → "{조 part}조 {억 part}억원" (e.g., "1조 2,345억원"). Undisclosed → "비공개". No thin-space, no trailing zeros in decimal.

- **D-Discretion-4 — Logo hosting.** Recommended default: **defer Cloudflare R2 to Phase 2 final plan** when actual logo count is known. Seed v1 uses logos committed to `public/logos/{slug}.{png|svg}` in the repo (50–200 files × ~20 KB each ≈ 4 MB, well under Vercel's build limits) with `logo_url = '/logos/{slug}.svg'`. R2 migration is a Phase 2 sub-plan that only fires if the seed breaks 100 logos OR a single logo > 50 KB; otherwise R2 setup is deferred to Phase 4a (when ETL may add more logos). Missing-logo fallback: a plain-letter avatar (first letter of `display_name_ko`) rendered via a `<CompanyLogo />` component with Tailwind background — no icon library, no external service.

- **D-Discretion-5 — ISR + cache tagging.** Roadmap locks 1-hour revalidate. Discretion: wire `revalidateTag('company:${slug}')` tags into the `fetch` calls even though no producer calls them yet — Phase 4a DATA-10 webhook will use the exact tag shape. `unstable_cache` keyed by slug. Route configured `export const revalidate = 3600`.

- **D-Discretion-6 — Mobile responsiveness pattern.** Recommended default: vertical stack at 375 px (no drawers, no accordions). Hero collapses description to 2 lines with expand-inline. Funding-round table becomes a card-per-round list via a CSS `@container` query, each card repeating the column labels. Badge line wraps below the fact on mobile if it would cause >2-line overflow.

- **Minor conventions** (Drizzle file layout, component folder structure under `components/profile/`, test strategy, typography scale, ISR/cache tag naming) — per Phase 1 D-Discretion precedents.

### Folded Todos

None — `gsd-tools todo match-phase 2` returned 0 matches at init.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before acting.**

### Project context (always)
- `.planning/PROJECT.md` — Vision, persona (리서처/언론/구직자 — NOT investor), Stripe/Linear visual tone, premium gating decision (public `/companies/*` read)
- `.planning/REQUIREMENTS.md` §Profile (PROF-01, PROF-02, PROF-03, PROF-08, PROF-10, PROF-11), §Trust (TRUST-04, TRUST-05), §Out of Scope
- `.planning/ROADMAP.md` §Phase 2 — Goal, success criteria #1–5, pitfalls addressed (#2, #3, #5, #16)
- `.planning/STATE.md` §Accumulated Context — 10 locked key decisions + Korean-identity pitfall #8

### Phase 1 hand-offs (consume, don't re-do)
- `.planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md` — Full D-01 to D-06 prior decisions: route groups, anon read allowed on `(public)/companies/*`, `/[locale]/*` with `/ko` default, all strings through `t()`, currency triple schema, `last_verified_at` distinct, Stripe/Linear tone
- `supabase/migrations/0004_companies_and_identity.sql` — Canonical `companies`, `aliases`, `company_identifiers`, `company_relations` tables + ALL columns Phase 2 reads
- `supabase/migrations/0005_funding_investors_persons.sql` — `funding_rounds` + `round_investors` + currency-triple constraints + `funding_stage` / `round_participant_type` / `investor_type` ENUMs
- `supabase/migrations/0002_enums.sql` — `funding_stage` (pre_a, seed, series_a–d, bridge, safe, convertible_note, grant, undisclosed), `alias_type`, `identifier_kind`
- `supabase/migrations/0010_indexes_and_tsvector.sql` — `ix_companies_slug`, trigram GIN already in place (Phase 2 writes through, Phase 3 reads)
- `supabase/migrations/0012_rls_canonical.sql` — anon-read + service-role-write policy set (anon users CAN read `/companies/[slug]`)
- `src/lib/data/_meta.ts` — **Phase 2 data wrappers build on top of this.** `SourceMeta`, `WithMeta<T>`, `attachSource`, `attachSourceAll` are the contract for D-01 and D-02.
- `src/components/site/footer.tsx` + `src/components/site/disclaimer.tsx` — TRUST-06 disclaimer mounting point (already on every `(public)` route)
- `src/app/[locale]/(public)/layout.tsx` + `src/app/[locale]/(public)/page.tsx` — route-group + locale + `getTranslations()` pattern Phase 2 mirrors
- `src/i18n/request.ts` + `src/i18n/routing.ts` — next-intl wiring; new `messages/ko.json` keys land under `profile.*`

### Research artifacts (Phase 2 relevant)
- `.planning/research/STACK.md` — Recharts/shadcn commitment (charts arrive Phase 6), Cloudflare R2 rationale (logos), Korean currency formatter expectations
- `.planning/research/ARCHITECTURE.md` — Provenance-per-fact pattern, route-group boundary (`(public)` for read pages), `_meta.source` attach convention
- `.planning/research/FEATURES.md` — Feature-level definitions for the company profile page
- `.planning/research/PITFALLS.md` — **Pitfall #2** (stale-data trust collapse — this phase's TRUST-05 dot is the mitigation), **#3** (per-fact provenance — D-01 mitigation), **#5** (currency confusion — triple + 억/조 formatter), **#8** (Korean identity plurality — alias section D-03), **#16** (time-series chart traps — out of Phase 2 scope but keep gap-aware rendering in mind for funding-round dates with null `amount_minor`)
- `.planning/research/SUMMARY.md` — Cross-cutting concerns checklist (provenance, i18n, freshness, currency)

### External authoritative sources
- [Next.js ISR + `revalidate` segment config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#revalidate) — 1 h revalidate pattern
- [Next.js `revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) — Phase 4a producer; Phase 2 wires tag shape `company:${slug}` via `unstable_cache`
- [Next.js `next/image`](https://nextjs.org/docs/app/api-reference/components/image) — local logos via `/public/logos/*` with `next/image` optimization
- [next-intl App Router routing](https://next-intl.dev/docs/getting-started/app-router) — locale-aware `Link` + `getTranslations()` server helpers
- [date-fns Korean locale](https://date-fns.org/v4.1.0/docs/I18n) — freshness-dot date formatting
- [Cloudflare R2 S3 compat + public buckets](https://developers.cloudflare.com/r2/) — referenced only for D-Discretion-4 deferral rationale; actual integration stays out of Phase 2 unless thresholds are hit

### Deferred (not Phase 2 refs, noted so they're not re-discovered)
- DART OpenDART — Phase 4a ETL will populate funding_rounds for real
- Recharts docs — Phase 6
- Resend transactional — Phase 7
- Meilisearch Korean tokenizer — Phase 3 at earliest
- Cloudflare R2 provisioning — revisit only if seed logo count / size exceeds D-Discretion-4 thresholds

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (Phase 1 artifacts to consume)
- **`src/lib/data/_meta.ts`** — `SourceMeta`, `WithMeta<T>`, `attachSource`, `attachSourceAll`. D-01 and D-02 render directly off these. Phase 2 adds `src/lib/data/companies.ts` (new) that joins `public.data_sources` and returns `WithMeta<Company>`.
- **`src/components/site/footer.tsx` + `src/components/site/disclaimer.tsx`** — Global disclaimer already mounted on every `(public)` route, satisfying success criterion #4 for free.
- **`src/app/[locale]/(public)/layout.tsx`** — Public route group already handles locale + header + footer composition. Phase 2's `/companies/[slug]` slots into this layout, NOT into `(authed)` or `(admin)`.
- **`src/app/[locale]/(public)/page.tsx`** + **`/sources/page.tsx`** — reference implementations for `getLocale()` + `getTranslations('ns')` server-component pattern.
- **`src/lib/supabase/server.ts`** + **`src/lib/supabase/admin.ts`** — Data reads for anon routes use `server.ts` (anon key respects RLS `USING (true)` policies on canonical tables). Seed script writes use `admin.ts` (service-role bypass).
- **`src/lib/db/drizzle.ts`** — Typed queries for read-heavy paths. Per Phase 1 D-02.2: Drizzle is query-builder only; migrations stay in `supabase/migrations/`.
- **`messages/ko.json`** — Phase 2 adds `profile.hero.*`, `profile.aliases.*`, `profile.rounds.*`, `profile.identifiers.*`, `profile.source.*`, `profile.freshness.*`, `profile.empty.*` namespaces; `en.json` mirrors the key tree with empty strings (D-05.2).

### Established Patterns (from Phase 1 codebase)
- **Route composition**: `src/app/[locale]/(public|authed|admin)/<segment>/page.tsx` — Phase 2's new page is `[locale]/(public)/companies/[slug]/page.tsx`.
- **Async server components with `getLocale()` + `getTranslations('ns')`** — every page in Phase 1 follows this; Phase 2 continues.
- **Tailwind v4 utility-first + shadcn Radix** — no CSS modules; `cn()` from `src/lib/utils.ts` for class composition.
- **RLS**: `public.companies` is readable by anon; Phase 2 queries via `server.ts` (no service role in render path).
- **Sentry instrumentation** already mounted; Phase 2 page throws / DB failures automatically flow through `src/instrumentation.ts`.

### Integration Points
- **`revalidate = 3600`** on the page module; `revalidateTag('company:${slug}')` reserved for Phase 4a webhook (D-Discretion-5).
- **`source_type='manual'` row in `public.data_sources`** — single row created by a seed-bootstrap migration (or first seed-script run) that every manual-seed fact FKs into.
- **Phase 4c hook**: Hero / rounds rows leave a slot for a ♡ button component (shape: `<WatchlistButton companyId={...} />`). Component file can be stubbed (`return null` when not authed) so Phase 4c only wires the click handler, not the layout.
- **Phase 3 search**: no new indexes needed — `ix_companies_slug` already covers slug lookups.

</code_context>

<specifics>
## Specific Ideas

- **"출처" label is load-bearing trust UI, not decoration.** Same weight as the disclaimer — a page without source badges is not Phase 2-complete.
- **Aliases section answers "is this the right company?" in 2 seconds.** Former names (valid_to IS NOT NULL) render with subtle strikethrough + period annotation, e.g., "비바리퍼블리카 (2013–2024)"; current legal name bolded. Brand alias (the one in `display_name_ko`) is redundant with Hero — don't duplicate.
- **Funding-round table = the Phase 2 centerpiece** for most researcher sessions. Stage taxonomy in D-Discretion-2 maps 1:1 to the `funding_stage` ENUM already in `0002_enums.sql`; no new ENUM values should be added by Phase 2.
- **Mobile reality check**: 375 px is real. Every decision above tested in the planner's head against "does this still read on an iPhone SE?".
- **Seed is a Phase 3 unblock**, not decoration. Without meaningful seed, the Korean search regression test suite (`["토스","토스뱅크","비바리퍼블리카","당근","당근마켓","Coupang","쿠팡"]` in SRCH-13) has nothing to hit. Seed selection MUST include these 4 brand families.

</specifics>

<deferred>
## Deferred Ideas

### Out of Phase 2 scope but noted for future phases

- **5-year financial charts (revenue / op income / assets / liabilities)** — PROF-04, Phase 6
- **Employee-count time series** — PROF-05, Phase 6
- **Similar companies recommendation** — PROF-06, Phase 6
- **Korean tech-media news feed** — PROF-07, Phase 7
- **SEO JSON-LD + unique meta description** — PROF-09, Phase 8
- **Cloudflare R2 logo hosting** — revisit at Phase 2 plan-phase if seed count / size breaks D-Discretion-4 thresholds; otherwise Phase 4a
- **`/admin/curation` seed editing UI** — Phase 4b; Phase 2 uses a script + PR review instead
- **Watchlist ♡ button wiring** — Phase 4c
- **DART ETL replacing manual seed** — Phase 4a (seed stays as the canonical fallback for edge companies DART can't cover)
- **`noindex` for thin-content profiles (<5 facts)** — Phase 8 LAUNCH-02

### Reviewed but not folded

None — `todo match-phase 2` returned 0 matches at init.

</deferred>

---

*Phase: 02-read-only-profiles-manual-seed*
*Context gathered: 2026-04-21*
*Mode: discuss (user selected Provenance UI + Layout area only; 4 decisions locked; remaining areas left to Claude's Discretion per session rhythm)*
