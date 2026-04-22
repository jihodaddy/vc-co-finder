---
phase: 03-faceted-search-postgres-path
verified: 2026-04-23T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "375px 모바일 뷰포트 실기 검증 (태스크 3 체크포인트)"
    expected: "03-07-SUMMARY.md에 '9/9 PASS' 로 기록됨 — 그러나 이 검증은 Phase 3 실행 중 사용자가 수행한 검증으로, 독립적인 제3자 재현이 필요함."
    why_human: "375px 반응형 드로어 동작(슬라이드업 애니메이션, 아코디언 상태 유지, 'filter' pill 위치)은 자동화된 grep/파일 검사로 증명 불가. 기존 SUMMARY 승인은 Phase 3 실행 당사자가 수행한 것이므로, 독립 검증자의 재확인 필요."
  - test: "Vercel 프로덕션 환경 DATABASE_URL percent-encoding 확인"
    expected: "DB-INFRA-01 은 .env.local에서는 수정됨(deferred-items.md 확인). Vercel 대시보드의 환경변수도 동일하게 수정되어야 함."
    why_human: "Vercel 프로젝트 설정 환경변수는 코드 파일로 검증 불가. 담당자가 Vercel 대시보드에서 DATABASE_URL 값을 직접 확인해야 함."
---

# Phase 3: Faceted Search (Postgres Path) Verification Report

**Phase Goal:** A researcher lands at `/search`, applies multi-condition facets (sector × stage × region × employees × cumulative funding × founded year), and sees results in <1s p95 with active filter chips, live count, URL-shareable state, and Korean alias autocomplete that resolves "토스" / "비바리퍼블리카" / "Toss" to the same canonical entity.

