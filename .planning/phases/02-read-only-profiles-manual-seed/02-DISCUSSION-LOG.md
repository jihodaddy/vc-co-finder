# Phase 2: Read-Only Profiles + Manual Seed — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 02-read-only-profiles-manual-seed
**Areas selected for discussion:** Provenance UI & Page Layout
**Areas delegated to Claude's Discretion (user did not select):** Seed data strategy · Funding-round table + currency formatter · Logo handling & image pipeline

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| 시드 데이터 전략 (Recommended) | 50~200개 기업 선정 기준(유명 우선 vs 섹터·라운드 분포 균형), 기업당 데이터 깊이(히어로로만 vs 라운드/별칭까지), 저장 형식(SQL 시드 마이그레이션 / TS 시드 스크립트 / CSV+import 스크립트). | |
| Provenance UI & 페이지 레이아웃 (Recommended) | TRUST-04 배지(출처·일자) 스타일·위치 — 팩트 인라인 vs 섹션 헤더 vs hover tooltip. TRUST-05 신선도 점 임계값(≤30d 녹/≤180d 노랑/>180d 빨강 그대로인지) + 위치. 섹션 순서(Hero→라운드→별칭→식별자?). 아직 없는 섹션(재무/직원/뉴스 — Phase 6·7) 처리: 숨김 / '곧 연동 예정' 플레이스홀더 / 공란. | ✓ |
| 투자 라운드 테이블 + 통화 포맷 | 투자자 표시(리드/참여 칼럼 분리 vs 하나의 칩 리스트), 단계 라벨(한글 vs 영문 혼용: 'Series A' 그대로 vs '시리즈 A'), USD 환산(시드에 USD 동봉 vs 표시 시점 FX vs 생략), 비공개(금액 null)의 렌더링, PROF-11 포맷터 규칙(1,234억 5,678만 vs 1,234.5억 vs 1조 2,345억 — 자릿수·반올림 규칙). | |
| 로고 처리 & 이미지 파이프라인 | Cloudflare R2를 Phase 2에 도입할지(STACK.md 추천) vs Supabase Storage 임시 사용 vs 로컬 `/public` 시드. `next/image` 최적화 경유 방식. 로고 없는 기업의 플레이스홀더(이니셜 아바타 / 섹터 아이콘 / 블랭크). 50~200장은 R2 free tier(10GB) 안에서 문제없음. | |

**User's choice:** Provenance UI & 페이지 레이아웃
**Notes:** 세 가지 다른 영역(시드 / 라운드 테이블 / 로고)은 선택하지 않음 — CONTEXT.md에서 Claude's Discretion으로 권장 기본값을 기록.

---

## Provenance UI & 페이지 레이아웃 — Discussion

### Q1: TRUST-04 출처 배지를 어떻게 표시할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 팩트 인라인 (Recommended) | 라운드 금액·설립일·본사 주소 등 모든 수치/팩트 바로 옆에 작은 회색 필('출처: DART · 2026-04-21')로 표시. 리서치 관점에서 신뢰도 가장 높음. UI 밀도가 높아져서 카드/테이블 레이아웃 디자인이 중요해짐. 이미 `lib/data/_meta.ts`에 `sourceType` + `lastVerifiedAt` 필드 존재. | ✓ |
| 섹션 헤더 집약 | 각 섹션('투자 라운드', 'Hero') 상단에 '이 섹션 출처: DART·4건 / 수동·1건 · 최신 업데이트 YYYY-MM-DD' 요약 바. 팩트별 출처가 혼재된 경우 세부는 tooltip으로 드릴. 깔끔하지만 개별 팩트의 출처를 바로 확인하기는 어렵다. | |
| Hover/Tooltip + 요약 바 | 기본적으로는 각 팩트가 정보 아이콘(i)만 가지고, hover 시 tooltip으로 출처+일자 노출. 섹션 헤더에 요약 바 병행. 록화면은 깔끔하지만 모바일에서 hover가 없어 UX 어색해짐(PROF-08 검토). | |

