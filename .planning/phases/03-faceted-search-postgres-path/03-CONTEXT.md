# Phase 3: Faceted Search (Postgres Path) - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliverable: `/search` 라우트 — 6개 패시트(섹터 × 라운드 단계 × 지역 × 직원 수 × 누적 투자액 × 설립 연도)를 동시 적용해 5천~1만 기업을 **p95 <1초**에 필터하고, active filter chip + 실시간 결과 카운트 + URL-공유 가능한 상태 + 한국어 alias autocomplete(토스/비바리퍼블리카/Toss 상호 매칭)을 제공한다.

**In scope (Phase 3):**
- `/search` route + results view + facet panel
- Active filter chips + "모두 지우기" bar
- URL state via `nuqs` (shareable/bookmarkable)
- Korean alias autocomplete (aliases 테이블 기반)
- Sort (이름 / 최근 투자일 / 누적 투자액 / 설립 연도, ASC/DESC)
- View toggle (table ⇄ card grid)
- Pagination
- Korean FTS — app-side 형태소 토큰화 + GIN trigram
- `lib/search/adapter.ts` 추상화 (Meilisearch v2 swap 대비)
- 한국어 회귀 테스트: `["토스","토스뱅크","비바리퍼블리카","당근","당근마켓","Coupang","쿠팡"]`

**Out of scope (other phases):**
- 자연어/시맨틱 검색(LLM) — Phase v2 (SRCH-V2-01)
- "as-of date" 시점 슬라이더 — Phase v2 (SRCH-V2-02)
- DART ETL 데이터 (Phase 4a)
- 사용자 계정 기반 저장 검색 / 워치리스트 (Phase 4c)
- 시계열 차트 / 비교 뷰 (Phase 6)

</domain>

<decisions>
## Implementation Decisions

### Facet Panel Layout

- **D-01 (Desktop ≥640px)**: 좌측 고정 sidebar (280-320px). 6개 facet 그룹 **모두 펼쳐짐** (accordion 아님). 각 그룹 내부에 항목이 많으면 "show more/less" (예: sector 기본 8개 + 더보기). innoforest/AngelList 벤치마크 매칭 — 리서처가 "what's available" 한 눈에 스캔 가능.

- **D-02 (Mobile <640px)**: Bottom sheet drawer. 상단 '필터' 버튼 (active filter 개수 badge 포함, 예: "필터 3"). 탭하면 80% 높이로 슬라이드 업, 내부는 6개 accordion. "적용" 버튼으로 닫기.

- **D-03 (Active filter chip bar)**: 결과 영역 상단에 **별도** chip row + "모두 지우기" 링크. sidebar/drawer 내부 체크 상태와 중복되지만 의도적 — chip bar는 "summary + quick remove" 역할, sidebar는 "전체 available 필터" 역할. ROADMAP SC #1 verbatim 준수.

- **D-04**: 6개 facet 그룹 순서 (시각 좌→우·상→하 우선순위):
  1. 섹터 (다중 체크박스)
  2. 라운드 단계 (다중 체크박스, Phase 1 `funding_stage` ENUM 전체)
  3. 지역 (다중 체크박스, 시드 데이터 기반으로 enum화)
  4. 직원 수 (range)
  5. 누적 투자액 (range)
  6. 설립 연도 (range)

### Results View

- **D-05 (Default view)**: **테이블**. 컬럼: 이름 · 섹터 · 최신 라운드 · 누적 투자액 · 직원 수 · 설립 연도. Sort clickable headers.

- **D-06 (View toggle)**: SRCH-09 따라 table ⇄ card grid 토글 제공. 사용자 선택은 URL에 반영 (`?view=table|card`). 기본값은 table.

- **D-07 (Default sort)**: **최근 투자일 DESC** (`funding_rounds.announced_at DESC NULLS LAST`). "what's hot" 응답이 리서처의 주된 쿼리 타입. NULL(공시 없음)은 후행.

- **D-08 (Sort options)**: 이름 ASC/DESC · 최근 투자일 ASC/DESC · 누적 투자액 ASC/DESC · 설립 연도 ASC/DESC. URL에 `?sort=recent_funding_desc` 형식.

### Pagination

- **D-09**: **숫자 페이지네이션** (Load more / 무한 스크롤 아님). `?page=2&per_page=25`. URL에 페이지 반영 → 딥링크 공유. Postgres `OFFSET` + `LIMIT`. `per_page` 기본 25, 옵션 50/100.

### Claude's Discretion

다음 영역은 RESEARCH + planner가 결정 (user decision locked 아님):

