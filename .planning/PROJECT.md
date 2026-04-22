# VC Co-Finder

## What This Is

한국 + 주요 아시아 스타트업의 투자·재무·서비스 메트릭을 한 곳에서 검색하고 추이로 비교할 수 있는 **스타트업 인텔리전스 플랫폼**. 1순위 사용자는 시장을 빠르게 파악해야 하는 **리서처·언론·구직자**이며, innoforest.co.kr를 벤치마크로 하되 차별점은 **다중 조건 패시트(faceted) 스마트 검색**이다.

## Core Value

리서처가 "특정 조건(섹터·라운드·지역·인원·트래픽)에 맞는 한국·아시아 스타트업"을 30초 안에 찾아내고, 시계열 추이로 검증할 수 있어야 한다.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- [x] **기업별 투자 라운드 히스토리** (라운드 단계, 금액, 일자, 리드·참여 투자자) — Validated in Phase 2 (Read-Only Profiles + Manual Seed). `/ko/companies/[slug]` 라우트가 토스 등 15개 시드 기업에서 11-stage taxonomy + 한국 통화 포맷(억/조) + 출처 배지 + 신선도 도트를 렌더. Phase 3 SRCH-13 콜드-스타트 세트로 기능 확정.
- [x] **다중 조건 패시트 필터** — 섹터, 라운드 단계, 지역, 직원 수, 누적 투자액, 설립연도 동시 적용. Validated in Phase 3 (Faceted Search Postgres Path). `/ko/search` 라우트가 nuqs URL 상태·pgroonga 한국어 FTS·denormalized 컬럼 조합으로 5,016행 데이터셋에서 p95 = 416.5ms (<1s 목표) 달성. SRCH-13 콜드스타트 코퍼스(토스/당근/쿠팡 등 7종) 8/8 canonical slug 해석 성공. 375px 모바일 반응형 + 칩/clearAll + 카드/테이블 뷰 + 정렬/페이징 모두 확인.

### Active

<!-- Current scope. Building toward these. v1 hypotheses until shipped. -->

- [ ] 5천~1만개 한국 스타트업의 기본 정보(법인명, 설립일, 본사 위치, 섹터, 한 줄 소개) 검색 가능
- [ ] 기업별 **재무 추이** 5년치 — 매출, 영업이익, 자산, 부채 (DART 기반)
- [ ] 기업별 **서비스/트래픽 메트릭** — 웹 트래픽 추이, 앱 MAU, 직원 수 추이
- [ ] 기업 상세 페이지에 시각화된 시계열 차트 (투자/매출/직원/트래픽)
- [ ] 소셜 로그인(Google, Kakao) 기반 회원가입
- [ ] 로그인 사용자 한정: 워치리스트(관심 기업 저장), 검색 조건 저장, 신규 라운드 이메일 알림
- [ ] 한국 + 일본/싱가포르/동남아 일부 스타트업 포함 (아시아 확장 구조)
- [ ] 한국어 우선 UI, i18n 키 구조 사전 분리 (영어 추가 용이)
- [ ] 데이터 수집 파이프라인 — DART/더브이씨/공시 자동 ETL + 관리자 큐레이션 + 사용자 제보 폼
- [ ] 데이터 출처/마지막 업데이트 시각 명시 (신뢰성)
- [ ] 모바일 반응형 (검색·열람 중심 시나리오)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- 자연어/시맨틱 검색(LLM) — v1은 패시트 필터에 집중. 사용자가 "수동 다중 조건"을 더 신뢰함. v2 검토.
- 글로벌(미국/유럽) 스타트업 — Crunchbase/PitchBook과 정면 경쟁 회피. 아시아 인텔리전스로 포지셔닝.
- 유료 결제/유료 플랜 — v1은 프리미엄(소셜 증명) 무료, 결제 인프라는 v2.
- VC 매칭/딜소싱 워크플로 — 1순위 사용자가 투자자가 아님. 별도 제품으로 분리 가능.
- 채용 공고 게시·관리 — 구직자 맞춤이지만 LinkedIn/원티드 영역. 외부 링크/메타만 노출.
- 개별 기업 어드민(기업이 자기 정보 관리) — v1은 관리자 큐레이션 + 사용자 제보로 충분.
- 모바일 네이티브 앱 — 웹 반응형으로 충분.
- 실시간 데이터 동기화 — 일/주 단위 배치 ETL이면 충분 (리서치 용도).