**User's choice:** 팩트 인라인 (Recommended)
**Notes:** CONTEXT.md D-01 으로 고정. 필은 작은 회색, 3-4px 신선도 점을 필 내부 좌측에 렌더.

### Q2: TRUST-05 신선도 점(녹/노랑/빨강) 임계값과 위치는?

| Option | Description | Selected |
|--------|-------------|----------|
| 30/180일 + 팩트별 점 (Recommended) | ROADMAP/REQUIREMENTS 명시 기준 그대로: ≤30일=녹, ≤180일=노랑, >180일=빨강. 각 팩트 배지 내부에 작은 점(3~4px) 라다. 리서치가 '이 수치 신뢰할 만한가?'를 즉각적으로 판단. 수동 시드 단계에서는 대부분 녹·노랑 예상. | ✓ |
| 30/180일 + 섹션 레벨 점 | 임계값은 같지만 점은 섹션 헤더에만(한 기업의 '신선도 요약'). UI 밀도 낮음. 개별 팩트는 날짜만 텍스트로. | |
| 90/365일 + 팩트별 점 | 엄격도 완화(대부분 한국 스타트업 가시적 패턴 느림). Phase 2 시드는 수동이라 대부분 녹. 남용 위험: 저품질 데이터가 오래 녹으로 보임. | |

**User's choice:** 30/180일 + 팩트별 점 (Recommended)
**Notes:** CONTEXT.md D-02 으로 고정. 헬퍼 `freshnessColor()`는 `src/lib/data/freshness.ts`에 위치.

### Q3: 기업 상세 페이지 섹션 순서는?

| Option | Description | Selected |
|--------|-------------|----------|
| Hero → 별칭 → 투자 라운드 → 식별자 (Recommended) | 리서치가 페이지 식별 직후 '이 회사가 맞는가?'를 별칭(토스 = 비바리퍼블리드) 에서 확인. 투자 라운드가 하이라이트, 식별자(사업자번호·corp_code·도메인)는 '더 알기' 느낌으로 하단. Phase 2의 '가장 핵심' 3개 섹션. | ✓ |
| Hero → 투자 라운드 → 별칭 → 식별자 | 투자 라운드가 THE 핵심 정보란 판단. 별칭은 '참고' 설명처럼. innoforest 벤치마크와 유사한 패턴. | |
| Hero + 탭 레이아웃 | 개요 / 투자 / 이름·식별자 탭으로 분리. 스크롤이 짧고 모바일에서 편하지만 Phase 6(차트)/Phase 7(뉴스) 추가 시 탭이 계속 늘어남. URL에 탭 상태를 반영해야 공유 가능. | |

**User's choice:** Hero → 별칭 → 투자 라운드 → 식별자 (Recommended)
**Notes:** CONTEXT.md D-03 으로 고정. 단일 컬럼 리니어 레이아웃. 탭은 Phase 3 nuqs 도입까지 미뤄도 됨 / Phase 3 후에도 탭 선택은 리서처가 공유하기 어렵다는 판단.

### Q4: Phase 6(차트), Phase 7(뉴스) 등 아직 데이터가 없는 섹션은 어떻게 보여줄까요?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 2엔 생략 (Recommended) | 렌더링 자체를 하지 않음. 페이지가 Hero+라운드+별칭+식별자만으로 깔끔하게 마무리. Phase 6/7에서 해당 섹션을 추가함. 지금 없는 걸 '곧 연동' 플레이스홀더로 잡아두면 심에 거슬리고 thin-content 느낌(록화면이 비어지게 보임). | ✓ |
| '곧 연동 예정' 플레이스홀더 | '재무 추이 — DART 연동 예정 (Phase 4a)', '뉴스 언급 — 준비 중' 등 목적을 미리 알림. 로드맵 투명성에는 좋지만, SEO 관점에서 '내용 없음' 반복이 thin-content 리스크(어차피 LAUNCH-02로 noindex 관리됨). | |
| 차트 자리에 skeleton + '준비 중' | 시각적으로는 '엄청나게 많은 정보가 나올 자리'란 느낌을 주기에 괜찮지만, 데이터 채움이 지연된 회사(시드만 있고 Phase 4a 좌절 시)에서도 skeleton이 영원적으로 남아 UX 어색해짐. | |

