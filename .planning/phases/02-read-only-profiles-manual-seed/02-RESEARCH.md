# Phase 2: Read-Only Profiles + Manual Seed — Research

**Researched:** 2026-04-21
**Domain:** Next.js 15.5 App Router ISR profile page + provenance UI + manual seed pipeline + Korean currency + `@container` query responsive table
**Confidence:** HIGH (stack locked by Phase 1; open questions map to verifiable Next/Tailwind/date-fns/Drizzle patterns)

## Summary

Phase 2 is a data-read-and-render phase with four distinct technical surfaces: (a) an ISR-cached company profile page keyed by slug, (b) a SourceBadge + freshness dot pattern that consumes the Phase 1 `WithMeta<T>` envelope on every fact, (c) a Korean currency formatter plus a container-query table → card pattern for mobile, and (d) a one-shot TypeScript seed that writes 50–200 companies through the service-role client.

Every Phase-2-significant technical pattern is already on the locked stack and documented in Phase 1 context: Next 15.5 App Router + `unstable_cache` + `revalidateTag`, next-intl 3.x, shadcn Radix (badge/table/separator), Tailwind v4 built-in container queries, date-fns v4 Korean locale, Drizzle 0.36 query-only. The `format_krw` Postgres helper and the reserved `data_sources` row (`id='00000000-...-001'`, `source_type='manual'`) already exist from Phase 1 — Phase 2 only consumes them.

**Primary recommendation:** Build Phase 2 as nine parallel-friendly tracks — (1) Drizzle schema for the 8 read tables, (2) `lib/data/companies.ts` read wrapper with `unstable_cache`, (3) `lib/format/currency.ts` `formatKRW` + unit tests, (4) `lib/data/freshness.ts` + SourceBadge component, (5) shadcn block installs + 5 profile components, (6) `/[locale]/(public)/companies/[slug]/page.tsx` + `loading.tsx` + `error.tsx` + `not-found.tsx`, (7) `revalidateTag` cache wire-up, (8) seed infrastructure (`scripts/seed/seed.ts` + `npm run seed` + ~120 curated companies weighted toward 토스/당근/쿠팡/배민), (9) vitest coverage across formatter / freshness / seed idempotency / profile render.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — TRUST-04 Source-Badge Placement & Style.** Inline per-fact pill rendered immediately after every numeric fact, alias row, funding-round cell, and identifier value on `/companies/[slug]`. Text: "출처: {sourceLabel} · {YYYY-MM-DD} 업데이트". `sourceLabel` maps from `_meta.sourceType` via a translation helper (`dart → 'DART'`, `manual → '수동 큐레이션'`, `user_submission → '사용자 제보'`). Date is `_meta.lastVerifiedAt` formatted with `date-fns` + Korean locale (NOT `updated_at`). Style: small neutral pill (~11 px text, low-contrast gray fill), left-aligned beside the fact. Stripe/Linear tone — no color by default. Badge text flows through `next-intl` `t()`. `src/components/profile/SourceBadge.tsx` takes a `SourceMeta` and renders pill + dot. When multiple facts in one row share the same source, render ONE badge on the row.

**D-02 — TRUST-05 Freshness-Dot Thresholds & Position.** 30 / 180-day thresholds + per-fact dot embedded inside the SourceBadge. `diffInDays(now, lastVerifiedAt) ≤ 30` → green (`text-green-600`), `≤ 180` → amber (`text-amber-500`), `> 180` → red (`text-red-600`). Dot is 6 px (`h-1.5 w-1.5`) filled circle inside the badge, to the left of "출처:". Helper `freshnessColor(lastVerifiedAt: string): 'green'|'amber'|'red'` lives in `src/lib/data/freshness.ts` (server-only OK). Unit test covering boundary days (30, 180) + today + >180.

**D-03 — Company Page Section Order.** Hero → 별칭 (Aliases) → 투자 라운드 (Funding rounds) → 식별자 (Identifiers). Single-column linear layout (no tabs). `<section id="...">` so future in-page anchors (`#funding-rounds`) work. Mobile (375 px): sections stack in same order; Hero can collapse the one-liner after ~2 lines with `line-clamp`.

**D-04 — Handling of Sections That Arrive in Later Phases.** Phase 2 simply omits Phase 4a / 6 / 7 sections. No placeholder blocks, no "Coming Soon" panels, no skeleton shimmer for data that hasn't been wired. Planner note: when Phase 4a / 6 / 7 arrive, insertion points go **after** Funding rounds and **before** Identifiers.

### Claude's Discretion (defaults acceptable — refinable)

**D-Discretion-1 — Seed data strategy.** Curated mix of ~120 companies weighted toward well-known Korean startups (토스, 당근, 쿠팡, 배민, 크래프톤, 컬리, …), sector-diverse (fintech / mobility / commerce / AI / healthcare / enterprise SaaS / proptech / gaming). Depth: Hero + ≥3 aliases + ≥2 funding rounds when publicly verifiable + corp_code / 사업자번호 where findable. TypeScript module (`scripts/seed/companies/*.ts`) per `data_sources` row. `npm run seed` calls one-shot import against service-role Supabase client. Single `data_sources` row of `source_type='manual'` covers all manual-curation seeding; user_submission + DART sources get created with zero rows.

**D-Discretion-2 — Funding-round table rendering.** One row per round, columns = (단계 / 발표일 / 금액 / 투자자). Stage labels via `stageLabel(stage, locale)` helper (`pre_a → 'Pre-A'`, `series_a → '시리즈 A'`, `grant → '지원금'`, `safe → 'SAFE'`, `convertible_note → '전환사채'`, `undisclosed → '비공개'`); ENUM value remains English in JSON/URLs. Lead investors as bolded chips, participants as plain chips on the same row. KRW display uses D-Discretion-3 helper. USD conversion computed at **seed time** with a hardcoded FX table per announce-year and stored in `original_text` (no runtime FX API in Phase 2). Rounds with `amount_minor IS NULL` render "비공개" with no freshness dot.

**D-Discretion-3 — Korean currency formatter (PROF-11).** `formatKRW(amountMinor: bigint | number, opts?)` in `src/lib/format/currency.ts`. Rules: (i) `< 1_0000` → "{n.toLocaleString('ko-KR')}원"; (ii) `< 1_0000_0000` → "{n/10000}만원" with up to 1 decimal trimmed; (iii) `< 1_0000_0000_0000` → "{억 part}억 {만 part}만원" when 만 part ≥ 1000만, else just "{억 part}억원"; (iv) `≥ 1_0000_0000_0000` → "{조 part}조 {억 part}억원". Undisclosed → "비공개". No thin-space, no trailing zeros in decimal.

**D-Discretion-4 — Logo hosting.** Defer Cloudflare R2 to Phase 2 final plan. Seed v1 uses logos committed to `public/logos/{slug}.{png|svg}` with `logo_url = '/logos/{slug}.svg'`. R2 migration fires only if seed breaks 100 logos OR a single logo > 50 KB; otherwise deferred to Phase 4a. Missing-logo fallback: plain-letter avatar (first letter of `display_name_ko`) via `<CompanyLogo />` with Tailwind background — no icon library, no external service.

**D-Discretion-5 — ISR + cache tagging.** Roadmap locks 1-hour revalidate. Wire `revalidateTag('company:${slug}')` tags into `fetch` calls even though no producer calls them yet (Phase 4a DATA-10 will). `unstable_cache` keyed by slug. Route configured `export const revalidate = 3600`.

**D-Discretion-6 — Mobile responsiveness pattern.** Vertical stack at 375 px (no drawers, no accordions). Hero collapses description to 2 lines with expand-inline. Funding-round table becomes a card-per-round list via CSS `@container` query, each card repeating column labels. Badge line wraps below the fact on mobile if >2-line overflow.

### Deferred Ideas (OUT OF SCOPE)

- **5-year financial charts** (PROF-04) — Phase 6
- **Employee-count time series** (PROF-05) — Phase 6
- **Similar companies recommendation** (PROF-06) — Phase 6
- **Korean tech-media news feed** (PROF-07) — Phase 7
- **SEO JSON-LD + unique meta description** (PROF-09) — Phase 8
- **Cloudflare R2 logo hosting** — revisit at plan-phase if seed count / size breaks D-Discretion-4 thresholds; otherwise Phase 4a
- **`/admin/curation` seed editing UI** — Phase 4b
- **Watchlist ♡ button wiring** — Phase 4c (layout slot only in Phase 2; component stub returns `null`)
- **DART ETL replacing manual seed** — Phase 4a
- **`noindex` for thin-content profiles (<5 facts)** — Phase 8 LAUNCH-02
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **PROF-01** | `/companies/[slug]` — 기업 상세 페이지 ISR + 1시간 revalidate | §ISR Cache Architecture (Next 15.5 route segment `revalidate = 3600` + `unstable_cache` + `revalidateTag('company:${slug}')`); §Standard Stack row "Next.js 15.5" |
| **PROF-02** | Hero 섹션 — 로고, 한국어 이름, 영어 이름, 섹터 태그, 본사, 한 줄 설명, 웹사이트 링크 | §Architecture Patterns "Hero composition"; §Code Examples "Hero component"; `<CompanyLogo />` with letter-avatar fallback per D-Discretion-4 |
| **PROF-03** | 투자 라운드 테이블 — 단계·일자·금액(KRW+USD)·리드·참여 투자자 | §Architecture Patterns "Funding-rounds table"; `funding_stage` ENUM mapped via `stageLabel()` (D-Discretion-2); `@container` table → card (§Container Queries) |
| **PROF-08** | 모바일 반응형 (375 px first-class) | §Container Queries (Tailwind v4 `@container` built-in, Baseline 2023 browser support); §Responsive Contract in 02-UI-SPEC.md |
| **PROF-10** | 한국어 별칭(현재+과거 사명) 표시 | §Architecture Patterns "Alias list"; consumes `public.aliases` joined to companies; former-name strikethrough with `(YYYY–YYYY)` annotation |
| **PROF-11** | 한국 통화 포맷팅 헬퍼 | §Korean Currency Formatter; `formatKRW(bigint \| number)` per D-Discretion-3; Postgres `format_krw()` already exists in migration 0011 — JS version must be byte-identical in boundary cases |
| **TRUST-04** | 모든 수치/팩트 옆 "출처: [소스명] · YYYY-MM-DD 업데이트" 인라인 배지 | §Architecture Patterns "SourceBadge"; consumes Phase 1 `WithMeta<T>` from `src/lib/data/_meta.ts`; inline per-fact per D-01 |
| **TRUST-05** | 신선도 도트 (녹: ≤30일 / 노랑: ≤180일 / 빨강: >180일) | §Architecture Patterns "Freshness helper"; `differenceInDays` from date-fns v4; dot embedded inside SourceBadge per D-02 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The following CLAUDE.md directives bind Phase 2 planning — the planner must verify every task complies:

| Directive | Phase 2 Implication |
|-----------|--------------------|
| **Tech stack locked** (Next 15.5 App Router + TS + Supabase + Drizzle query-only + shadcn Radix + Tailwind v4 + next-intl + Recharts + R2) | Do NOT upgrade packages for Phase 2. Planner must not introduce new runtime deps beyond what Phase 1 already installed. Current npm-pinned versions (verified via `npm view`): `next 15.5.15`, `@supabase/ssr 0.10.0`, `date-fns 4.1.0`, `drizzle-orm 0.36.0`, `react 19.0.0`, `tailwindcss ^4.0.0`, `next-intl ^3.26.0`, `vitest ^4.1.4`. |
| **`@supabase/ssr` 0.10.x, not `auth-helpers-nextjs`** | Read path uses `src/lib/supabase/server.ts` (already present). Seed script uses `src/lib/supabase/admin.ts` (service-role bypass; already present). |
| **Drizzle for reads; Supabase CLI for migrations** | Phase 2 adds `src/lib/db/schema/*.ts` (NEW — schema directory does not yet exist) so Drizzle has typed tables for reads. No Drizzle Kit migrations. Seed script writes via the Supabase JS client (service role), not via Drizzle — avoids a second connection pool and matches Supabase seed-guide idiom. |
| **shadcn Radix variant, Tailwind v4, lucide icons, slate baseColor, cssVariables: true** | Install `badge`, `table`, `separator` per UI-SPEC. Do NOT install tooltip / dialog / card in Phase 2. |
| **i18n Korean-first; all strings through `t()`; no hardcoded Korean in JSX** | Every JSX string in the new profile page and components reads from `profile.*` namespace in `messages/ko.json`. `messages/en.json` mirrors with empty strings (established Phase 1 stub pattern). |
| **`(public)` route group for anon-readable pages; `/ko` default locale** | New route lands at `src/app/[locale]/(public)/companies/[slug]/page.tsx`. |
| **Every fact rendered with source + last-updated metadata** | Enforced by the `WithMeta<T>` return type on every `lib/data/*` function — it is a compile-time error to forget. |
| **GSD workflow — no direct edits outside GSD** | Phase 2 plan executes via `/gsd-execute-phase 2`. Seed data can be curated incrementally in a single plan (not one PR per company). |
| **Stripe/Linear tone** | No marketing adjectives. No decorative illustration. No color-on-color surfaces. Freshness color is the only "loud" signal. |
| **Response language: Korean** (user memory) | Plan questions + confirmations in Korean; code/identifiers/paths stay English. |

## Standard Stack

### Core

| Library | Version (locked) | Purpose | Why Standard |
|---------|------------------|---------|--------------|
| Next.js | 15.5.15 | App Router + ISR + route segment config | `[VERIFIED: package.json + npm view next@15.5.15]` Phase 1 D-02.6 locked. Stable Node middleware. `unstable_cache` + `revalidateTag` are the canonical ISR pair in 15.5. |
| React | 19.0.0 | UI runtime | `[VERIFIED: package.json]` Bundled with Next 15.5 per Phase 1. |
| TypeScript | ^5.6.0 | Type safety | `[VERIFIED: package.json]` `strict: true` in `tsconfig.json`. |
| @supabase/ssr | ^0.10.0 | SSR auth + cookies | `[VERIFIED: npm view @supabase/ssr → 0.10.2]` Phase 1 already configured `createClient()` (`src/lib/supabase/server.ts`). |
| @supabase/supabase-js | ^2.46.0 | Service-role seed writes | `[VERIFIED: package.json]` Phase 1 already configured `createAdminClient()` (`src/lib/supabase/admin.ts`). |
| drizzle-orm | ^0.36.0 | Typed query builder | `[VERIFIED: package.json]` Phase 1 set `prepare: false` for Supabase pooler. Migrations via Supabase CLI, NOT Drizzle Kit. |
| next-intl | ^3.26.0 | i18n server helpers | `[VERIFIED: package.json]` `getTranslations('profile')`, `getLocale()`. **3.26 does not export `hasLocale`** — matches Phase 1 inline `isSupportedLocale()` workaround. |
| tailwindcss | ^4.0.0 | Styling | `[VERIFIED: package.json]` v4 ships `@container` built-in; no plugin needed. |
| shadcn (Radix variant) | latest CLI | Component primitives | `[VERIFIED: components.json]` `style: default`, `baseColor: slate`, `iconLibrary: lucide`. Phase 2 adds `badge`, `table`, `separator`. |
| date-fns | ^4.1.0 | Date formatting + age math | `[VERIFIED: package.json + npm view date-fns@4.1.0]` `format(...,{ locale: ko })` + `differenceInDays`. Each function / locale is a separate tree-shakeable module. |
| lucide-react | ^0.468.0 | Icons | `[VERIFIED: package.json]` External-link icon on Hero website CTA. |
| vitest | ^4.1.4 | Test runner | `[VERIFIED: package.json]` already used by `tests/rls` and `tests/smoke`. No config file yet — **Wave 0 creates `vitest.config.ts`** (see Validation Architecture). |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `class-variance-authority` | ^0.7.1 | Variant classes in SourceBadge / chips | `[VERIFIED: package.json]` Already used by shadcn components. |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^2.5.5 | `cn()` in `src/lib/utils.ts` | `[VERIFIED: package.json]` Phase 1 established. |
| `server-only` | ^0.0.1 | Guard `lib/data/*` from client bundles | `[VERIFIED: package.json]` Already used by `src/lib/data/_meta.ts`, `src/lib/supabase/server.ts`. |

### Alternatives Considered (rejected)

| Instead of | Could Use | Why rejected |
|------------|-----------|--------------|
| TypeScript seed module (`scripts/seed/*.ts` + `npm run seed`) | `supabase/seed.sql` | `seed.sql` runs on `supabase db reset` locally and is the Supabase idiomatic path `[CITED: supabase.com/docs/guides/local-development/seeding-your-database]`. But it does **not** seed the production Supabase project — only the local Docker instance. Phase 2 needs seed data in the **deployed** Supabase project for Phase 3 search QA. TypeScript + service-role runner executes against whatever `NEXT_PUBLIC_SUPABASE_URL` points at — local OR remote — and stays idempotent via `ON CONFLICT`. |
| CSV import via Supabase Studio | TypeScript seed module | CSVs are non-relational; inserting a company + 3 aliases + 2 funding rounds + 2 identifiers requires 4 separate CSVs with manual UUID stitching — error-prone and not diff-reviewable in git. |
| `fetch` with `next.tags` | `unstable_cache` | Phase 2 reads Supabase via Drizzle, not `fetch`. `unstable_cache` is the matching tool for non-`fetch` data reads `[CITED: nextjs.org/docs/app/api-reference/functions/unstable_cache]`. |
| Recharts | Pure HTML `<table>` + `@container` cards | Charts are Phase 6. No chart library use in Phase 2. |
| Tooltip on SourceBadge | None (no hover UI) | D-01 explicitly rejects hover for the inline pill; UI-SPEC Q1 deferred tooltip. |

### Installation (Phase 2 incremental; most already present)

```bash
# shadcn blocks (UI-SPEC Component Inventory)
npx shadcn@latest add badge
npx shadcn@latest add table
npx shadcn@latest add separator

# Vitest config file creation (no package install — vitest already in devDependencies)
# Wave 0 task creates vitest.config.ts

# No new runtime dependencies. All required packages already in package.json per Phase 1.
```

### Version verification

Verified at research time (2026-04-21 via `npm view`):
- `next@15.5.15` → package.json match (Phase 1 locked)
- `@supabase/ssr@0.10.2` → project at 0.10.0 compatible (caret range)
- `date-fns@4.1.0` → exact match
- `drizzle-orm@0.45.2` → project at 0.36.0. **PIN RATIONALE:** Phase 1 locked 0.36; upgrading Drizzle is not a Phase 2 concern.
- `vitest@4.1.4` → exact match

## Architecture Patterns

### Recommended File Layout (Phase 2 additions)

