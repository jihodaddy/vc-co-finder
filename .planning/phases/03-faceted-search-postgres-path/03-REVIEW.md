---
phase: 03-faceted-search-postgres-path
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 52
files_reviewed_list:
  - scripts/search/generate-synthetic.ts
  - scripts/search/purge-synthetic.ts
  - src/app/[locale]/(public)/search/error.tsx
  - src/app/[locale]/(public)/search/loading.tsx
  - src/app/[locale]/(public)/search/page.tsx
  - src/app/[locale]/layout.tsx
  - src/components/search/ActiveFilterChips.tsx
  - src/components/search/AutocompleteList.tsx
  - src/components/search/FacetCheckboxList.tsx
  - src/components/search/FacetDrawer.tsx
  - src/components/search/FacetGroup.tsx
  - src/components/search/FacetRangeBuckets.tsx
  - src/components/search/FacetRangeInputs.tsx
  - src/components/search/FacetSidebar.tsx
  - src/components/search/LiveCountAnnouncer.tsx
  - src/components/search/Pagination.tsx
  - src/components/search/ResultsCards.tsx
  - src/components/search/ResultsEmpty.tsx
  - src/components/search/ResultsHeader.tsx
  - src/components/search/ResultsSkeleton.tsx
  - src/components/search/ResultsTable.tsx
  - src/components/search/SearchInput.tsx
  - src/components/search/SearchPage.tsx
  - src/components/search/SortTrigger.tsx
  - src/components/search/ViewToggle.tsx
  - src/components/ui/accordion.tsx
  - src/components/ui/button.tsx
  - src/components/ui/checkbox.tsx
  - src/components/ui/command.tsx
  - src/components/ui/dropdown-menu.tsx
  - src/components/ui/input.tsx
  - src/components/ui/popover.tsx
  - src/components/ui/select.tsx
  - src/components/ui/sheet.tsx
  - src/components/ui/skeleton.tsx
  - src/lib/data/companies.ts
  - src/lib/data/freshness.ts
  - src/lib/format/currency.ts
  - src/lib/format/parseKRW.ts
  - src/lib/search/adapter.ts
  - src/lib/search/autocomplete-action.ts
  - src/lib/search/facet-domain.ts
  - src/lib/search/pagination.ts
  - src/lib/search/postgres.ts
  - src/lib/search/query-params.ts
  - src/lib/search/sort.ts
  - src/lib/search/types.ts
  - supabase/migrations/0017_pgroonga_and_denormalized_columns.sql
  - tests/integration/search-drift.test.ts
  - tests/load/_stub-server-only.cjs
  - tests/load/phase3-load.ts
  - tests/smoke/phase3-srch13.test.ts
  - tests/smoke/phase3-success-criteria.test.ts
  - tests/unit/companies-data.test.ts
  - tests/unit/facet-range.test.tsx
  - tests/unit/facet-sidebar.test.tsx
  - tests/unit/filter-chips.test.tsx
  - tests/unit/pagination-window.test.ts
  - tests/unit/parse-krw.test.ts
  - tests/unit/search-adapter.test.ts
  - tests/unit/search-fixtures.ts
  - tests/unit/search-postgres.test.ts
  - tests/unit/search-query-params.test.ts
  - tests/unit/search-schema.test.ts
  - tests/unit/search-sort.test.ts
findings:
  critical: 0
  warning: 5
  info: 8
  total: 13
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-04-22
**Depth:** standard
**Files Reviewed:** 52
**Status:** issues_found

## Summary