**User's choice:** Phase 2엔 생략 (Recommended)
**Notes:** CONTEXT.md D-04 으로 고정. 섹션 삽입점은 Funding Rounds 뒤 / Identifiers 앞으로 예약; 추가 시 다른 섹션 재정렬 불필요.

---

## Wrap-up

**Question:** 이 영역에 대해 추가 질문이 필요하신가요, 아니면 CONTEXT.md 작성을 드릴까요?

| Option | Description | Selected |
|--------|-------------|----------|
| CONTEXT.md 작성 | Provenance UI + 레이아웃 4것 확정 사항 + 시드/고체/라운드테이블/통화포맷은 Claude's Discretion으로 기록. 후속 에이전트(researcher, planner)가 처리. | ✓ |
| Provenance 영역에 추가 질문 | 보이는 '출처' 레이블 내용, tooltip 발동 방식, 모바일 375px에서 배지 축약 규칙 등 디테일을 더 파고 싶을 때. | |
| 다른 회색 영역도 추가 | 시드 전략 / 투자 라운드 테이블 / 로고·R2 중 하나 이상을 논의하고 싶을 때. Claude's Discretion에 맡기지 않고 명시적으로 정하는 게 나아 보일 때. | |

**User's choice:** CONTEXT.md 작성
**Notes:** 4 Provenance/Layout 결정을 확정하고, 시드 / 투자 라운드 / 로고는 CONTEXT.md 내 Claude's Discretion 섹션에 권장 기본값과 함께 기록.

---

## Claude's Discretion

User explicitly did not open discussion on these. CONTEXT.md records recommended defaults so downstream agents are not unblocked:

- **Seed data strategy** — ~120 well-known Korean startups (토스 / 당근 / 쿠팡 / 배민 / 크래프톤 / 컬리 …) + sector-diverse coverage; depth = Hero + ≥3 aliases + ≥2 public rounds + corp_code when findable; TS seed module under `scripts/seed/companies/` + `npm run seed`; single `data_sources` row `source_type='manual'` covers all manual rows. Must include the 4 brand families that back Phase 3 SRCH-13 regression test suite.
- **Funding-round table rendering** — one row per round · columns (단계 / 발표일 / 금액 / 투자자) · Korean stage labels via `stageLabel()` helper · lead = bold chips + participants = plain chips on same row · USD conversion precomputed at seed time with hardcoded annual FX · null amount → "비공개" with no freshness dot.
- **Korean currency formatter (PROF-11)** — `formatKRW()` in `src/lib/format/currency.ts` · thresholds: 원 / 만원 / 억원 (with 만 part when ≥ 1000만) / 조원 · "비공개" for null · no thin-space, no trailing zeros.
- **Logo handling** — Phase 2 ships logos in `public/logos/{slug}.{png|svg}` (≈ 4 MB for 200 logos); R2 migration deferred unless a threshold fires (>100 logos OR any >50 KB); fallback = first-letter avatar via `<CompanyLogo />` Tailwind component.
- **ISR + cache tags** — `revalidate = 3600` + `unstable_cache` keyed by slug + `revalidateTag('company:${slug}')` shape reserved for Phase 4a producer.
- **Mobile responsive pattern** — 375 px vertical stack, funding table → card-per-round via `@container`, 2-line Hero description with expand-inline.

---

## Deferred Ideas

(Captured in CONTEXT.md `<deferred>` section — not repeated here to avoid drift.)