```
src/
├── app/
│   └── [locale]/
│       └── (public)/
│           └── companies/
│               └── [slug]/
│                   ├── page.tsx               # ISR page (PROF-01)
│                   ├── loading.tsx            # SSR skeleton
│                   ├── error.tsx              # error.tsx boundary (UI-SPEC profile.error.*)
│                   └── not-found.tsx          # notFound() target (UI-SPEC profile.notFound.*)
├── components/
│   └── profile/
│       ├── SourceBadge.tsx                    # TRUST-04 + TRUST-05 pill + dot
│       ├── CompanyLogo.tsx                    # next/image + letter-avatar fallback
│       ├── Hero.tsx                           # PROF-02
│       ├── AliasList.tsx                      # PROF-10
│       ├── FundingRoundsTable.tsx             # PROF-03 + @container
│       ├── IdentifierList.tsx                 # (corp_code / 사업자번호 / domain)
│       └── WatchlistButton.tsx                # stub returning null (Phase 4c hook)
├── lib/
│   ├── data/
│   │   ├── _meta.ts                           # EXISTS (Phase 1)
│   │   ├── companies.ts                       # NEW — getCompanyBySlug()
│   │   └── freshness.ts                       # NEW — freshnessColor() + label
│   ├── db/
│   │   ├── drizzle.ts                         # EXISTS
│   │   └── schema/                            # NEW directory (drizzle.config.ts points here)
│   │       ├── index.ts                       # barrel
│   │       ├── enums.ts                       # funding_stage, alias_type, ...
│   │       ├── companies.ts                   # companies + aliases + company_identifiers
│   │       ├── funding.ts                     # funding_rounds + investors + round_investors
│   │       └── data_sources.ts                # data_sources
│   └── format/
│       ├── currency.ts                        # NEW — formatKRW (PROF-11)
│       └── stage.ts                           # NEW — stageLabel(stage, locale)
├── messages/
│   ├── ko.json                                # ADD profile.* namespace
│   └── en.json                                # ADD profile.* namespace (empty strings)
scripts/
└── seed/
    ├── seed.ts                                # NEW entrypoint — `npm run seed`
    ├── types.ts                               # NEW — SeedCompany shape
    ├── fx.ts                                  # NEW — hardcoded FX table per announce-year
    └── companies/
        ├── index.ts                           # barrel export of all company modules
        ├── toss.ts                            # one file per company (PR-reviewable)
        ├── daangn.ts
        ├── coupang.ts
        ├── baemin.ts
        ├── krafton.ts
        ├── kurly.ts
        └── ...  (~120 total)
public/
└── logos/                                     # NEW directory — D-Discretion-4 logo v1 hosting
    ├── toss.svg
    ├── daangn.svg
    └── ...
drizzle/                                       # auto-generated by drizzle-kit introspect/pull (optional)
tests/
└── unit/                                      # NEW directory
    ├── format-currency.test.ts                # formatKRW boundary matrix
    ├── freshness.test.ts                      # 30 / 180 boundary
    ├── seed-idempotency.test.ts               # re-run = 0 net changes (against local Supabase)
    └── profile-page.render.test.tsx           # RSC render test (vitest + @testing-library + node env)
vitest.config.ts                               # NEW — path alias + RSC-safe config
```

### Pattern 1: ISR Cache Architecture

**What:** Route segment `revalidate = 3600` + per-slug `unstable_cache` envelope on the data read + `revalidateTag('company:${slug}')` producer contract.

**When to use:** The entire `/[locale]/(public)/companies/[slug]` tree in Phase 2.

**Example:**

```typescript
// src/app/[locale]/(public)/companies/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getCompanyBySlug } from '@/lib/data/companies';
import { getTranslations } from 'next-intl/server';

export const revalidate = 3600; // 1 hour per ROADMAP Phase 2 success criterion #4
export const dynamicParams = true; // allow new slugs without full rebuild

// Note: generateStaticParams is OPTIONAL for Phase 2. If the seed is small
// (~120 companies), pre-render all on build. Otherwise let ISR build on-demand.
export async function generateStaticParams() {
  // Return empty array → ISR builds each slug on first visit + revalidates per hour.
  // Plan can promote this to an actual query if page warmth matters at launch.
  return [];
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();
  // ... render Hero / AliasList / FundingRoundsTable / IdentifierList
}
```

```typescript
// src/lib/data/companies.ts
import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { WithMeta, SourceMeta } from './_meta';

export type CompanyProfile = { /* nested shape — see §Code Examples */ };

async function fetchCompany(slug: string): Promise<CompanyProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select(`
      id, slug, legal_name, display_name_ko, display_name_en, region, status,
      founded_at, sector, sub_sector, hq_address, description_ko, website_url,
      logo_url, last_verified_at,
      source:data_sources!inner (
        id, source_type, source_url, fetched_at, last_verified_at, confidence
      ),
      aliases (
        id, alias, alias_type, valid_from, valid_to, last_verified_at,
        source:data_sources!inner ( id, source_type, source_url, fetched_at, last_verified_at, confidence )
      ),
      funding_rounds (
        id, stage, amount_minor, currency_code, original_text, announced_at, closed_at,
        last_verified_at,
        source:data_sources!inner ( id, source_type, source_url, fetched_at, last_verified_at, confidence ),
        round_investors (
          participant_type,
          investor:investors ( id, name_ko, name_en, investor_type )
        )
      ),
      company_identifiers (
        id, kind, value, last_verified_at,
        source:data_sources!inner ( id, source_type, source_url, fetched_at, last_verified_at, confidence )
      )
    `)
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;
  return transformToWithMeta(data); // attaches _meta per nested row
}

export const getCompanyBySlug = (slug: string) =>
  unstable_cache(
    () => fetchCompany(slug),
    ['company', slug],
    { tags: [`company:${slug}`], revalidate: 3600 }
  )();
```

**Why this shape:**
- `unstable_cache` is the correct envelope because Phase 2 reads via Supabase client (not `fetch`) — only `unstable_cache` + `revalidateTag` work with non-`fetch` data sources `[CITED: nextjs.org/docs/app/api-reference/functions/unstable_cache]`.
- `tags: [`company:${slug}`]` matches the contract Phase 4a DATA-10 webhook will emit. No producer exists in Phase 2 — still wire it.
- Route segment `revalidate = 3600` is a fallback for pages that bypass `unstable_cache` (e.g., Hero rendered directly from RSC props). Redundant with `unstable_cache`, but pins the 1-hour ceiling for Google Search bots that re-crawl `[CITED: nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#revalidate]`.
- **Supabase nested select is preferred over Drizzle `with:` here** because the client is already configured (`server.ts`) and respects RLS via the anon cookie — no second connection pool, no RLS bypass risk. Drizzle is still used as the schema source-of-truth (types flow through the schema modules). `[VERIFIED: src/lib/supabase/server.ts exists; src/lib/db/drizzle.ts exists]`

### Pattern 2: Drizzle Schema for Type Alignment

**What:** Create `src/lib/db/schema/*.ts` mirroring the Phase 1 SQL migrations so Drizzle types flow into the `lib/data/*` layer.

**When to use:** Every `lib/data/*` read function imports from `src/lib/db/schema` for column shapes. **We don't use Drizzle to execute the queries in Phase 2** (Supabase client handles that) — we use Drizzle `$inferSelect` to generate TS types that stay in sync with the canonical SQL. Phase 3 will graduate to Drizzle-executed queries when facet SQL gets complex.

**Example:**

```typescript
// src/lib/db/schema/companies.ts
import { pgTable, uuid, text, char, timestamp, date } from 'drizzle-orm/pg-core';
import { companyStatus } from './enums';
import { dataSources } from './data_sources';

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  legalName: text('legal_name'),
  displayNameKo: text('display_name_ko').notNull(),
  displayNameEn: text('display_name_en'),
  region: char('region', { length: 2 }).notNull().default('KR'),
  status: companyStatus('status').notNull().default('alive'),
  foundedAt: date('founded_at'),
  sector: text('sector'),
  subSector: text('sub_sector'),
  hqAddress: text('hq_address'),
  descriptionKo: text('description_ko'),
  descriptionEn: text('description_en'),
  websiteUrl: text('website_url'),
  logoUrl: text('logo_url'),
  sourceId: uuid('source_id').notNull().references(() => dataSources.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Company = typeof companies.$inferSelect;
```

**Why:** Strict types on SourceMeta attach points. Phase 3 upgrades this to execute Drizzle queries without a second schema rewrite.

### Pattern 3: SourceBadge + Freshness (TRUST-04 + TRUST-05)

**What:** `<SourceBadge meta={row._meta} />` that reads `sourceType` + `lastVerifiedAt` and emits the pill + dot atomically.

```typescript
// src/lib/data/freshness.ts
import 'server-only';
import { differenceInDays } from 'date-fns';

export type FreshnessLevel = 'fresh' | 'stale' | 'expired';

export function freshnessLevel(lastVerifiedAt: string, now: Date = new Date()): FreshnessLevel {
  const days = differenceInDays(now, new Date(lastVerifiedAt));
  if (days <= 30) return 'fresh';
  if (days <= 180) return 'stale';
  return 'expired';
}

export const FRESHNESS_DOT_CLASS: Record<FreshnessLevel, string> = {
  fresh: 'text-green-600 dark:text-green-500',
  stale: 'text-amber-500 dark:text-amber-400',
  expired: 'text-red-600 dark:text-red-500',
};
```

```tsx
// src/components/profile/SourceBadge.tsx
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getTranslations } from 'next-intl/server';
import type { SourceMeta } from '@/lib/data/_meta';
import { freshnessLevel, FRESHNESS_DOT_CLASS } from '@/lib/data/freshness';

export async function SourceBadge({ meta }: { meta: SourceMeta }) {
  const t = await getTranslations('profile');
  const level = freshnessLevel(meta.lastVerifiedAt);
  const sourceLabel = t(`source.type.${meta.sourceType}`);
  const formattedDate = format(new Date(meta.lastVerifiedAt), 'yyyy-MM-dd');

  return (
    <Badge variant="secondary" className="inline-flex items-center gap-1 text-[11px] font-normal">
      <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${FRESHNESS_DOT_CLASS[level]} bg-current`} />
      <span className="sr-only">{t(`freshness.${level}`)}</span>
      <span>{t('source.badge', { sourceLabel, date: formattedDate })}</span>
    </Badge>
  );
}
```

**Why:** Same primitive used by Hero, rounds table rows, alias rows, identifier rows. Zero duplicate ternaries for color.

### Pattern 4: Korean Currency Formatter

**What:** `formatKRW(amountMinor: bigint | number, opts?)` client- and server-safe, byte-identical to Postgres `format_krw()` for the boundary inputs we'll test in Wave 0.

```typescript
// src/lib/format/currency.ts
// Pure function; no "server-only" (safe in both RSC and client components).