## Context

- **벤치마크**: innoforest.co.kr (한국), Crunchbase·PitchBook (글로벌) — 한국 시장 깊이 + 아시아 확장 + 검색 UX로 차별화.
- **데이터 소스**:
  - DART(전자공시) — 재무, 임원 정보 (공식 공개 API 있음)
  - 더브이씨(thevc.kr) — 투자 라운드 (스크래핑 검토 필요)
  - 중기부 K-Startup, 보도자료, 공시 — 보조 데이터
  - 기업 공개 IR, 채용 공고 — 직원 수/트래픽 보조 신호
  - SimilarWeb 등 트래픽 데이터 — 일부 무료 + 유료 검토
  - 사용자 제보 폼 — 빠진 라운드/오류 정정
- **사용자 행태**: 리서처는 "비교"와 "신뢰성"을 중시 — 데이터 출처/업데이트 일자 명시가 차트 디자인보다 중요할 수 있음.
- **데이터 신선도 vs 깊이**: 리서치 용도이므로 실시간보다 **일/주 단위 정확한 배치**가 적합.

## Constraints

- **Tech stack**: Next.js 14+ (App Router) + TypeScript + Supabase (Postgres + Auth + Storage) — 빠른 v1, Vercel 배포 일관성, RLS 활용
- **Hosting**: Vercel 무료 티어 + Supabase 무료 티어 — 비용 0원에서 시작, 트래픽 증가 시 Pro로 업그레이드
- **Budget**: 월 $0 시작, 데이터 수집 인프라(스크래핑 서버) 필요 시 별도 검토
- **Data legal**: 스크래핑 대상 사이트의 robots.txt/이용약관 준수 필요. 공식 API 우선(DART) + 출처 명시.
- **Localization**: v1 한국어 전용, i18n 라이브러리(next-intl 등)로 키 구조만 사전 분리
- **Performance**: 5천~1만 기업 패시트 필터가 1초 이내 응답 — Postgres 인덱싱 + 풀텍스트 검색 또는 Meilisearch 검토
- **Trust**: 모든 데이터에 출처 + 마지막 업데이트 시각 메타데이터 표시 필수
- **Compliance**: 개인정보(임원 정보) 노출 시 공시 자료 한정, GDPR/한국 개인정보보호법 준수

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 1순위 사용자를 리서처/언론/구직자로 확정 | 투자자 우선이면 Crunchbase와 정면 경쟁. 리서치 UX는 검색·신뢰·비교 중심으로 설계가 단순 | — Pending |
| ONE thing = 다중 조건 패시트 필터 | innoforest 대비 차별점이 가장 명확하고 1순위 사용자의 핵심 작업과 일치 | — Pending |
| Next.js + Supabase 스택 | 빠른 v1, RLS로 프리미엄 권한 제어 자연스러움, Vercel 무료 티어 일관성 | — Pending |
| 데이터 수집 = 하이브리드 (공개 ETL + 관리자 + 사용자 제보) | 단일 소스(외부 API) 의존 시 비용·커버리지 리스크. 한국 데이터는 공식 공개 비중이 큼(DART) | — Pending |
| v1 데이터셋 5천~1만 기업 | 시드 50개는 검증 부족, 수만개는 ETL 인프라 부담. DART+더브이씨 커버리지의 자연스러운 사이즈 | — Pending |
| 비주얼 톤 = Stripe/Linear 스타일 | 데이터 밀도와 모던 에디토리얼의 균형. 리서치/언론 사용자에 적합 | — Pending |
| 한국어 우선 + i18n 구조만 | v1 단순화하면서 아시아 확장 시 영어 추가 비용 최소화 | — Pending |
| 인증 = 프리미엄 (검색 공개 / 저장·알림은 로그인) | 검색 SEO 인덱싱 + 회원 전환 동선 확보. v1 무료, 결제는 v2 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-23 after Phase 3 (Faceted Search Postgres Path) completion*