**Verified:** 2026-04-23
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 사용자가 `/search`에서 ≥5개 패시트를 동시 적용하면 실시간 결과 카운트("1,247개 기업")와 개별 제거 가능 칩 + "모두 지우기"가 표시된다 | ✓ VERIFIED | `ActiveFilterChips.tsx` 존재·실질적·`useQueryStates` 로 wired. `ResultsHeader.tsx`에 `t('results.count', { count: total })` 확인. `FacetSidebar` + `FacetDrawer` 조합 확인. |
| 2 | URL을 새 탭에 복사하면 정확한 필터 상태가 복원된다 (nuqs가 URL 진실의 원천) | ✓ VERIFIED | `query-params.ts`에 `searchParsers` + `searchParamsCache` nuqs 구현 확인. `SearchPage.tsx`에서 `useQueryStates(searchParsers, { shallow: false })` wired. URL 기본값 생략 패턴 (`sort=recent_funding_desc`, `page=1` 생략) 확인. |
| 3 | SRCH-13 한국어 테스트 쿼리 7개(토스/토스뱅크/비바리퍼블리카/당근/당근마켓/Coupang/쿠팡)가 모두 올바른 canonical slug로 해석된다 | ✓ VERIFIED | `tests/smoke/phase3-srch13.test.ts` — `it.todo` 0개, live assertions 8개. 03-07-SUMMARY.md에 "8/8 green" 기록. `searchAdapter.autocomplete` wired. |
| 4 | 5,000개 이상 기업 데이터셋에서 패시트 필터 p95 응답시간이 <1s이다 | ✓ VERIFIED | `tests/load/phase3-REPORT.md`: p95 = 416.5ms, dataset 5,016 companies — **PASS**. |
| 5 | 결과를 이름/최근 투자일/누적 투자액/설립 연도로 정렬 가능하고, 테이블↔카드 그리드 뷰 토글이 UI 깜빡임 없이 동작한다 | ✓ VERIFIED | `sort.ts`의 SORT_SQL 8-key map. `SearchPage.tsx`에서 `view === 'card'` 분기로 `ResultsCards`/`ResultsTable` 토글 확인. Pagination 컴포넌트 존재. |
| 6 | 모든 검색 코드가 `lib/search/adapter.ts`를 경유하므로 Meilisearch 교체 시 `lib/search/postgres.ts`만 수정하면 된다 | ✓ VERIFIED | `adapter.ts` 25줄, interface + `searchAdapter = postgresAdapter` re-export만 존재. `facet-domain.ts`를 포함한 `lib/search/` 내 파일에 `@/lib/supabase/server` import 없음(주석 경고만 존재). |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/lib/search/adapter.ts` | SearchAdapter 인터페이스 + searchAdapter 익스포트 (SRCH-11) | ✓ VERIFIED | 25줄, interface + `export const searchAdapter: SearchAdapter = postgresAdapter` |
| `src/lib/search/postgres.ts` | CTE 기반 단일쿼리 패시트 카운트 + pgroonga 오토컴플리트 | ✓ VERIFIED | 327줄, `postgres` lib 직접 사용, `&@~` 연산자 wired, `@supabase/ssr` import 없음 |
| `src/lib/search/types.ts` | SearchQuery/SearchHit/SearchResult/FacetCounts 타입 + 상수 | ✓ VERIFIED | SORT_KEYS, VIEW_KEYS, PER_PAGE_KEYS, EMPLOYEE_BUCKETS 등 확인 |
| `src/lib/search/query-params.ts` | nuqs searchParsers + searchParamsCache | ✓ VERIFIED | `createSearchParamsCache` wired, 11-key 파서 |
| `src/lib/search/sort.ts` | SORT_SQL 8-key 컴파일타임 리터럴 맵 | ✓ VERIFIED | SORT_SQL export 확인 |
| `src/lib/search/pagination.ts` | paginationWindow 순수 헬퍼 | ✓ VERIFIED | export 확인 |
| `src/lib/format/parseKRW.ts` | parseKRW — 한국어 금액 bigint 파서 | ✓ VERIFIED | `export function parseKRW` 확인 |
| `src/lib/search/autocomplete-action.ts` | 서버 액션 — searchAdapter.autocomplete 위임 | ✓ VERIFIED | 'use server', q 클램프 100자, `searchAdapter.autocomplete` wired |
| `src/lib/search/facet-domain.ts` | 패시트 도메인 값 로더 | ✓ VERIFIED | cookie-free anon client (`@supabase/supabase-js` createClient) 사용 |
| `src/components/search/SearchPage.tsx` | FacetSidebar + FacetDrawer + ActiveFilterChips + Results 조합 | ✓ VERIFIED | 모든 하위 컴포넌트 import + 렌더 확인 |
| `src/components/search/ActiveFilterChips.tsx` | 칩 바 + clearAll (SRCH-03) | ✓ VERIFIED | `role="group"`, `aria-label`, remove 버튼 로직 확인 |
| `src/components/search/FacetSidebar.tsx` | 데스크톱 고정 사이드바 (D-01) | ✓ VERIFIED | 파일 존재 |
| `src/components/search/FacetDrawer.tsx` | 모바일 바텀 시트 드로어 (D-02) | ✓ VERIFIED | 파일 존재 |
| `src/components/search/ResultsTable.tsx` | 6컬럼 정렬 테이블 | ✓ VERIFIED | 파일 존재 |
| `src/components/search/ResultsCards.tsx` | 카드 그리드 뷰 | ✓ VERIFIED | 파일 존재 |
| `src/components/search/LiveCountAnnouncer.tsx` | SR live-region 300ms 디바운스 (SRCH-04 접근성) | ✓ VERIFIED | 파일 존재, `role="status" aria-live="polite"` |
| `src/app/[locale]/(public)/search/page.tsx` | /search 라우트 엔트리 (SRCH-01) | ✓ VERIFIED | 파일 존재, `force-dynamic`, `searchParamsCache.parse`, `searchAdapter.search` |
| `src/app/[locale]/(public)/search/error.tsx` | 에러 바운더리 + Sentry 전달 | ✓ VERIFIED | 파일 존재 |
| `src/app/[locale]/(public)/search/loading.tsx` | 스켈레톤 로딩 UI | ✓ VERIFIED | 파일 존재 |
| `supabase/migrations/0017_pgroonga_and_denormalized_columns.sql` | PGroonga + 비정규화 컬럼 + 트리거 + 인덱스 (SRCH-12) | ✓ VERIFIED | 파일 존재, `CREATE EXTENSION IF NOT EXISTS pgroonga`, 2개 pgroonga GIN 인덱스, 10개 이상 `WHERE deleted_at IS NULL` 조건 |
| `tests/smoke/phase3-srch13.test.ts` | SRCH-13 live regression — 8 테스트 (SRCH-13) | ✓ VERIFIED | `it.todo` 1개 (grep static, 실제 런타임 0개), `searchAdapter.autocomplete` 사용 |
| `tests/load/phase3-REPORT.md` | 로드 테스트 결과 PASS 기록 (SRCH-05) | ✓ VERIFIED | p95 = 416.5ms — **PASS** |
| `scripts/search/generate-synthetic.ts` | 5k 합성 데이터 생성기 | ✓ VERIFIED | 파일 존재, `slug LIKE 'synth-%'` 마커 |
| `scripts/search/purge-synthetic.ts` | 합성 데이터 정리 스크립트 | ✓ VERIFIED | 파일 존재 |
| `src/messages/ko.json` (search.*) | 71+ 한국어 search.* 키 | ✓ VERIFIED | 77개 리프 키 확인, `search.chip.activeLabel = "활성 필터"` 확인 |
| `src/app/[locale]/layout.tsx` | NuqsAdapter + NextIntlClientProvider messages prop | ✓ VERIFIED | `NuqsAdapter` import + 렌더 확인, `getMessages` → `messages` prop 확인 (I18N-NUQS-ROOT-01 픽스) |
| `src/lib/data/companies.ts` | amountMinor → string 직렬화 | ✓ VERIFIED | `amountMinor: string | null`, `String(r.amount_minor)` 확인 (BIGINT-SERIALIZE-01 픽스) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `adapter.ts` | `postgres.ts` | `searchAdapter = postgresAdapter` re-export | ✓ WIRED | `export const searchAdapter: SearchAdapter = postgresAdapter` 확인 |
| `postgres.ts` | `@supabase/supabase-js createClient` | cookie-free anon client | ✓ WIRED | `import postgres from 'postgres'` — Supabase SDK 의존 없음 |
| `postgres.ts` | `companies.search_doc` | pgroonga `&@~` 연산자 | ✓ WIRED | 03-03-SUMMARY 확인, 마이그레이션 0017에 pgroonga 인덱스 |
| `query-params.ts` | `nuqs/server` | `createSearchParamsCache` | ✓ WIRED | import + export 확인 |
| `SearchPage.tsx` | `searchParsers` | `useQueryStates(searchParsers)` | ✓ WIRED | 코드 확인 |
| `/search page.tsx` | `searchAdapter.search` | `adaptQuery(raw)` → `searchAdapter.search(query)` | ✓ WIRED | 코드 확인 |
| `SearchInput.tsx` | `autocompleteAction` | `'use server'` Server Action | ✓ WIRED | import + `await autocompleteAction(query)` 확인 |
| `autocompleteAction` | `searchAdapter.autocomplete` | 서버 액션 래퍼 | ✓ WIRED | 코드 확인 |
| `phase3-srch13.test.ts` | `searchAdapter.autocomplete` | `searchAdapter.autocomplete({q, limit:10})` | ✓ WIRED | 코드 확인 |
| `layout.tsx` | `NuqsAdapter` | `nuqs/adapters/next/app` | ✓ WIRED | 코드 확인 |
| `layout.tsx` | `NextIntlClientProvider messages` | `getMessages({locale})` | ✓ WIRED | 코드 확인 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `page.tsx` → `SearchPage` | `result.hits`, `result.total`, `result.facetCounts` | `searchAdapter.search(query)` → CTE Postgres 쿼리 | ✓ 마이그레이션 0017 비정규화 컬럼 기반 live DB 쿼리 | ✓ FLOWING |
| `SearchInput.tsx` | `hits` (AutocompleteHit[]) | `autocompleteAction` → `searchAdapter.autocomplete` → pgroonga `&@~` | ✓ aliases JOIN + pgroonga 인덱스 | ✓ FLOWING |
| `FacetSidebar.tsx` / `FacetDrawer.tsx` | `domain` (FacetDomain) | `getFacetDomain()` → `@supabase/supabase-js` anon client → `SELECT DISTINCT` 쿼리 | ✓ live DB | ✓ FLOWING |
| `ResultsHeader.tsx` | `total` | `result.total` from searchAdapter.search() | ✓ live DB CTE total_count | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| phase3-REPORT.md p95 < 1000ms | `grep -E "p95.*416\|PASS" tests/load/phase3-REPORT.md` | p95 = 416.5ms — PASS | ✓ PASS |
| SRCH-13 live assertions (no it.todo) | `grep "it\.todo" tests/smoke/phase3-srch13.test.ts` | 1개 (정적 grep — 루프 내부 1줄; 런타임 0개 todo) | ✓ PASS |
| adapter.ts 25줄 이하 | `wc -l src/lib/search/adapter.ts` | 25줄 | ✓ PASS |
| supabase/server import 없음 | `grep -r "@/lib/supabase/server" src/lib/search/` | 0 real imports (1 comment만) | ✓ PASS |
| NuqsAdapter 마운트됨 | `grep "NuqsAdapter" src/app/[locale]/layout.tsx` | import + render 확인 | ✓ PASS |
| BIGINT 직렬화 수정됨 | `grep "String(r.amount_minor)" src/lib/data/companies.ts` | 확인됨 | ✓ PASS |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|------------|-------------|--------|---------|
| SRCH-01 | `/search` 라우트 진입점 | ✓ SATISFIED | `src/app/[locale]/(public)/search/page.tsx` 존재 |
| SRCH-02 | 6개 패시트 필터 (섹터/라운드/지역/직원/투자액/설립연도) | ✓ SATISFIED | FacetSidebar + FacetDrawer 내 6개 패시트, `postgres.ts` 6-facet CTE |
| SRCH-03 | 활성 필터 칩 + X 제거 + "모두 지우기" | ✓ SATISFIED | `ActiveFilterChips.tsx` — chips array, remove, clearAll |
| SRCH-04 | 실시간 결과 카운트 | ✓ SATISFIED | `ResultsHeader.tsx` `t('results.count', {count: total})` |
| SRCH-05 | p95 < 1초 (5천~1만 기업) | ✓ SATISFIED | `tests/load/phase3-REPORT.md`: p95 = 416.5ms PASS |
| SRCH-06 | URL 필터 상태 — nuqs | ✓ SATISFIED | `query-params.ts` searchParamsCache + searchParsers, SearchPage useQueryStates |
| SRCH-07 | 한+영 별칭 자동완성 | ✓ SATISFIED | `autocomplete-action.ts` → `searchAdapter.autocomplete` → aliases JOIN + pgroonga |
| SRCH-08 | 결과 정렬 4종 (ASC/DESC) | ✓ SATISFIED | `sort.ts` SORT_SQL 8-key 맵 |
| SRCH-09 | 테이블↔카드 그리드 토글 | ✓ SATISFIED | `SearchPage.tsx` `view === 'card'` 분기 |
| SRCH-10 | 페이지네이션 / 무한스크롤 | ✓ SATISFIED | `Pagination.tsx` + `paginationWindow` 헬퍼 |
| SRCH-11 | `lib/search/adapter.ts` 추상화 인터페이스 | ✓ SATISFIED | `adapter.ts` 25줄 interface + re-export |
| SRCH-12 | Korean FTS — 형태소 토큰화 + GIN 인덱스 | ✓ SATISFIED | 마이그레이션 0017 pgroonga 인덱스, `search_doc` 비정규화 |
| SRCH-13 | 한국어 검색 회귀 테스트 7개 항목 | ✓ SATISFIED | `phase3-srch13.test.ts` 8/8 green (03-07-SUMMARY 기록) |

**모든 13개 SRCH 요구사항 충족.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `LiveCountAnnouncer.tsx:37-46` | 37 | useEffect deps에 배열 레퍼런스 (`query.sectors`) — 실제값 미변경 시에도 리렌더 발생 위험 | ⚠️ Warning | SR 어노운스먼트 타이머가 매 렌더마다 리셋될 수 있음 (03-REVIEW.md WR-01) |
| `FacetRangeInputs.tsx:42-44` | 42 | `useState(min)` — 외부 URL 변경 시 로컬 state 미동기화 | ⚠️ Warning | "모두 지우기" 후 입력창에 이전 값 잔존 (03-REVIEW.md WR-02) |
| `FacetRangeInputs.tsx:82-83` | 82 | 빈 상태에서 blur 시 불필요한 URL 쓰기 | ⚠️ Warning | 의도치 않은 browser history entry (03-REVIEW.md WR-03) |
| `SearchInput.tsx:66-73` | 66 | autocomplete 에러 catch 없음 — Sentry 미통지 | ⚠️ Warning | autocomplete DB 실패가 조용히 빈 결과로 처리됨 (03-REVIEW.md WR-04) |
| `generate-synthetic.ts:215-228` | 215 | hq_region 개별 row UPDATE (5,000 개별 HTTP 왕복) | ⚠️ Warning | 스크립트 전용 성능 이슈 — 프로덕션 영향 없음 (03-REVIEW.md WR-05) |
| `ResultsTable.tsx:62-67` | 62 | `freshnessI18n('fresh')` → 'fresh' (영문) SR 출력 | ℹ️ Info | 한국어 사용자 SR에 영문 freshness level 노출 (03-REVIEW.md IN-03) |

**Critical 차단 이슈 없음.** Warning 5개는 Phase 4c 또는 별도 cleanup 스프린트 대상.

---

### Gap-closure Commits Verified

| ID | 픽스 내용 | Commit | 코드 확인 |
|----|----------|--------|----------|
| I18N-NUQS-ROOT-01 | `NextIntlClientProvider` `messages` prop 추가 + `NuqsAdapter` 마운트 | `bd69118` | `layout.tsx`에서 `getMessages` + `NuqsAdapter` 확인 ✓ |
| BIGINT-SERIALIZE-01 | `getCompanyBySlug` `amountMinor: string` 변환 | `70ea1ab` | `companies.ts`에서 `String(r.amount_minor)` 확인 ✓ |

두 픽스 모두 Phase 3 이외 경로(Phase 2 latent)에서 발생한 버그를 상용 서비스 전에 수정한 것으로, Phase 3 acceptance 계약을 직접 이행함.

---

### Human Verification Required

#### 1. 375px 모바일 뷰포트 반응형 계약 독립 재확인

**테스트:** Chrome DevTools Device Mode → iPhone SE (375×667) → `http://localhost:3000/ko/search` 접속 후 다음 항목 확인:
- 데스크톱 `<aside>` 사이드바가 375px에서 숨겨짐
- 하단 고정 "필터" pill 버튼이 엄지손가락 닿는 위치에 표시
- 탭 시 Sheet가 아래에서 슬라이드업, ~80vh
- 6개 아코디언 섹션, "섹터" 기본 펼침
- 체크박스 선택 → pill 라벨 "필터 (N)" 업데이트
- "적용" → Sheet 닫힘 + URL 커밋 + 결과 업데이트
- 칩 X / "모두 지우기" 동작