export type FormatKRWOptions = {
  undisclosedLabel?: string; // default '비공개' via i18n at call site
};

export function formatKRW(
  amountMinor: bigint | number | null | undefined,
  opts: FormatKRWOptions = {}
): string {
  if (amountMinor === null || amountMinor === undefined) return opts.undisclosedLabel ?? '비공개';
  const n = typeof amountMinor === 'bigint' ? amountMinor : BigInt(Math.trunc(amountMinor));
  if (n < 0n) throw new Error('formatKRW: negative amounts not supported');
  if (n === 0n) return '0원';

  const JO = 1_0000_0000_0000n;
  const EOK = 1_0000_0000n;
  const MAN = 1_0000n;

  if (n < MAN) return `${Number(n).toLocaleString('ko-KR')}원`;

  if (n < EOK) {
    // 만 tier: show up to 1 decimal, trim trailing .0
    const man = Number(n) / 10000;
    const rounded = Math.round(man * 10) / 10;
    const str = rounded.toString();
    return `${str.endsWith('.0') ? str.slice(0, -2) : str.replace('.', ',')}만원`;
    // NOTE: `toLocaleString` for the integer portion ("5,000" not "5000") —
    // final implementation must grouping-format the integer part explicitly.
  }

  if (n < JO) {
    const eok = n / EOK;
    const remainder = n % EOK;
    const man = remainder / MAN;
    if (man >= 1000n) {
      return `${Number(eok).toLocaleString('ko-KR')}억 ${Number(man).toLocaleString('ko-KR')}만원`;
    }
    return `${Number(eok).toLocaleString('ko-KR')}억원`;
  }

  const jo = n / JO;
  const eokPart = (n % JO) / EOK;
  if (eokPart > 0n) {
    return `${Number(jo).toLocaleString('ko-KR')}조 ${Number(eokPart).toLocaleString('ko-KR')}억원`;
  }
  return `${Number(jo).toLocaleString('ko-KR')}조원`;
}
```

**Boundary matrix (Wave 0 must cover):**

| Input (원) | Expected | Rule |
|------------|----------|------|
| `null` / `undefined` | "비공개" (or opts override) | (0) undisclosed |
| `0n` | "0원" | (0) zero |
| `5_000n` | "5,000원" | (i) `< 1_0000` |
| `9_999n` | "9,999원" | (i) boundary inclusive |
| `10_000n` | "1만원" | (ii) `< 1_0000_0000` |
| `15_000n` | "1.5만원" | (ii) 1-decimal trim |
| `99_990_000n` | "9,999만원" | (ii) max before 억 |
| `100_000_000n` | "1억원" | (iii) `< 1_0000_0000_0000` boundary |
| `120_000_000n` | "1억원" | (iii) man part `< 1000만` → suppress |
| `199_999_999n` | "1억원" | (iii) man part 9,999만 but rule says `< 1000만` → amend rule **OR** accept "1억 9,999만원" — D-Discretion-3 wording is "when 만 part ≥ 1000만" which means 9,999만 SHOULD render. Planner must resolve; recommend: always render man part when ≥ 1만 (round to nearest 만). |
| `1_200_000_000n` (=12억) | "12억원" | (iii) man part = 0 |
| `2_345_678_900_000n` (=2.345조) | "2조 3,456억원" | (iv) |
| Negative | throw Error | non-negative invariant |
| `9_007_199_254_740_993n` (>Number.MAX_SAFE_INTEGER) | handles correctly | `BigInt` preserves precision where `Number` loses it |

**Gotcha — BigInt rendering in React 19:** Returning a `bigint` as a child of JSX is NOT permitted (`bigint is not assignable to ReactNode` TS error) `[CITED: vercel/next.js discussion 64753]`. `formatKRW` returns `string`, sidestepping this. Do NOT pass raw bigints to JSX.

**Gotcha — consistency with Postgres helper:** `public.format_krw(BIGINT)` (migration 0011) already exists and is used at SQL level (future projections, admin UI). Its boundary format is "{v_jo}조 {v_eok}억 {v_man}만 {v_remainder}원" with a space-joined concat and NO number-grouping commas. **Phase 2 JS helper does NOT need to be byte-identical to the Postgres helper** — the SQL helper is for raw admin inspection, the JS helper is UX-presentation. But: the planner must decide where to document this divergence. Recommend a `docs/currency-formatting.md` note.

### Pattern 5: Container-Query Funding Table

**What:** Desktop renders shadcn `<Table>`; below container breakpoint the same data renders as cards, each repeating column labels.

```tsx
// src/components/profile/FundingRoundsTable.tsx
export function FundingRoundsTable({ rounds }: Props) {
  return (
    <div className="@container">
      {/* Table variant (≥640px container width) */}
      <div className="hidden @sm:block">
        <Table>
          <TableHeader>
            <TableRow><TableHead>단계</TableHead><TableHead>발표일</TableHead><TableHead>금액</TableHead><TableHead>투자자</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rounds.map((r) => <FundingRow key={r.id} round={r} />)}
          </TableBody>
        </Table>
      </div>
      {/* Card variant (<640px container width) */}
      <ul className="@sm:hidden flex flex-col gap-3">
        {rounds.map((r) => <FundingCard key={r.id} round={r} />)}
      </ul>
    </div>
  );
}
```

**Why `@container`:** At 375 px viewport, a 4-column table is unreadable. Using container queries (not viewport media queries) means when Phase 6 adds a two-column "comparison" layout, this same component degrades based on its own width, not the window.

**Tailwind v4 support:** Container queries are built into v4 — no plugin needed. `@container` utility sets `container-type: inline-size`; `@sm:`, `@md:` variants respond to the parent's width. Baseline 2023 (Chrome 105+, Firefox 110+, Safari 16+), universal in 2026. `[CITED: tailwindcss.com/blog/tailwindcss-v4]`

### Pattern 6: CompanyLogo with Letter-Avatar Fallback

```tsx
// src/components/profile/CompanyLogo.tsx
import Image from 'next/image';