Phase 3 (faceted search — Postgres path) 구현을 standard depth 로 검토했습니다. 전반적으로 구현 품질이 매우 높습니다 — RESEARCH/PLAN 에서 식별된 피트폴 (Phase 2 Pitfall #5 cookies-in-cache, T-03-03-02 sort injection, T-03-03-01 negative KRW, T-03-03-05 facet array explosion)이 코드 레벨에서 방어가 되어 있고, 테스트 커버리지 (unit + smoke + integration + load) 도 각 threat 을 추적할 수 있습니다.

SQL injection 방어 (bound parameters + allowlist ORDER BY), PGroonga 검색 (partial index + deleted_at predicate), 세션-쿠키 분리 (anon 클라이언트), BigInt 직렬화, i18n 강제 (하드코딩된 한국어 없음), 접근성 (aria-* + fieldset/legend + role=radiogroup) 까지 체크 완료.

**Critical issue 없음.** 발견된 5개의 warning 과 8개의 info 는 대부분 엣지 케이스, 방어적 코딩, 일관성 개선 영역입니다. 가장 주목할 만한 것은 WR-01 (LiveCountAnnouncer useEffect 의존성 누락) — 기능적으로는 작동하지만 의도와 코드가 어긋난 경우로, 추후 리팩토링 시 혼란의 원인이 될 수 있습니다.

## Warnings

### WR-01: LiveCountAnnouncer — useEffect deps 주석 주장이 실제 코드와 불일치

**File:** `src/components/search/LiveCountAnnouncer.tsx:37-46`
**Issue:** 주석 (16-22줄) 은 "키잉을 개별 URL params 로 하는 이유는 `useQueryStates` 가 매 렌더 fresh object 를 반환하기 때문"이라고 명시하지만, 실제 dependency array 에 들어간 `query.sectors / query.stage / query.region` 은 **배열 레퍼런스** 입니다. nuqs `useQueryStates` 의 구현 상 배열은 매 렌더마다 새 레퍼런스를 반환할 가능성이 높으므로 (실제 값이 바뀌지 않아도) — 이는 주석이 해결하려던 "reference identity changes even when values don't" 문제 그 자체를 그대로 재현합니다. 결과적으로 debounce timer 가 실제 값 변경이 없어도 반복 재시작되어, 매 렌더마다 300ms 타이머가 리셋될 위험이 있습니다.

**Fix:**
```tsx
// 안정적인 원시 키로 변환 (JSON.stringify 또는 .join 등)
useEffect(() => {
  const timer = setTimeout(() => setAnnounced(count), 300);
  return () => clearTimeout(timer);
}, [
  count,
  query.q,
  query.sectors.join(','),
  query.stage.join(','),
  query.region.join(','),
  query.employees,
  query.funding,
  query.founded,
]);
```

### WR-02: FacetRangeInputs — query[paramKey] 변경 시 local state 가 동기화되지 않음

**File:** `src/components/search/FacetRangeInputs.tsx:42-44`
**Issue:** `useState(min)` / `useState(max)` 는 **최초 마운트 시의 URL 값** 으로만 초기화됩니다. URL 이 외부 요인 (예: 다른 컴포넌트의 `setQuery`, browser back/forward, 외부 링크 네비게이션) 으로 변경되어도 local `minTxt/maxTxt` state 가 업데이트되지 않습니다. 특히 `ActiveFilterChips` 의 "모두 지우기" 버튼이 `funding: ''` 을 설정한 뒤에도, `FacetRangeInputs` 의 입력창은 이전 값을 유지합니다.

**Fix:** `useEffect` 로 URL 변경을 local state 에 반영하거나 controlled pattern 으로 전환:
```tsx
// Option A: URL 변경을 local state 에 싱크
const { min: urlMin, max: urlMax } = parseRange(query[paramKey]);
useEffect(() => {
  setMinTxt(urlMin);
  setMaxTxt(urlMax);
  setInvalid(false);
}, [query[paramKey]]);
```

### WR-03: FacetRangeInputs — 100% empty commit 시 불필요한 URL 쓰기

**File:** `src/components/search/FacetRangeInputs.tsx:82-83`
**Issue:** 입력창이 이미 비어 있는 상태에서 blur 가 발생하면 `setQuery({ [paramKey]: '', page: 1 })` 이 호출되어 `page` 를 1 로 리셋합니다. 사용자가 입력 없이 포커스 → blur 만 한 경우에도 URL history entry 가 생성되어 browser back 동작이 꼬일 수 있습니다 (shallow: false 이므로 router.push 가 발생).

**Fix:** current URL 값과 diff 가 있을 때만 commit:
```tsx
const nextVal = !minVal && !maxVal ? '' : `${minVal}-${maxVal}`;
if (nextVal === query[paramKey]) return; // no-op if unchanged
void setQuery({ [paramKey]: nextVal, page: 1 });
```

### WR-04: SearchInput — autocomplete 에러가 무시됨 (Sentry 통지 없음)

**File:** `src/components/search/SearchInput.tsx:66-73`
**Issue:** `autocompleteAction(query)` 가 throw 하면 `try…finally` 의 finally 블록만 실행되고 **catch 가 없어서** React `startTransition` 내부의 unhandled rejection 으로 올라갑니다. `error.tsx` 의 Sentry 훅은 페이지 레벨 에러 경계에서만 동작하므로, autocomplete 서버 액션의 transient 실패 (DB 연결 끊김, PGroonga 쿼리 타임아웃 등) 가 관측되지 않고 조용히 빈 popover 로 끝납니다. 사용자는 "검색이 안 된다" 를 알지만 팀은 모릅니다.

**Fix:**
```tsx
try {
  const res = await autocompleteAction(query);
  setHits(res);
  setOpen(true);
} catch (e) {
  // Let Sentry see the error; keep popover empty for graceful degradation.
  Sentry.captureException(e, { tags: { component: 'SearchInput' } });
  setHits([]);
} finally {
  setLoading(false);
}
```

### WR-05: generate-synthetic.ts — 소량 alias 일 때 .in() URL 길이 경고 누락과 무관하게 chunk 로직이 purge 에만 있음

**File:** `scripts/search/generate-synthetic.ts:215-228`
**Issue:** hq_region 백필에서 각 row 를 개별 `UPDATE` 로 발사합니다 (5000 rows 당 5000 개별 HTTP round-trip). 주석은 "update in batches" 지만 실제로는 chunk loop 내부에서 per-row update 를 합니다. purge 스크립트는 올바르게 `in()` 청크를 쓰는데 synth generator 에서는 그렇지 않아, 5k 기업 생성 시 이 단계가 **병목이 됩니다 (수 분)**.

이건 v1 품질/안정성 이슈는 아니지만 (스크립트 전용, 프로덕션 영향 없음), 향후 `10k synth` 실험 시 에러 복구 재실행이 지연됩니다.

**Fix:** 동일 region 값으로 묶어서 `in()` 기반 bulk UPDATE:
```ts
// Group by target hq_region, then bulk update with in('id', chunk)
const byRegion = new Map<string, string[]>();
for (const u of updates) {
  if (!byRegion.has(u.hq_region)) byRegion.set(u.hq_region, []);
  byRegion.get(u.hq_region)!.push(u.id);
}
for (const [region, ids] of byRegion) {
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { error } = await supa.from('companies').update({ hq_region: region }).in('id', chunk);
    if (error) { console.error('[synth] hq_region bulk update error:', error); break; }
  }
}
```

## Info

### IN-01: page.tsx — adaptQuery 에서 NaN 입력이 undefined 로 전파

**File:** `src/app/[locale]/(public)/search/page.tsx:67-70, 87-89`
**Issue:** `parseInt('', 10)` → `NaN`, `parseInt('abc', 10)` → `NaN`. 현재 코드는 `a ? parseInt(a, 10) : undefined` 만 체크하므로, "1a-200" 같은 URL 은 `min: NaN, max: 200` 으로 전파됩니다. 다행히 `postgres.ts` 는 이를 `$6::int IS NULL` 로 막지만 (NaN → string 'NaN' → int cast 실패 → Postgres 에러 가능), 방어적으로 `Number.isFinite` 체크를 권장합니다.

**Fix:**
```ts
const minN = a ? parseInt(a, 10) : NaN;
const maxN = b ? parseInt(b, 10) : NaN;
empResolved = {
  kind: 'range',
  min: Number.isFinite(minN) ? minN : undefined,
  max: Number.isFinite(maxN) ? maxN : undefined,
};
```

### IN-02: page.tsx — raw.per_page 가 두 번 `Number()` 변환됨

**File:** `src/app/[locale]/(public)/search/page.tsx:92, 113`
**Issue:** `Number(raw.per_page) as 25 | 50 | 100` (line 92) 와 `Number(raw.per_page)` (line 113) 으로 중복 변환. `parseAsStringLiteral(PER_PAGE_KEYS)` 는 이미 `'25' | '50' | '100'` 을 보장하므로, 헬퍼 하나로 통일하면 가독성 개선됩니다.

**Fix:**
```ts
const perPage = Number(raw.per_page) as 25 | 50 | 100;
// use perPage in both places
```

### IN-03: ResultsTable — freshnessI18n 함수가 raw level 을 반환하여 SR 에 영어 누출

**File:** `src/components/search/ResultsTable.tsx:62-67, 207-208`
**Issue:** `freshnessI18n('fresh')` → 'fresh' (영문). 주석은 "profile.freshness.* carry-forward single source of truth" 라고 주장하지만 실제로는 i18n 되지 않은 raw literal 을 스크린 리더에 출력합니다. ko 로케일 사용자에게 "fresh · 2026-04-01" 로 들립니다.

**Fix:** `profile.freshness.*` 키가 Phase 2 에 이미 존재하면 사용, 없으면 `search.freshness.*` 키를 ko.json 에 추가:
```tsx
const t = useTranslations('search'); // already in scope
function freshnessI18n(level: FreshnessLevel): string {
  return t(`freshness.${level}`); // e.g., '최신', '다소 오래됨', '오래됨'
}
```

### IN-04: ResultsCards 와 ResultsTable — `safeStageLabel` 로직 중복

**File:** `src/components/search/ResultsCards.tsx:34-40`, `src/components/search/ResultsTable.tsx:112-118`
**Issue:** 동일한 가드 로직이 두 파일에 복제되어 있습니다. 향후 stage enum 이 확장되면 양쪽을 모두 유지보수해야 합니다.

**Fix:** `src/lib/format/stage.ts` 에 `safeStageLabel(stage: string | null): string` 을 내보내고 두 컴포넌트가 임포트하도록 수정.

### IN-05: postgres.ts — sql.unsafe + `as never` cast 의 관례 문서화

**File:** `src/lib/search/postgres.ts:239`
**Issue:** `sql.unsafe(queryText, values as never)` — `as never` 는 타입 시스템을 우회하는 강한 표현입니다. 안전한 이유 (bound params, allowlist, compile-time literal queryText) 가 이미 주석에 있지만 `as never` 자체에 대한 힌트는 없어, 후속 기여자가 `as never` 를 흉내내어 동적 queryText 를 주입할 수 있습니다. 주석 한 줄 추가 권장:

**Fix:**
```ts
// `as never` avoids the postgres-js tuple type check — SAFE only because
// `queryText` is a compile-time literal (no user input concatenation);
// every dynamic value lives in `values` as a bound parameter ($1..$N).
const rows = (await sql.unsafe(queryText, values as never)) as unknown as PayloadRow[];
```

### IN-06: postgres.ts autocomplete — substring `.includes(q)` 의 case-insensitivity 비대칭

**File:** `src/lib/search/postgres.ts:315-317`
**Issue:** `display_name_ko` 매칭은 대소문자 그대로 비교 (`includes(q)`), `display_name_en` 은 `toLowerCase()` 후 비교. 한국어는 대소문자 개념이 없어 문제 없지만 — 혹시 `display_name_ko` 에 영문이 섞여 있는 레코드 (e.g., "KB금융") 에서 "kb" 입력 시 alias 매칭 분기로 빠집니다. PGroonga SQL 이 이미 매칭을 인정했으니 UI 는 hit 표시하지만 `matchedAlias` 라벨이 잘못 붙을 수 있습니다.

**Fix:** 양쪽 모두 lowercased 비교로 통일:
```ts
const qLower = q.toLowerCase();
const hitDisplay =
  (r.display_name_ko ?? '').toLowerCase().includes(qLower) ||
  (r.display_name_en ?? '').toLowerCase().includes(qLower);
```

### IN-07: generate-synthetic.ts — `void rpcErr` 관례 + 불필요한 rpc 호출

**File:** `scripts/search/generate-synthetic.ts:184-189`
**Issue:** 주석은 "RPC does not exist, we just use the client" 이라고 말하지만 실제로 `supa.rpc('noop')` 을 호출해서 네트워크 왕복 + PostgREST 에러 로그를 발생시킵니다. `void rpcErr` 로 에러만 무시할 뿐, RPC 호출 자체는 제거하는 게 깔끔합니다.

**Fix:** 189 줄 `supa.rpc('noop')` 블록 전체를 삭제 (클라이언트 인스턴스는 이미 `supa` 변수로 존재).

### IN-08: FacetRangeBuckets — custom min > max 분기에서 조용한 실패

**File:** `src/components/search/FacetRangeBuckets.tsx:52`
**Issue:** `if (hasMin && hasMax && min > max) return; // invalid — silent` — 주석에 "input will show aria-invalid in parent when wired" 라 적혀 있지만 실제로는 `FacetRangeInputs` 와 달리 `aria-invalid` state 가 없습니다. 사용자가 min > max 로 입력하고 "적용" 을 눌러도 아무 피드백 없이 popover 가 닫히지 않고 유지됩니다.

**Fix:** invalid state 를 추가하여 입력창에 `aria-invalid` 반영 + (선택적) toast/inline error:
```tsx
const [invalid, setInvalid] = useState(false);
function commitCustom() {
  // ... validation ...
  if (hasMin && hasMax && min > max) {
    setInvalid(true);
    return;
  }
  setInvalid(false);
  // ... commit ...
}
// <Input aria-invalid={invalid} ... />
```

---

## Out-of-Scope Observations (v1 수용 가능)

아래는 v1 scope 상 허용되지만 후속 phase 에서 다뤄야 할 항목:

- **Rate limiting**: `autocompleteAction` 과 `/search` RSC 모두 IP/user 레이트 리밋이 없음 — 이미 autocomplete-action.ts 주석에서 "deferred to Phase 7" 로 명시. 현재 방어 (150ms debounce + 100-char clamp + limit=10) 는 honest user 에는 충분하나 automated scraping 방어는 아님.
- **Facet count staleness**: 필터 변경 시 count 가 단일 쿼리 CTE 로 최신이지만, `getFacetDomain` 은 매 요청마다 3개의 SELECT DISTINCT 쿼리를 실행. 5천+ 레코드 시 latency 상 cheap 이지만 100k+ 레코드에서는 `unstable_cache` wrapping 필요.
- **Synthetic data cascade**: `purge-synthetic.ts` 는 child-row delete → parent-row delete 순서로 올바르게 정리하나, FK 가 `ON DELETE CASCADE` 라면 parent delete 하나로 끝낼 수 있음. 스키마 확인 후 단순화 가능.

---

_Reviewed: 2026-04-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