- **Korean tokenization architecture (SRCH-12)**: Python ETL / Postgres 확장 / 앱-사이드 중 선택. Phase 4a ETL 시작 전이라 Python 파이프라인이 아직 없을 수 있음 — RESEARCH가 Supabase의 `pg_cjk_parser` 사용 가능 여부 확인 후 결정. 핵심 요구: SRCH-13 회귀 세트 모두 합리적 결과.
- **Autocomplete scope + placement (SRCH-07)**: 기업명 전용 필드 vs 전역 통합 vs 각 facet 내부. 토스↔비바리퍼블리카↔Toss 매칭은 필수 — aliases 테이블 join으로 처리.
- **Range facet UX**: dual-slider / from-to 숫자 입력 / 종사자 구간 버튼 중 선택. 종사자 구간(1-10 / 11-50 / 51-200 / 201-500 / 501-1000 / 1000+)은 업계 표준. 투자액/연도도 유사 bucket화 검토.
- **Empty/zero-result state**: "0개 기업" 단순 표시 vs 필터 완화 제안 vs 대표 기업 추천.
- **Loading + skeleton**: 결과 로딩 중 skeleton rows vs stale content fade. p95 <1s 목표라 skeleton 덜 중요할 수 있음.
- **URL state encoding**: comma-separated lists (`?sectors=fintech,ai`) vs repeated params. ROADMAP 예시는 comma 방식 — 그 방향 권장하나 nuqs 기본 format 따름도 OK.
- **Sidebar 내부 섹션 제목 i18n**: `search.facet.sector.label` 등 key 구조는 planner가 결정.

### Carry-forward (prior phases lock 유지)

- **Phase 1**: next-intl `t()` 모든 한국어, no hardcoded Korean in JSX. Tailwind v4 + shadcn/ui. RLS `canonical_select_public` 통해 anon 접근.
- **Phase 2**:
  - `formatKRW` (`src/lib/format/currency.ts`) — 누적 투자액 컬럼에 재사용
  - `stageLabel` (`src/lib/format/stage.ts`) — 라운드 단계 chip/필터 레이블
  - `freshnessLevel` + `FRESHNESS_DOT_CLASS` — 검색 결과 테이블에도 마지막 업데이트 신선도 표시 가능 (권장, D-03 Phase 2 규약 준수)
  - `formatProfileDate` — 최근 투자일 컬럼
  - `WithMeta<T>` pattern — 각 결과 행은 source 정보 가짐 (하지만 SRCH 행에는 SourceBadge 생략 — 리스팅 밀도 우선, per-row badge는 `/companies/[slug]`만)
  - 쿼리 시 cookie-free anon client (`src/lib/supabase/*` 패턴)
  - `@container` + shadcn blocks + `@vitejs/plugin-react` in vitest.config

### Folded Todos