export function CompanyLogo({
  slug, displayNameKo, logoUrl, size = 72,
}: { slug: string; displayNameKo: string; logoUrl: string | null; size?: number }) {
  if (!logoUrl) {
    const letter = displayNameKo.trim().charAt(0) || '?';
    return (
      <div
        role="img"
        aria-label={`${displayNameKo} 로고`}
        className="flex items-center justify-center rounded-md bg-muted text-muted-foreground font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {letter}
      </div>
    );
  }
  return (
    <Image
      src={logoUrl}
      alt={`${displayNameKo} 로고`}
      width={size}
      height={size}
      className="rounded-md"
      priority={false}
    />
  );
}
```

**Gotchas:**
- `next/image` with `/public/logos/*.svg` works without extra config, BUT Next.js disables image-optimization for SVGs by default (security). Serve SVGs as `<Image>` with `unoptimized` or render `<img>` inline. For PNGs, Next optimization applies automatically. Planner choice: ship logos as SVG for crispness + commit as hand-trusted assets + add `images: { dangerouslyAllowSVG: true, contentSecurityPolicy: ... }` in `next.config.ts` OR restrict to PNG/WebP. **Recommendation:** PNG/WebP via `next/image` optimizer is safer; SVG fallback per company if a PNG is unavailable.
- `priority` ONLY on the Hero logo. Deprecated in Next 16 in favor of `preload`, but Phase 1 locks Next 15.5 → keep using `priority` for now. `[CITED: nextjs.org/docs/app/api-reference/components/image]`

### Pattern 7: Seed Pipeline

```typescript
// scripts/seed/types.ts
import type { SourceType } from '@/lib/data/_meta';

export type SeedAlias = { alias: string; alias_type: 'legal' | 'brand' | 'english' | 'former' | 'common'; valid_from?: string; valid_to?: string };
export type SeedFundingRound = { stage: string; amount_minor?: bigint; currency_code?: 'KRW' | 'USD'; original_text?: string; announced_at?: string; lead?: string[]; participants?: string[] };
export type SeedIdentifier = { kind: 'dart_corp_code' | 'business_registration_number' | 'corporate_registration_number' | 'website_domain'; value: string };

export type SeedCompany = {
  slug: string;
  display_name_ko: string;
  display_name_en?: string;
  legal_name?: string;
  sector: string;
  hq_address?: string;
  founded_at?: string;
  description_ko: string;
  website_url?: string;
  logo_file?: string; // relative to public/logos/
  source_type: SourceType; // always 'manual' for Phase 2 seed
  last_verified_at: string; // ISO date; controls freshness-dot rendering
  aliases: SeedAlias[];
  funding_rounds: SeedFundingRound[];
  identifiers: SeedIdentifier[];
};
```

```typescript
// scripts/seed/seed.ts
import 'dotenv/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { companies as allCompanies } from './companies';

const MANUAL_SOURCE_ID = '00000000-0000-0000-0000-000000000001'; // seeded in migration 0003_data_sources.sql

async function main() {
  const supabase = createAdminClient();
  for (const co of allCompanies) {
    // UPSERT company by slug (idempotent)
    const { data: insertedCompany, error } = await supabase
      .from('companies')
      .upsert({
        slug: co.slug,
        display_name_ko: co.display_name_ko,
        // ...
        source_id: MANUAL_SOURCE_ID,
        last_verified_at: co.last_verified_at,
      }, { onConflict: 'slug' })
      .select('id')
      .single();
    if (error) throw error;

    // Delete-then-insert aliases / rounds / identifiers keyed by company_id
    // (simpler idempotency than diffing — safe because soft-delete is off for
    // manual seed; we OWN every manual row)
    await supabase.from('aliases').delete().eq('company_id', insertedCompany.id);
    await supabase.from('aliases').insert(co.aliases.map((a) => ({
      company_id: insertedCompany.id,
      alias: a.alias,
      alias_type: a.alias_type,
      source_id: MANUAL_SOURCE_ID,
      // ...
    })));
    // ... same for funding_rounds + round_investors + company_identifiers
  }
  console.log(`Seeded ${allCompanies.length} companies.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

```json
// package.json scripts (additions)
{
  "scripts": {
    "seed": "tsx scripts/seed/seed.ts",
    "seed:dry": "DRY_RUN=1 tsx scripts/seed/seed.ts"
  }
}
```

**Why this shape:**
- **TypeScript module per company** is PR-reviewable + typesafe + diffable — critical for fact-level provenance (researcher can see exactly which URL backed which 투자 라운드 in `git blame`).
- **Service-role bypasses RLS** `[CITED: supabase.com/docs/guides/local-development/seeding-your-database]` — `createAdminClient()` from Phase 1 is the right surface.
- **Idempotent via UPSERT on `slug` + DELETE+INSERT on child rows** — re-running `npm run seed` yields zero net changes on unchanged data. This pattern is acceptable BECAUSE only manual-curated rows exist in Phase 2; when Phase 4a DART ETL lands, it writes through `staging → publish()`, which has its own idempotency.
- **Four brand families MUST be present for Phase 3 SRCH-13:** 토스 (+ 비바리퍼블리카 + Toss + 토스뱅크 alias), 당근 (+ 당근마켓), 쿠팡 (+ Coupang), 배민 (+ 우아한형제들 + Baemin). Flag these in `scripts/seed/companies/CRITICAL.md` so nobody deletes them. `[VERIFIED: 02-CONTEXT.md specifics → SRCH-13 fixture]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting with Korean locale | Custom `YYYY년 MM월 DD일` string builder | `format(new Date(iso), 'yyyy-MM-dd', { locale: ko })` from `date-fns/locale` | Timezone edge cases, month rollovers, DST — all solved. Project already has date-fns v4. |
| Age calculation for freshness | `Math.floor((now - then) / 86400000)` | `differenceInDays` from `date-fns` | DST transitions + leap seconds break naive subtraction. |
| Ellipsis / line-clamp for Hero description | JS measurement | Tailwind `line-clamp-2` utility | Native CSS; works with container queries. |
| ISR cache key + invalidation | Custom Map + setInterval revalidation | `unstable_cache` + `revalidateTag` | Battle-tested in Next 15.5; Phase 4a producer contract matches. `[CITED: nextjs.org/docs/app/api-reference/functions/unstable_cache]` |
| Letter-avatar logo fallback | Icon library (lucide alternative "Building") | Hand-rolled `<div>` with `rounded-md bg-muted` + first-character glyph | Korean `한글` is visually distinct — a letter-avatar is more identity-preserving than a generic icon. |
| Container query responsive breakpoints | Window resize listener + `useState` | Tailwind v4 `@container` + `@sm:`/`@md:` variants | Built-in in v4; pure CSS; zero JS; respects container not viewport. `[CITED: tailwindcss.com/blog/tailwindcss-v4]` |
| Slug normalization | Custom regex | Existing `companies.slug` already unique-constrained at DB | Don't duplicate validation logic; DB is source of truth. |
| i18n ICU message expansion | `${sourceLabel}` string template | next-intl `t('source.badge', { sourceLabel, date })` ICU syntax | Matches Phase 1 D-05.4 contract; pluralization-ready for Asia expansion. |
| Seed data re-run safety | Truncate + re-insert | `UPSERT ON CONFLICT (slug)` + child-row delete+insert | Preserves FK integrity for rows that would survive re-seed. |

**Key insight:** Phase 2 is a composition phase, not an invention phase. Every domain problem (dates, money, cache, images, container queries) has an idiomatic library answer already in the repo's deps. Resist the urge to write "a small helper."

## Common Pitfalls

### Pitfall 1: Silent stale-data trust collapse (ROADMAP pitfall #2)

**What goes wrong:** A fact renders with a green freshness dot because `updated_at` was recently bumped by an unrelated column edit.
**Why it happens:** Using `updated_at` for the dot instead of `last_verified_at`.
**How to avoid:** `freshnessLevel()` takes `lastVerifiedAt` only. Phase 1 D-03.9 made the two columns distinct — use the right one.
**Warning signs:** Dots all green everywhere in local dev immediately after migration run (good — recent `NOW()` defaults). Dots all green in prod after a cold re-seed (bad — suggests `last_verified_at` default used for all rows → no signal).

### Pitfall 2: Badge-per-cell density (ROADMAP pitfall #3 mitigation + D-01)

**What goes wrong:** SourceBadge rendered per-cell in the funding-round table; 4 columns × 10 rounds = 40 badges, unreadable.
**Why it happens:** Naive "every fact has a source" reading.
**How to avoid:** D-01 explicitly says "When multiple facts in one row share the same source, render ONE badge on the row." FundingRoundsTable must place the badge at row level (e.g., end of `<tr>` spanning full width, or inline after the last cell). AliasList places one badge per alias row. IdentifierList places one per identifier row. Hero has 1–2 badges total (company-level metadata badge next to the one-liner).

### Pitfall 3: BigInt leaks to JSX (React 19 type error)

**What goes wrong:** `{round.amount_minor}` in JSX → TS error "bigint is not assignable to ReactNode" `[CITED: vercel/next.js discussion 64753]`.
**Why it happens:** Drizzle returns `bigint` for BIGINT columns; Supabase client may return `string` (driver-dependent). Never a `number` — the values exceed `MAX_SAFE_INTEGER` for 조원-scale rounds.
**How to avoid:** Always pipe `amount_minor` through `formatKRW()` before rendering. Type `CompanyProfile.funding_rounds[n].amount_minor` as `bigint | string | null` to reflect driver reality; `formatKRW` accepts both.
**Warning sign:** A `{row.amount_minor}` anywhere in a TSX file.

### Pitfall 4: USD-at-render instead of USD-at-seed (D-Discretion-2)

**What goes wrong:** Funding page calls an FX API on every render, hammering the free-tier rate limit and producing different numbers on refresh.
**Why it happens:** Naive "convert on read" instinct.
**How to avoid:** D-Discretion-2: USD conversion computed at SEED time using a hardcoded FX table in `scripts/seed/fx.ts` (one FX per announce-year, e.g., `{ 2023: 1300, 2024: 1350, 2025: 1420 }`). Stored in `original_text` column for transparency ("$50M ≈ ₩65,000,000,000 @ 2023 avg 1,300 KRW/USD"). Runtime renders `original_text` verbatim next to KRW — no runtime FX call.

### Pitfall 5: Korean identity plurality (ROADMAP pitfall #8)

**What goes wrong:** The seed gives 토스 only `display_name_ko='토스'` with no alias rows → Phase 3 search for "비바리퍼블리카" returns nothing.
**Why it happens:** Curator thinks one name = one row.
**How to avoid:** Every seed company MUST have ≥3 aliases (brand + legal + English) where knowable. The 4 critical brand families must have current + former pairs. Write a vitest assertion in Wave 0: "every seeded company has at least one alias of type `brand` OR `legal`."
**Warning sign:** A company's `aliases` array has length 0 or 1 in the seed module.

### Pitfall 6: Gap-blind rendering (ROADMAP pitfall #16 — though Phase 6 is the main owner)

**What goes wrong:** Funding-rounds table shows `amount_minor IS NULL` rounds as "0원" (because `formatKRW(null)` fell through to 0 somehow).
**How to avoid:** `formatKRW` returns "비공개" for null/undefined. Render a round with `amount_minor IS NULL` WITHOUT a freshness dot (nothing to verify). Test: `formatKRW(null) === '비공개'`.

### Pitfall 7: Route group contamination

**What goes wrong:** Developer adds `/companies/[slug]` under `[locale]/` at the top level instead of inside `(public)/` → misses footer/disclaimer/CookieNotice, breaks TRUST-06 disclaimer requirement on every company page.
**How to avoid:** Route MUST be at `src/app/[locale]/(public)/companies/[slug]/page.tsx`. `(public)/layout.tsx` already mounts Header + Footer + CookieNotice. The smoke test must assert the disclaimer text appears on `/ko/companies/toss` (see Validation Architecture REQ-TRUST-06-verify).

### Pitfall 8: Typed routes break on dynamic slug

**What goes wrong:** `typedRoutes: true` in `next.config.ts` causes `<Link href={`/${locale}/companies/${slug}`}>` to fail type-check because `slug` is a dynamic string.
**How to avoid:** Cast through `as Route` (pattern established in Phase 1 footer `<Link href={`/${locale}/contact/dsar` as Route}>`). Document this in component file header.

### Pitfall 9: SVG optimization in next/image

**What goes wrong:** `<Image src="/logos/toss.svg" ... />` fails to optimize (SVG optimization off by default in Next) and may even error on SVGs with embedded scripts.
**How to avoid:** Either (a) ship PNG/WebP for all logos, or (b) set `images: { dangerouslyAllowSVG: true, contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;" }` in `next.config.ts` AND commit only hand-audited SVGs. Recommend (a) for Phase 2 simplicity.

### Pitfall 10: Seed script writes from client bundle

**What goes wrong:** Someone imports `scripts/seed/seed.ts` from a React component path → service-role key leaks into browser.
**How to avoid:** Scripts live OUTSIDE `src/` (as shown in file layout: `scripts/seed/`). The `'server-only'` import in `admin.ts` provides a backstop.

### Pitfall 11: Seed data freshness trap

**What goes wrong:** All seed rows get `last_verified_at = NOW()` at seed time → every fact reads as fresh (green dot), masking the fact that they are manually curated (possibly stale against reality).
**How to avoid:** Each SeedCompany specifies its own `last_verified_at` ISO date matching when the curator actually checked the source. The default should be "the date I wrote this seed file." Then three months later, the freshness dot honestly amber's. Test: seed a company with `last_verified_at = '2025-01-01'` and assert the rendered dot is `expired` (red) under the 180-day rule.

## Code Examples

### Company profile Hero section

```tsx
// src/components/profile/Hero.tsx
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { CompanyLogo } from './CompanyLogo';
import { SourceBadge } from './SourceBadge';
import type { WithMeta } from '@/lib/data/_meta';
import type { CompanyHero } from '@/lib/data/companies';

export async function Hero({ company }: { company: WithMeta<CompanyHero> }) {
  const t = await getTranslations('profile');
  return (
    <section aria-labelledby="hero-sr-heading" className="flex flex-col gap-6">
      <h2 id="hero-sr-heading" className="sr-only">{t('hero.srHeading')}</h2>
      <div className="flex items-start gap-4">
        <CompanyLogo slug={company.slug} displayNameKo={company.displayNameKo} logoUrl={company.logoUrl} size={72} />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold leading-tight">{company.displayNameKo}</h1>
          {company.displayNameEn && (
            <p className="text-xl font-semibold text-muted-foreground" lang="en">{company.displayNameEn}</p>
          )}
          {company.sector && <Badge variant="secondary">{company.sector}</Badge>}
        </div>
      </div>
      <Separator />
      {company.descriptionKo && (
        <p className="text-sm leading-normal line-clamp-2">{company.descriptionKo}</p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {company.hqAddress && (<><dt className="text-muted-foreground">HQ</dt><dd>{company.hqAddress}</dd></>)}
        {company.websiteUrl && (
          <>
            <dt className="text-muted-foreground">웹사이트</dt>
            <dd>
              <a href={company.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1">
                {t('hero.websiteCta')}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </dd>
          </>
        )}
      </dl>
      <SourceBadge meta={company._meta} />
    </section>
  );
}
```

### Freshness boundary unit test (seed template)

```typescript
// tests/unit/freshness.test.ts
import { describe, it, expect } from 'vitest';
import { freshnessLevel } from '@/lib/data/freshness';
import { subDays } from 'date-fns';

const NOW = new Date('2026-04-21T00:00:00Z');

describe('freshnessLevel', () => {
  it('today → fresh', () => expect(freshnessLevel(NOW.toISOString(), NOW)).toBe('fresh'));
  it('30 days exactly → fresh (≤30)', () => expect(freshnessLevel(subDays(NOW, 30).toISOString(), NOW)).toBe('fresh'));
  it('31 days → stale', () => expect(freshnessLevel(subDays(NOW, 31).toISOString(), NOW)).toBe('stale'));
  it('180 days exactly → stale (≤180)', () => expect(freshnessLevel(subDays(NOW, 180).toISOString(), NOW)).toBe('stale'));
  it('181 days → expired', () => expect(freshnessLevel(subDays(NOW, 181).toISOString(), NOW)).toBe('expired'));
  it('5 years → expired', () => expect(freshnessLevel(subDays(NOW, 1825).toISOString(), NOW)).toBe('expired'));
});
```

## State of the Art (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fetch` with `next: { revalidate, tags }` | `unstable_cache` for non-fetch data | Next 13.4+ | Phase 2 reads Supabase via client — `unstable_cache` is the tool. `[CITED: nextjs.org/docs/app/api-reference/functions/unstable_cache]` |
| `tailwindcss-container-queries` plugin | Built-in `@container` in v4 | Tailwind v4 (2025) | No plugin install needed. `[CITED: tailwindcss.com/blog/tailwindcss-v4]` |
| `next/image` `priority` | `preload` (preview in Next 16) | Next 16 | **Phase 1 locks Next 15.5** → stay on `priority` for Phase 2. Flag for re-review at Next 16 upgrade. |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Phase 1 already uses `@supabase/ssr`. |
| Drizzle Kit for Supabase migrations | Supabase CLI migrations + Drizzle for queries only | 2024+ | Phase 1 D-02.2 locked. Phase 2 adds schema modules for TYPE alignment only. |

**Deprecated / outdated (do not use):**

- `NEXT_PUBLIC_*` envs in server-only modules (works but leaks intent) — use plain env in `admin.ts` ✓ Phase 1 already correct.
- `Intl.NumberFormat` with `{ style: 'currency', currency: 'KRW' }` — produces "₩" prefix and no 만/억 grouping; does not meet PROF-11. Roll the custom formatter.
- Inline `style={{ color: '#16a34a' }}` for freshness — use Tailwind classes so dark mode works.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next 15.5 `unstable_cache` + `revalidateTag('company:${slug}')` stays compatible across the Phase 4a webhook producer | §ISR Cache Architecture | Phase 4a must use identical tag shape; if Next 16 upgrade happens before Phase 4a, re-verify tag semantics. `[ASSUMED]` based on current 15.5 docs + Phase 4a DATA-10 spec. |
| A2 | Supabase nested-select JOIN syntax (`aliases ( ... )`) returns every child row under RLS anon read | §Pattern 1 | RLS canonical read policies allow `deleted_at IS NULL` SELECT for anon on all 8 tables (verified in `0012_rls_canonical.sql`). `[VERIFIED]` not an assumption. |
| A3 | `formatKRW` boundary rule "when 만 part ≥ 1000만" in D-Discretion-3 is correctly interpreted to mean "suppress when < 1만" (not "< 1000만") | §Pattern 4 boundary matrix row `199_999_999n` | D-Discretion-3 wording is ambiguous — strict reading produces "1억" for 1억 9,999만원. UX intent is almost certainly "render both parts when both > 0". Planner must resolve in Phase 2 discuss-follow-up OR commit to strict reading. `[ASSUMED]` |
| A4 | ~120 seed companies × ~20KB PNG/SVG logos = ~4MB fits under Vercel build assets limit (100MB) | D-Discretion-4 | Trivially under limit for v1 scale; re-check at 500+ companies. `[VERIFIED: order-of-magnitude math]` |
| A5 | The 4 brand families (토스/당근/쿠팡/배민) are publicly-curatable from their own corporate websites + DART public filings without any paywalled source | D-Discretion-1 | All 4 are either 외감 (DART-required) OR have open investor-relations pages. 쿠팡 is NYSE-listed; SEC filings are public and authoritative. `[ASSUMED]` based on public knowledge. Curator discovery risk is minimal. |
| A6 | TypeScript `bigint` literal syntax (e.g., `1_0000_0000n`) is supported in the project's `target: ES2022` | §Pattern 4 | ES2020 added BigInt; `target: ES2022` definitively includes it. `[VERIFIED: tsconfig.json]` |
| A7 | The Postgres `format_krw()` helper and the JS `formatKRW()` need NOT be byte-identical | §Pattern 4 gotcha | They serve different readers (admin raw DB inspection vs researcher UX). Divergence is acceptable IF documented. `[ASSUMED]` — no explicit decision in Phase 1 or CONTEXT.md. |
| A8 | The single `data_sources` row `id='00000000-0000-0000-0000-000000000001'` is the correct manual-curation source for the entire seed | D-Discretion-1 | Seeded in migration `0003_data_sources.sql` with `source_type='manual'`. `[VERIFIED]` — read migration. |

**Of these, A3 and A7 are worth confirming with the user at plan-phase.** The rest are either verified or low-risk.

## Open Questions

1. **Should `formatKRW` strictly follow D-Discretion-3's "≥ 1000만" rule (produces "1억" for 1억 9,999만원) or render all non-zero parts?**
   - What we know: D-Discretion-3 specifies "when 만 part ≥ 1000만, else just '{억}억원'".
   - What's unclear: Whether 만 part 9,999만 (i.e., 9.999 × 10^7 원) should render as "1억 9,999만원" (intuitive) or "1억원" (strict literal reading).
   - Recommendation: Planner raises this as the first check-in question during Phase 2 discuss-follow-up, recommending "render all non-zero parts" as the sane default. Fix the copy of D-Discretion-3 wording in CONTEXT.md accordingly.

2. **Logo format — PNG-only, SVG-only, or mixed?**
   - What we know: D-Discretion-4 says `public/logos/{slug}.{png|svg}`. Next.js disables SVG optimization by default.
   - What's unclear: Whether to enable `dangerouslyAllowSVG` (security review needed) or restrict to PNG/WebP.
   - Recommendation: Default to PNG for Phase 2; accept SVG only from a whitelisted set of audited vendors; re-evaluate at Phase 4a when R2 integration normalizes storage.

3. **ISR `generateStaticParams()` — pre-render all ~120 seeded companies or let ISR build on-demand?**
   - What we know: With ~120 slugs, pre-rendering costs ~1–2 min of build time; on-demand is zero build cost but adds ~500ms to first visit per slug.
   - Recommendation: Return `[]` (on-demand) for Phase 2; Phase 8 LAUNCH-04 can switch to pre-rendering the top-N slugs once launch metrics exist.

4. **Which FX rate source for seed-time USD conversion?**
   - What we know: `scripts/seed/fx.ts` is a hardcoded table per announce-year.
   - What's unclear: Which source of truth — BoK annual average, IMF, xe.com? D-Discretion-2 says "hardcoded FX table" but doesn't specify source.
   - Recommendation: Use Bank of Korea annual-average rates (공식 출처, publicly archived). Store rate + source in a comment in `fx.ts`. Runtime never calls an FX API.

5. **Should the seed include `profiles.role = 'admin'` for the project owner so the `/admin/*` stub can be smoke-tested end-to-end?**
   - What we know: Phase 1 D-03.3 made role storage JWT-based.
   - Recommendation: OUT OF SCOPE for Phase 2 — seed pipeline only writes canonical company data. Admin setup is a manual Supabase Studio step covered by Phase 4b plan.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | `npm run seed`, vitest, Next dev | ✓ | v24.13.1 (`node --version`) | — |
| npm | package scripts | ✓ | 11.8.0 | — |
| Supabase CLI | local DB for seed-against-local testing | ✗ | — | Seed runs directly against remote Supabase URL (acceptable for Phase 2 since we have exactly one project per D-02.1). Planner may add `supabase` install as a Wave 0 task if local-first test flow is desired. |
| Git | standard | ✓ (implied, repo is live) | — | — |
| Public logo assets | Hero component rendering | ✗ | `public/logos/` directory does not yet exist | **BLOCKING** — Wave 0 must create `public/` and `public/logos/` directories; curator supplies PNG files per company. |
| `vitest.config.ts` | unit tests | ✗ | — | **BLOCKING (Wave 0)** — create with path alias `@/* → src/*` + `environment: 'node'` for pure-function tests + `environment: 'happy-dom'` for RSC render tests. |
| `src/lib/db/schema/` | Drizzle type alignment | ✗ | directory missing | **BLOCKING (Wave 0)** — create schema modules before `lib/data/companies.ts` can type-safely map rows. |

**Missing dependencies with no fallback:**
- `public/logos/` directory (create in Wave 0)
- `vitest.config.ts` (create in Wave 0)
- `src/lib/db/schema/` directory (create in Wave 0)

**Missing dependencies with fallback:**
- `supabase` CLI — seed targets remote project directly; acceptable for Phase 2.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.4 `[VERIFIED: package.json]` |
| Config file | **None yet** — `vitest.config.ts` is a Wave 0 deliverable |
| Quick run command | `npm test` → `vitest run` (repo-wide; ~2s for unit tests) |
| Full suite command | `npm test && npm run test:rls && npm run test:smoke` |
| Per-file run | `npx vitest run tests/unit/format-currency.test.ts -x` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PROF-11 | `formatKRW(null)` → "비공개" | unit | `npx vitest run tests/unit/format-currency.test.ts -t 'null input'` | ❌ Wave 0 |
| PROF-11 | `formatKRW(0n)` → "0원" | unit | `npx vitest run tests/unit/format-currency.test.ts -t 'zero'` | ❌ Wave 0 |
| PROF-11 | `formatKRW(5_000n)` → "5,000원" | unit | `npx vitest run tests/unit/format-currency.test.ts -t '원 tier'` | ❌ Wave 0 |
| PROF-11 | `formatKRW(15_000n)` → "1.5만원" | unit | `npx vitest run tests/unit/format-currency.test.ts -t '만 tier 1-decimal'` | ❌ Wave 0 |
| PROF-11 | `formatKRW(100_000_000n)` → "1억원" | unit | `npx vitest run tests/unit/format-currency.test.ts -t '억 tier'` | ❌ Wave 0 |
| PROF-11 | `formatKRW(2_345_678_900_000n)` → "2조 3,456억원" | unit | `npx vitest run tests/unit/format-currency.test.ts -t '조 tier'` | ❌ Wave 0 |
| PROF-11 | `formatKRW(-1n)` throws | unit | `npx vitest run tests/unit/format-currency.test.ts -t 'negative rejects'` | ❌ Wave 0 |
| TRUST-05 | `freshnessLevel` at day 0 / 30 / 31 / 180 / 181 | unit | `npx vitest run tests/unit/freshness.test.ts` | ❌ Wave 0 |
| TRUST-04 | SourceBadge renders pill with `출처: {sourceLabel} · {date} 업데이트` | unit (component) | `npx vitest run tests/unit/source-badge.test.tsx` (happy-dom) | ❌ Wave 0 |
| PROF-01 | `/ko/companies/toss` returns 200, contains "토스" | smoke | `BASE_URL=... npm run test:smoke` (add Phase 2 suite `phase2-success-criteria.test.ts`) | ❌ Wave 0 |
| PROF-01 | `/ko/companies/unknown-slug` returns 404 | smoke | as above | ❌ Wave 0 |
| PROF-02 | Hero renders `display_name_ko`, sector tag, HQ, website anchor | smoke (fetch + HTML regex) | as above | ❌ Wave 0 |
| PROF-03 | `/ko/companies/toss` HTML contains ≥1 funding-round row with "억원" | smoke | as above | ❌ Wave 0 |
| PROF-08 | Container query CSS present for `.375` viewport (grep `@container` in rendered HTML or computed CSS) | smoke | as above | ❌ Wave 0 |
| PROF-10 | HTML contains both `토스` and `비바리퍼블리카` on `/ko/companies/toss` | smoke | as above | ❌ Wave 0 |
| TRUST-04 (UI) | HTML contains `출처:` string at least once on `/ko/companies/toss` | smoke | as above | ❌ Wave 0 |
| TRUST-05 (UI) | CSS class `text-green-600` OR `text-amber-500` OR `text-red-600` present in rendered HTML | smoke | as above | ❌ Wave 0 |
| TRUST-06 (inherited) | Disclaimer text from `footer.disclaimerText` present on `/ko/companies/toss` | smoke | as above | ❌ Wave 0 |
| ISR | `revalidateTag('company:${slug}')` tag is set in the cache layer | integration | `npx vitest run tests/unit/revalidate-tag.test.ts` (mocks `unstable_cache`) | ❌ Wave 0 |
| Seed idempotency | `npm run seed && npm run seed` produces zero NET row changes | integration | `npx vitest run tests/unit/seed-idempotency.test.ts` against local Supabase | ❌ Wave 0 + local Supabase |
| SRCH-13 prerequisite | Seed includes companies with `display_name_ko OR aliases.alias` matching each of ["토스","토스뱅크","비바리퍼블리카","당근","당근마켓","Coupang","쿠팡"] | unit (parse-seed) | `npx vitest run tests/unit/seed-coverage.test.ts` | ❌ Wave 0 |

### Sampling Rate (Nyquist — per task / per wave / per phase)

- **Per task commit:** `npm test` (unit only, < 3s) — all task-level changes in `src/lib/format/`, `src/lib/data/`, `src/components/profile/` must pass.
- **Per wave merge:** `npm test && npm run test:smoke` with `BASE_URL=http://localhost:3000 NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=...` — requires `npm run dev` running locally. Waves: (W0) scaffolding, (W1) format + data + freshness, (W2) UI components, (W3) page + ISR wire, (W4) seed + content, (W5) smoke + verify.
- **Phase gate (`/gsd-verify-work`):** Full suite green (`npm test && npm run test:rls && npm run test:smoke` with a preview deploy URL) PLUS manual 375px viewport spot-check PLUS Supabase Studio visual confirmation that seed rows landed.

### Nyquist Dimensions (≥2 samples per boundary)

1. **Freshness-dot color correctness across 30/180 boundaries** — sampled at {-1, 30, 31, 180, 181} days (5 samples, covers both boundaries from both sides).
2. **KRW formatter rounding correctness** — sampled at tier boundaries {9999n, 10000n, 99990000n, 100000000n, 199999999n, 1_2000_0000n, 9999_9999_9999n, 1_0000_0000_0000n, 2_345_678_900_000n} (9 samples).
3. **ISR cache tag invalidation shape** — sampled by mocking `unstable_cache` and asserting `tags: ['company:${slug}']` for both an existing and a non-existing slug (2 samples).
4. **RLS honesty** — sampled via existing `tests/rls/rls.test.ts` extension: anon can SELECT on companies + aliases + funding_rounds + identifiers, but cannot INSERT / UPDATE / DELETE (already covered by Phase 1 tests; Phase 2 adds no new tables).

### Wave 0 Gaps

- [ ] `vitest.config.ts` at repo root — path alias `@/* → src/*`, `environment: 'node'` default, `environment: 'happy-dom'` override for `tests/unit/*.tsx`. Install `happy-dom` + `@testing-library/react` as devDependencies if RSC component tests are scoped in.
- [ ] `tests/unit/` directory creation.
- [ ] `tests/smoke/phase2-success-criteria.test.ts` modeled on `phase1-success-criteria.test.ts`.
- [ ] `src/lib/db/schema/` directory + `index.ts` barrel + one file per domain.
- [ ] `public/` directory + `public/logos/` directory + `.gitkeep` if empty at Wave 0 close.
- [ ] `scripts/seed/` skeleton — `seed.ts`, `types.ts`, `fx.ts`, `companies/index.ts`, `companies/CRITICAL.md` (documenting the 4 brand families as load-bearing).
- [ ] `messages/ko.json` `profile.*` namespace placeholder keys.
- [ ] `messages/en.json` mirrored keys with empty strings.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes (inherited) | `@supabase/ssr` session via middleware. Phase 2 adds no new auth surface; `/companies/[slug]` is anon-read by design (D-01.4). |
| V3 Session Management | yes (inherited) | Cookie-based session, Phase 1 `updateSession` middleware. |
| V4 Access Control | yes | RLS is the authoritative access boundary on canonical tables (Phase 1 `0012_rls_canonical.sql`). Phase 2 must not bypass RLS at render time — reads go through anon client (`src/lib/supabase/server.ts`), not service-role. |
| V5 Input Validation | yes | `params.slug` in the dynamic route comes from the URL and is used in `.eq('slug', slug)` — Supabase parameterizes; not SQL-injectable. BUT: validate slug shape (regex `^[a-z0-9-]+$`) before hitting DB to reject obvious abuse and keep 404s fast. |
| V6 Cryptography | no (no crypto in Phase 2) | N/A |
| V7 Error Handling | yes | `error.tsx` must NOT leak stack traces to end users. `profile.error.body` in UI-SPEC is already the user-facing copy. Sentry captures the real error server-side (Phase 1 infra). |
| V8 Data Protection | partial | Logo files in `public/` are public by design (not PII). Seed modules must not contain secrets (enforced by `.gitignore` already blocking `.env*`). |
| V11 Business Logic | yes | Pitfall #11 (seed freshness trap) — manipulating `last_verified_at` to hide stale data is a trust-integrity risk. Unit test enforces honest dates. |
| V12 Files & Resources | yes | `next/image` must reject remote URLs on `logo_url` unless explicitly whitelisted. Phase 2 logos are local paths only (`/logos/*`), which `next/image` accepts without domain config. If Phase 2 late-binds to R2, `next.config.ts` `images.remotePatterns` must be set. |
| V14 Configuration | yes | `next.config.ts` already has Sentry + typedRoutes. If SVG logos enabled, `images.dangerouslyAllowSVG = true` + CSP restrict scripts. |

### Known Threat Patterns for Next 15.5 + Supabase + Drizzle

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via `slug` param | Tampering | Supabase `.eq()` parameterizes; **additionally** slug-shape regex at route boundary. |
| RLS bypass leak in Phase 2 read | Information Disclosure | `lib/data/companies.ts` uses `createClient()` (anon, RLS-honoring), not `createAdminClient()`. `'server-only'` directive on admin module prevents client-bundle leak. |
| SVG XSS via uploaded logo | Tampering / XSS | Commit-time asset review. Recommend PNG-only for v1; if SVG enabled, set CSP + `dangerouslyAllowSVG: true` explicit opt-in. |
| Service-role key leak via seed script | Elevation of Privilege | `scripts/seed/` is outside `src/` (not part of Next bundle). `admin.ts` is `server-only`. CI env guards: `supabase_service_role_key` only present in seeding workflows, never in build workflows. |
| Open-redirect on `website_url` | Tampering | `<a href={company.websiteUrl} target="_blank" rel="noopener noreferrer">` — the `rel` is critical; already in Hero example above. |
| CSRF on seed endpoint | Tampering | N/A — seed is a local script, not an HTTP endpoint. No web surface. |
| Cache poisoning via `revalidateTag` | Tampering | Phase 4a concern (webhook authn). Phase 2 writes no producer code for `revalidateTag` — just wires the tag. |
| Stale-cached sensitive data | Information Disclosure | 1-hour revalidate is intentional per ROADMAP. Admins delete a company via soft-delete (`deleted_at`), which causes the canonical SELECT to return no row → ISR produces 404 on next revalidate. Near-term (≤1h) stale-visibility window is acceptable for a research site. |

## Sources

### Primary (HIGH confidence)

- Phase 1 artifacts (VERIFIED by file reads):
  - `supabase/migrations/0002_enums.sql` — `funding_stage`, `alias_type`, `identifier_kind`, `source_type`, `round_participant_type`, `investor_type`
  - `supabase/migrations/0003_data_sources.sql` — manual data_sources row UUID `00000000-0000-0000-0000-000000000001`
  - `supabase/migrations/0004_companies_and_identity.sql` — companies / aliases / company_identifiers / company_relations
  - `supabase/migrations/0005_funding_investors_persons.sql` — funding_rounds / round_investors / investors
  - `supabase/migrations/0010_indexes_and_tsvector.sql` — `ix_companies_slug`, trigram GIN, `search_tsv`
  - `supabase/migrations/0011_helper_functions.sql` — `format_krw(BIGINT)` SQL helper (existing)
  - `supabase/migrations/0012_rls_canonical.sql` — canonical anon-read, service-write RLS
  - `src/lib/data/_meta.ts` — `WithMeta<T>`, `SourceMeta`, `attachSource`, `attachSourceAll`
  - `src/lib/supabase/server.ts` + `admin.ts`
  - `src/app/[locale]/(public)/layout.tsx` + `page.tsx` + `sources/page.tsx`
  - `src/middleware.ts`, `src/i18n/request.ts`, `src/i18n/routing.ts`
  - `package.json`, `tsconfig.json`, `components.json`, `next.config.ts`, `drizzle.config.ts`
- `.planning/phases/02-read-only-profiles-manual-seed/02-CONTEXT.md` — D-01..D-04, D-Discretion-1..6
- `.planning/phases/02-read-only-profiles-manual-seed/02-UI-SPEC.md` — typography 30/20/14/11, freshness palette, shadcn block list
- `.planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md` — full Phase 1 lock set
- `.planning/ROADMAP.md` — Phase 2 success criteria + pitfalls
- `.planning/REQUIREMENTS.md` — PROF-01..11, TRUST-04..05
- `.planning/STATE.md` — 10 accumulated key decisions

### Secondary (MEDIUM–HIGH, official docs)

- [Next.js `unstable_cache`](https://nextjs.org/docs/app/api-reference/functions/unstable_cache)
- [Next.js `revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [Next.js ISR guide](https://nextjs.org/docs/app/guides/incremental-static-regeneration)
- [Next.js how revalidation works](https://nextjs.org/docs/app/guides/how-revalidation-works)
- [Next.js `Image` component](https://nextjs.org/docs/app/api-reference/components/image)
- [Next.js route segment config `revalidate`](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#revalidate)
- [Tailwind CSS v4 release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind v4 container queries (SitePoint)](https://www.sitepoint.com/tailwind-css-v4-container-queries-modern-layouts/)
- [date-fns Using Locales](https://deepwiki.com/date-fns/date-fns/4.1-using-locales)
- [Supabase seeding your database](https://supabase.com/docs/guides/local-development/seeding-your-database)
- [Supabase RLS best practices (Makerkit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Drizzle ORM — Joins](https://orm.drizzle.team/docs/joins)
- [Drizzle with Supabase (official)](https://supabase.com/docs/guides/database/drizzle)
- [next-intl App Router](https://next-intl.dev/docs/getting-started/app-router)
- [vercel/next.js discussion 64753 — bigint in JSX](https://github.com/vercel/next.js/discussions/64753)

### Tertiary (LOW — noted, not load-bearing)

- Medium blog posts on Next.js 15 caching — referenced to corroborate official docs, not cited as primary.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions VERIFIED via `package.json` + `npm view`; Phase 1 lock sets remain unchanged.
- Architecture patterns: HIGH — ISR + `unstable_cache` + `revalidateTag` pattern verified against Next 15.5 official docs; Supabase nested select verified against RLS migration; Drizzle query-only approach inherited from Phase 1 D-02.2.
- Korean currency boundary rules: MEDIUM — D-Discretion-3 wording has one ambiguous boundary (man-part suppression rule); Assumptions Log A3 flags for user confirmation.
- Pitfalls: HIGH — 10 of 11 pitfalls either directly map to ROADMAP pitfall list (#2, #3, #5, #8, #16) or are stack-mechanical (BigInt in JSX, SVG optimization, typed routes).
- Seed strategy: MEDIUM — D-Discretion-1 is thorough; recommendation depends on A7 (Postgres vs JS helper consistency) which needs user confirmation.
- Nyquist/validation: HIGH — standard vitest patterns; Wave 0 gap list is concrete.

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stack is stable; open questions are user-decision not technology-drift)

## RESEARCH COMPLETE

**Phase:** 2 — Read-Only Profiles + Manual Seed
**Confidence:** HIGH

### Key Findings

- **Phase 2 is a composition phase, not an invention phase.** All required primitives (ISR, unstable_cache, revalidateTag, container queries, date-fns locale, BigInt → ReactNode-safe formatter pattern, `WithMeta<T>` envelope, service-role seed idempotency, `/public/logos/` local asset pattern) are already standard in the locked stack.
- **Wave 0 has 7 concrete scaffolding gaps** (`vitest.config.ts`, `src/lib/db/schema/`, `scripts/seed/`, `public/logos/`, `tests/unit/`, `profile.*` i18n keys, Phase 2 smoke suite) — all must land before feature tasks can begin.
- **Three open questions need user confirmation** at plan-phase: formatter boundary rule A3 (1억 9,999만원 rendering), logo format A7 (PNG vs SVG), and FX source for seed-time USD conversion.
- **4 brand families (토스 / 당근 / 쿠팡 / 배민) are load-bearing** for Phase 3 SRCH-13 regression. A seed-coverage unit test must block if any of the 7 search fixture strings has no matching alias row in the seed.
- **The Postgres `format_krw()` helper already exists** (migration 0011); the JS `formatKRW` serves a different reader (researcher UX vs admin raw) and need not be byte-identical — but this divergence must be documented.
- **BigInt in JSX is the #1 React 19 foot-gun for this phase** — always pipe `amount_minor` through `formatKRW` before rendering; never JSX-interpolate a raw bigint.

### File Created

`c:\workspace\vc-co-finder\.planning\phases\02-read-only-profiles-manual-seed\02-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All versions verified via `npm view` + `package.json` |
| Architecture (ISR / cache / Supabase read) | HIGH | Next 15.5 + @supabase/ssr patterns verified against official docs |
| Currency formatter | MEDIUM | D-Discretion-3 boundary ambiguity flagged (A3) |
| Seed pipeline | HIGH | Supabase service-role seed idiom; idempotency via UPSERT + child delete+insert |
| Validation architecture | HIGH | vitest already in deps; Wave 0 gaps listed concretely |
| Container queries | HIGH | Tailwind v4 built-in, Baseline 2023 browsers |
| Pitfalls | HIGH | 11 named; traceable to ROADMAP #2/#3/#5/#8/#16 or stack mechanics |

### Open Questions

1. `formatKRW` boundary rule (A3) — strict "≥ 1000만" suppression vs intuitive "render all non-zero parts"
2. Logo format — PNG-only vs SVG-enabled (security + optimization tradeoff)
3. FX source for seed-time USD conversion (BoK annual average recommended)
4. Pre-render at build vs ISR on-demand for the ~120 seed slugs
5. Postgres `format_krw()` ↔ JS `formatKRW()` consistency contract (document-only, not code-fix)

### Ready for Planning

Research complete. Planner can now create PLAN.md files with 6 waves (W0 scaffolding, W1 format/data/freshness libs, W2 UI components, W3 page + ISR wire, W4 seed pipeline + content, W5 tests + verify) and emit VALIDATION.md tasks mapping the 17 REQ→test assertions in §Validation Architecture.
