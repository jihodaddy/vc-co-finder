# Phase 3: Faceted Search (Postgres Path) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 03-faceted-search-postgres-path
**Areas discussed:** Facet Panel Layout (desktop + mobile), Results View + Sort + Pagination

---

## Facet Panel Layout

### Desktop (≥640px) placement

| Option | Description | Selected |
|--------|-------------|----------|
| 좌측 고정 sidebar | 280-320px fixed left panel; 6 facet groups always visible; innoforest/AngelList/Crunchbase standard | ✓ |
| 상단 가로바 + dropdown | Facet chips on top bar, click opens popover | |
| Inline chips + '필터 더보기' | Active filters as chips, menu on button click | |

**User's choice:** 좌측 고정 sidebar (권장)
**Notes:** 리서처 워크플로우에 가장 익숙; 6개 facet 동시 스캔 가능.

### Mobile (<640px) placement

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sheet drawer | '필터' 버튼 탭 → 하단에서 슬라이드; 80% 높이; 6개 accordion; active filter count badge | ✓ |
| 전체 화면 modal | '필터' 탭 → 풀스크린 전환; '적용' 버튼으로 닫기 | |
| Inline collapsible sections | 페이지 상단 accordion; 결과 리스트를 아래로 밈 | |

**User's choice:** Bottom sheet drawer (권장)

### Facet group display within sidebar

| Option | Description | Selected |
|--------|-------------|----------|
| 모두 펼쳐짐 | 6개 그룹 항상 펼침 + 내부 'show more/less' | ✓ |
| 기본 접힘, 클릭 확장 | Accordion; active filter 있는 그룹만 자동 열림 | |
| 3개 펼침 / 3개 접힘 | 상위 3개 항상 열림, 하위 3개 접힘 | |

**User's choice:** 모두 펼쳐짐 (권장)

### Active filter chip bar above results

| Option | Description | Selected |
|--------|-------------|----------|
| 예 — 결과 상단 별도 chip row + '모두 지우기' | ROADMAP SC #1 verbatim; sidebar와 중복이지만 summary + quick remove 역할 | ✓ |
| 아니오 — sidebar 자체에서만 표시 | 중복 회피, 결과 수직 공간 확보 | |

**User's choice:** 예 — 결과 상단에 별도 chip row + '모두 지우기' (권장)
**Notes:** ROADMAP에서 명시한 요구사항.

---

## Results View + Sort + Pagination

### Default view

| Option | Description | Selected |
|--------|-------------|----------|
| 테이블 | 밀도 중심; 컬럼 정렬 가능; 리서처 워크플로우 매칭; innoforest 벤치마크 | ✓ |
| 카드 그리드 | 로고+이름+섹터+세 라인 정도; 시각적; 소비자 스캔 방식 | |

**User's choice:** 테이블 (권장)

### Default sort

| Option | Description | Selected |
|--------|-------------|----------|
| 최근 투자일 DESC | 'what's hot' 쿼리; funding_rounds.announced_at DESC NULLS LAST | ✓ |
| 누적 투자액 DESC | '가장 큰 회사'; 유니콘 편향 강함 | |
| 이름 ASC (가나다) | 사전 방식; 중립적 | |

**User's choice:** 최근 투자일 DESC (권장)

### Pagination strategy

| Option | Description | Selected |
|--------|-------------|----------|
| 숫자 페이지네이션 | `?page=2&per_page=25`; URL에 페이지 반영 → 공유; Postgres OFFSET/LIMIT | ✓ |
| "Load more" 버튼 | 기본 25개, 버튼 탭하면 25개 더; URL에 total만 | |
| 무한 스크롤 | 스크롤 하단 접근 시 다음 배치; URL 상세 반영 어려움 | |

**User's choice:** 숫자 페이지네이션 (권장)

---

## Claude's Discretion (not discussed, planner decides)

- Korean tokenization architecture (SRCH-12) — Python ETL / Postgres 확장 / 앱-사이드
- Autocomplete scope + placement (SRCH-07) — 별도 field vs 전역 통합
- Range facet UX — 슬라이더 / from-to 입력 / 종사자 구간 버튼
- Empty/zero-result state
- Loading skeleton detail
- URL state encoding format (comma-separated vs repeated params)

## Deferred Ideas

- 자연어/시맨틱 검색 (LLM) → SRCH-V2-01
- "as-of date" 시점 슬라이더 → SRCH-V2-02
- 검색 결과 CSV/Excel 내보내기 → Phase 7 EMAIL-04
- 저장된 검색 + 이메일 알림 → Phase 4c USER-02 + Phase 7 EMAIL-01