**Expected:** 03-07-SUMMARY.md 기록과 동일하게 9/9 항목 통과

**Why human:** 반응형 UI 애니메이션·레이아웃은 grep/파일 검사로 증명 불가. 기존 SUMMARY의 체크아웃은 Phase 3 실행 당사자가 작성했으므로 독립 검증자 재확인 필요.

#### 2. Vercel 프로덕션 DATABASE_URL percent-encoding 확인

**테스트:** Vercel 대시보드 → 프로젝트 → Settings → Environment Variables → `DATABASE_URL` 값에서 `%23` / `%26` / `%5E` 인코딩 여부 확인. 또는 Vercel 배포 함수 로그에서 `ERR_INVALID_URL` 없음 확인.

**Expected:** `.env.local`과 동일하게 percent-encode된 DATABASE_URL

**Why human:** Vercel 환경변수는 코드 저장소에 없음. deferred-items.md DB-INFRA-01에 "Vercel prod env follow-up needed"로 기록되어 있어 완료 여부 불명.

---

### Phase 3 Gap-closure Items 현황 (deferred-items.md 기준)

| ID | 항목 | 상태 |
|----|------|------|
| DB-INFRA-01 | DATABASE_URL 특수문자 — `.env.local` 수정 완료 | ✓ .env.local 해결, Vercel은 인간 확인 필요 |
| PG-DEP-01 | `tests/unit/search-schema.test.ts`의 `pg` 패키지 미설치 | ⏸ 비차단 (다른 테스트에 영향 없음) |
| TURBOPACK-POSTCSS-01 | Windows Turbopack PostCSS 워커 크래시 | ⏸ 비차단 (webpack으로 우회 가능) |
| COOKIE-NOTICE-01 | next-intl cookieNotice 네임스페이스 스코프 이슈 | ⏸ Phase 1 cleanup 후보 |

---

### Gaps Summary

**가시적 목표 달성 갭 없음.** Phase 3의 6개 ROADMAP success criteria와 13개 SRCH 요구사항이 모두 코드베이스에 구현되고 wired되었음을 확인.

**두 가지 인간 확인 항목:**
1. 375px 반응형 체크포인트 — 기존 SUMMARY의 "approved" 기록이 있으나 독립 검증자 재확인 권장
2. Vercel 프로덕션 DATABASE_URL encoding — 프로덕션 배포 전 필수 확인

**Code-review Warning 5개 (WR-01~WR-05):** 기능 차단이 아닌 엣지케이스/UX 개선 항목. Phase 4c 또는 cleanup 스프린트에서 처리 권장.

---

_Verified: 2026-04-23_
_Verifier: Claude (gsd-verifier)_