(none — Phase 2 완료 직후 todo 백로그에 Phase 3 관련 항목 없음)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` §Phase 3 — goal + 6개 success criteria + pitfalls addressed
- `.planning/REQUIREMENTS.md` §SRCH-01 ~ §SRCH-13 — 13개 requirement 전체
- `.planning/PROJECT.md` — tone (Stripe/Linear 톤), "ONE thing = 다중 조건 패시트 필터" principle

### Technology stack constraints
- `CLAUDE.md` — v1 tech stack (Next.js 15.5 + Supabase + Tailwind v4 + shadcn/ui + nuqs + Drizzle)
- `CLAUDE.md` §Faceted Search Phased Strategy — v1 Postgres + GIN, v2 Meilisearch swap
- `CLAUDE.md` §Korean-Specific Concerns — morpheme tokenization approaches

### Prior phase artifacts (reuse/consistency)
- `.planning/phases/02-read-only-profiles-manual-seed/02-CONTEXT.md` — D-Discretion-1 (Stripe tone), D-Discretion-4 (logos PNG only), D-05 (i18n pattern)
- `.planning/phases/02-read-only-profiles-manual-seed/02-02-SUMMARY.md` — formatKRW/freshnessLevel/stageLabel API shapes
- `.planning/phases/02-read-only-profiles-manual-seed/02-03-SUMMARY.md` — `getCompanyBySlug` pattern; cookie-free anon client
- `.planning/phases/02-read-only-profiles-manual-seed/02-05-SUMMARY.md` — SRCH-13 cold-start seed set present (토스/당근/쿠팡/배민 + 11 diversity)
- `.planning/phases/02-read-only-profiles-manual-seed/02-06-SUMMARY.md` — smoke test harness pattern + SMOKE_BASE_URL convention
- `src/components/profile/SourceBadge.tsx` — UI-SPEC §Color Freshness 팔레트 단일 원천
- `src/lib/db/schema/*.ts` — Drizzle schema barrel (companies/aliases/funding/identifiers)

### Database schema authority
- `supabase/migrations/0002_enums.sql` — `funding_stage`, `alias_type` ENUMs
- `supabase/migrations/0004_companies_and_identity.sql` — `companies`, `aliases` 스키마 + unique constraints
- `supabase/migrations/0005_funding_investors_persons.sql` — `funding_rounds`, `round_investors`
- `supabase/migrations/0010_indexes_and_tsvector.sql` — 기존 GIN 전략 + tsvector 컬럼 (확장할 수 있음)
- `supabase/migrations/0012_rls_canonical.sql` — anon SELECT 허용 정책

### Existing UI components (reuse over rebuild)
- `src/components/profile/*.tsx` — 7개 프로필 컴포넌트 (CompanyLogo는 결과 카드 뷰에서 재사용)
- `src/components/ui/*.tsx` — shadcn badge/table/separator (이미 인라인 작성됨; button/input/checkbox/slider는 Wave 추가 시 동일 패턴으로)
- `src/components/site/mobile-nav.tsx` — bottom drawer pattern 참고 가능

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/format/{currency,date,stage}.ts` — 통화/날짜/단계 포맷 (결과 테이블 컬럼에 그대로 사용)
- `src/lib/data/freshness.ts` — 신선도 계산 (결과 행에 신선도 도트 추가 시)
- `src/lib/db/schema/index.ts` — Drizzle schema barrel (companies/aliases/funding_rounds/company_identifiers)
- `tests/__mocks__/server-only.ts` vitest alias — 서버 전용 helper 단위 테스트 가능
- `scripts/seed/_push_migrations.cjs` — migration push 헬퍼 (Phase 3 신규 마이그레이션 시)

### Established Patterns
- **ISR + unstable_cache**: profile 페이지에서 검증됨. 검색은 URL state 덕에 ISR 과 결합 가능하지만, active filter combinations이 cardinality 높아 `revalidate`보다 요청별 fresh 쿼리가 더 적합할 수 있음 — RESEARCH가 결정.
- **쿠키 없는 anon client**: `createClient` from `@supabase/supabase-js` + anon key. RLS가 보안 경계. 패턴은 `src/lib/data/companies.ts:createAnonClient`.
- **@vitejs/plugin-react + happy-dom**: TSX 유닛 테스트 가능 (Wave에 React 테스트 들어가면).

### Integration Points
- 새 라우트: `src/app/[locale]/(public)/search/page.tsx` — `(public)` 그룹이 layout + footer disclaimer + header nav 자동 포함
- i18n 키: `src/messages/{ko,en}.json` → `search.*` namespace 신설 (facet labels, result columns, empty states, sort labels)
- 검색 라이브러리: `src/lib/search/` (신규 디렉토리) — adapter.ts + postgres.ts
- URL state: `nuqs` 라이브러리는 CLAUDE.md에서 이미 stack 확정
- 새 마이그레이션 예상: 0017+ (search_tokens / denormalized 필드 / 추가 인덱스)

### Creative Constraints
- **p95 <1s @ 5k-10k rows**: 인덱싱 전략이 핵심. GIN on tsvector + per-facet partial index + covering index for common combinations.
- **Korean tokenization**: 띄어쓰기 없이 "토스뱅크"가 "토스" 검색어에 매칭되려면 형태소 토큰 또는 bigram. 단순 `LIKE '%토스%'`로도 15개 시드에선 통과하나 Phase 8 ≥5k에서 깨짐.
- **URL length**: 5개 facet × 다중 값 + sort + page + view → URL이 길어질 수 있음. nuqs의 compressed encoder 고려.

</code_context>

<specifics>
## Specific Ideas

- **innoforest.co.kr 벤치마크**: 좌측 sidebar + 테이블 기본 뷰 + 숫자 페이지네이션. ROADMAP가 명시한 벤치마크와 일치.
- **ROADMAP SC #1 예시 URL**: `/search?sectors=fintech,ai&stage=series_a,series_b&region=KR&employees=50-500` — 이 형태가 URL encoding contract.
- **ROADMAP SC #3 테스트 세트**: `["토스","토스뱅크","비바리퍼블리카","당근","당근마켓","Coupang","쿠팡"]` — Phase 3 acceptance 필수.
- **ROADMAP SC #4 목표**: p95 <1s @ ≥5,000 companies. Phase 2 시드는 15개이므로 Phase 3 CI 로드 테스트는 생성된 합성 데이터로 수행 가능 (fixture script).
- **ROADMAP SC #6**: `lib/search/adapter.ts` 추상화 — Meilisearch v2 swap은 `postgres.ts`만 교체.

</specifics>

<deferred>
## Deferred Ideas

- **자연어/시맨틱 검색 (LLM 기반)** → SRCH-V2-01, Phase 후속
- **시점 슬라이더 "as-of date"** → SRCH-V2-02, 스냅샷 스키마 필요
- **상세 검색 결과 내 per-row SourceBadge** — /companies/[slug]에만 렌더, 리스팅은 밀도 우선 (Phase 2 D-01 rule 확장)
- **검색 결과 CSV/Excel 내보내기** → Phase 7 (EMAIL-04)
- **저장된 검색 + 이메일 알림** → Phase 4c (USER-02) + Phase 7 (EMAIL-01)

</deferred>

---

*Phase: 03-faceted-search-postgres-path*
*Context gathered: 2026-04-22*
