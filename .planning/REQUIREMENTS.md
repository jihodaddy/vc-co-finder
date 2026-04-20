# Requirements: VC Co-Finder

**Defined:** 2026-04-20
**Core Value:** 리서처가 "특정 조건(섹터·라운드·지역·인원·트래픽)에 맞는 한국·아시아 스타트업"을 30초 안에 찾아내고, 시계열 추이로 검증할 수 있어야 한다.

## v1 Requirements

### Foundation (FOUND)

기반 인프라 — Next.js 15.5 + Supabase + 핵심 스키마 + 인증 + 컴플라이언스.

- [ ] **FOUND-01**: 프로젝트 초기화 — Next.js 15.5 App Router + TypeScript + Tailwind v4 + shadcn/ui (Radix variant) + Drizzle ORM 부트스트랩
- [ ] **FOUND-02**: Supabase 프로젝트 연결 + `@supabase/ssr` 기반 서버/브라우저 클라이언트 분리 + Node 미들웨어 세션 갱신
- [ ] **FOUND-03**: 사용자 Google 소셜 로그인 가능
- [ ] **FOUND-04**: 사용자 Kakao 소셜 로그인 가능 (Business 앱 등록 + `account_email` 스코프)
- [ ] **FOUND-05**: 사용자 로그아웃 가능, 세션은 브라우저 새로고침 후에도 유지
- [ ] **FOUND-06**: 핵심 스키마 마이그레이션 — `companies`, `aliases`, `company_identifiers`, `company_relations`, `funding_rounds`, `investors`, `round_investors`, `persons`, `person_roles`, `data_sources`, `company_facts`, `audit_log`, `news_mentions`
- [ ] **FOUND-07**: 모든 user-scoped 테이블에 RLS 정책 활성화 (`auth.uid() = user_id`); 캐노니컬 테이블은 anon read 허용 + admin write 제한
- [ ] **FOUND-08**: 관리자 역할 모델 — `profiles.role IN ('admin','editor','user')` + JWT 클레임 + RLS 정책 반영
- [ ] **FOUND-09**: append-only `audit_log` 자동 트리거 — 캐노니컬 테이블의 모든 INSERT/UPDATE/DELETE에 actor·before·after·source 기록
- [ ] **FOUND-10**: i18n 스캐폴딩 — next-intl + `/[locale]/...` 라우팅 + `ko.json` 채움 + `en.json` 빈 스텁; UI 모든 문자열은 `t()` 통과 (하드코딩 금지)
- [ ] **FOUND-11**: 한국어 우선 PIPA 개인정보처리방침(KISA 템플릿 기반) 페이지 + `/privacy`, `/terms` 라우트
- [ ] **FOUND-12**: DSAR 엔드포인트 — `/contact/dsar` (개인정보 열람/정정/삭제 요청 폼)
- [ ] **FOUND-13**: Sentry 에러 트래킹 + Vercel Analytics + Speed Insights 연결
- [ ] **FOUND-14**: 통화 표준 — 모든 금액은 `(amount_minor BIGINT, currency_code CHAR(3), original_text TEXT)` 트리플로 저장

### Trust & Provenance (TRUST)

리서처 신뢰의 핵심 — 모든 사실에 출처가 붙는다.

- [ ] **TRUST-01**: 모든 fact-bearing 테이블 행에 `source_id NOT NULL` FK → `data_sources`
- [ ] **TRUST-02**: 모든 사실에 `last_verified_at` 컬럼이 `updated_at`과 분리되어 존재
- [ ] **TRUST-03**: `lib/data/*` 데이터 액세스 레이어가 모든 read에 `_meta.source` 자동 첨부
- [ ] **TRUST-04**: 기업 상세 페이지의 모든 수치/팩트 옆에 "출처: [소스명] · YYYY-MM-DD 업데이트" 인라인 배지 표시
- [ ] **TRUST-05**: 데이터 신선도 시각적 도트 (녹: ≤30일 / 노랑: ≤180일 / 빨강: >180일) 표시
- [ ] **TRUST-06**: "데이터 완전성을 보장하지 않습니다" 디스클레이머 푸터/컴퍼니 페이지 표시
- [ ] **TRUST-07**: 데이터 출처 색인 페이지 `/sources` — DART, K-Startup 등 사용 중인 모든 소스 목록 + 라이선스 명시

### Company Profile (PROF)

- [ ] **PROF-01**: `/companies/[slug]` 라우트 — 기업 상세 페이지 ISR 렌더링 + 1시간 revalidate
- [ ] **PROF-02**: Hero 섹션 — 로고, 한국어 이름, 영어 이름, 섹터 태그, 본사 위치, 한 줄 설명, 웹사이트 링크
- [ ] **PROF-03**: 투자 라운드 테이블 — 단계(Pre-A/Seed/Series A-D/Bridge/SAFE/Convertible/Grant/비공개), 일자, 금액(KRW + USD 변환), 리드 투자자, 참여 투자자 리스트
- [ ] **PROF-04**: 5년치 재무 차트 — 매출, 영업이익, 자산, 부채 (Recharts), 3/5/7년 토글, 억/조 축 라벨, 데이터 갭은 표시
- [ ] **PROF-05**: 직원 수 추이 그래프 — 시계열 라인, 출처(공시 vs 추정) 구분
- [ ] **PROF-06**: Similar Companies — 같은 섹터 + 비슷한 라운드 단계의 자동 추천 5~10개 카드
- [ ] **PROF-07**: 국내 테크 미디어 뉴스 피드 — 회사 별칭과 매칭된 외부 뉴스 링크 5~10개 (제목 + 매체 + 일자, 외부 링크아웃)
- [ ] **PROF-08**: 모바일 반응형 (작은 화면에서도 읽기 편안)
- [ ] **PROF-09**: SEO — 모든 기업 페이지에 Organization JSON-LD 스키마 + 고유 1단락 한글 요약 메타 디스크립션
- [ ] **PROF-10**: 기업 페이지에 한국어 별칭(현재 + 과거 사명) 표시
- [ ] **PROF-11**: 한국 통화 포맷팅 헬퍼 (1,000,000 → "100만", 1.2억 → "1억 2천만", 1.5조 → "1조 5천억")

### Search & Filter (SRCH)

THE differentiator — best-in-class 패시트 다중 조건 검색.

- [ ] **SRCH-01**: `/search` 라우트 — 검색 페이지 진입점, 결과 테이블 + 패시트 필터 패널
- [ ] **SRCH-02**: 패시트 필터 — 섹터(다중), 라운드 단계(다중), 지역(다중), 직원 수 범위, 누적 투자액 범위, 설립 연도 범위
- [ ] **SRCH-03**: 활성 필터 칩 표시 + 개별 X로 제거 + "모두 지우기"
- [ ] **SRCH-04**: 실시간 결과 카운트 표시 ("1,247개 기업")
- [ ] **SRCH-05**: 패시트 필터 응답 시간 p95 < 1초 (5천~1만 기업 기준)
- [ ] **SRCH-06**: URL 필터 상태 — 모든 필터를 URL 쿼리 파라미터에 반영 (nuqs), 링크 복사로 검색 상태 공유 가능
- [ ] **SRCH-07**: 한+영 별칭 자동완성 — `aliases` 테이블 기반 (토스 ⇄ 비바리퍼블리카 ⇄ Toss 등 매칭)
- [ ] **SRCH-08**: 결과 정렬 — 이름, 최근 투자일, 누적 투자액, 설립 연도 (오름/내림 토글)
- [ ] **SRCH-09**: 결과 표현 토글 — 테이블 ⇄ 카드 그리드
- [ ] **SRCH-10**: 검색 결과 페이지네이션 또는 무한 스크롤 (성능 결정)
- [ ] **SRCH-11**: `lib/search/adapter.ts` 추상화 인터페이스 — 향후 Meilisearch 스왑 대비
- [ ] **SRCH-12**: Korean FTS — 앱사이드 형태소 토큰화(Python ETL에서 mecab-ko/KoNLPy로 `search_tokens` 컬럼 생성) + GIN trigram 인덱스
- [ ] **SRCH-13**: 한국어 검색 회귀 테스트 — ["토스","토스뱅크","비바리퍼블리카","당근","당근마켓","Coupang","쿠팡"] 모두 합리적 결과 반환

### User Features (USER)

로그인 사용자 전용 — 프리미엄 게이트 (소셜 증명).

- [ ] **USER-01**: 워치리스트 — 기업 페이지/검색 결과의 ♡ 버튼 클릭으로 저장 (사용자당 최대 50개)
- [ ] **USER-02**: `/me/watchlist` — 저장한 기업 목록 페이지, 라운드/재무 요약 칼럼
- [ ] **USER-03**: 저장된 검색 — 패시트 필터 조합에 이름 붙여 저장 (사용자당 최대 5개)
- [ ] **USER-04**: `/me/saved-searches` — 저장 검색 목록, 클릭 시 필터 재적용
- [ ] **USER-05**: 이메일 알림 — 저장 검색 조건에 매칭되는 신규 라운드 발생 시 일일 다이제스트 이메일 (Resend)
- [ ] **USER-06**: 이메일 알림 1-click 구독취소 + `/me/notifications` 설정 페이지
- [ ] **USER-07**: CSV/Excel 내보내기 — 검색 결과 또는 워치리스트, 최대 1,000행, UTF-8 BOM, `source` + `last_verified_at` 칼럼 자동 포함
- [ ] **USER-08**: 사용자 수정 제안 폼 — 기업 상세의 모든 팩트에 "수정 제안" 버튼 → 출처 URL 필수 입력 → 관리자 큐로 전송

### Comparison & Analytics (COMP)

- [ ] **COMP-01**: 비교 뷰 — 검색 결과/워치리스트에서 최대 5개 기업 선택 후 "비교" 클릭
- [ ] **COMP-02**: `/compare?companies=[a,b,c,d,e]` — 나란히 비교 테이블 (라운드, 매출, 직원, 누적 투자)
- [ ] **COMP-03**: 5개 기업 시계열 차트 오버레이 (매출, 직원 수) — 절대값/지수화(0=시작) 토글
- [ ] **COMP-04**: 비교 결과 PNG/PDF 내보내기 (출처 워터마크 포함)
- [ ] **COMP-05**: 섹터 대시보드 — `/dashboards/sectors` — 분기/섹터별 총 투자액 차트 + 라운드 수 (materialized view 기반)
- [ ] **COMP-06**: 섹터 대시보드는 공개(로그인 불필요), 차트 임베드 가능

### Data Ingestion (DATA)

- [ ] **DATA-01**: ETL 서비스 — Python 3.12 워커, Fly.io 배포, GitHub Actions cron 트리거
- [ ] **DATA-02**: `staging.*` 스키마 — ETL은 staging에만 쓰고, 관리자 승인 후 `publish()`로 캐노니컬 upsert
- [ ] **DATA-03**: DART API ETL — 재무제표 (매출, 영업이익, 자산, 부채), 임원 정보, 사업 보고서 — OpenDartReader 활용
- [ ] **DATA-04**: DART corp_code → 사업자등록번호 → 캐노니컬 `company_id` 매핑 테이블
- [ ] **DATA-05**: VC 포트폴리오 페이지 스크래핑 — 주요 한국 VC(Altos/IMM/Kakao Ventures 등) 5~10곳, robots.txt 준수, 1 req/sec 레이트
- [ ] **DATA-06**: 보도자료/테크미디어 RSS 폴러 — 8~12개 한국 테크미디어, 회사 별칭 fuzzy 매칭으로 `news_mentions` 자동 등록
- [ ] **DATA-07**: 사용자 제출(USER-08)은 `submissions` 큐 테이블로 → 관리자 승인 시 `publish()` 경유
- [ ] **DATA-08**: ETL 모든 인서트는 idempotent upsert (재실행 안전)
- [ ] **DATA-09**: ETL 실행 결과 로그 — 처리 건수, 신규/업데이트/스킵, 에러는 Sentry로
- [ ] **DATA-10**: ETL publish 후 `revalidateTag(company:${id})` 웹훅 호출로 영향받은 페이지 캐시 무효화
- [ ] **DATA-11**: 더브이씨(thevc.kr) 스크래핑은 절대 수행하지 않음 (ToS 위반) — 디스커버리 시그널 용도로만

### Admin & Curation (ADMIN)

- [ ] **ADMIN-01**: `/admin/curation` — 승인 대기 큐 (ETL staging + 사용자 제출) 통합 리뷰
- [ ] **ADMIN-02**: diff 뷰 — 기존 값 vs 제안 값 나란히 표시, 출처 링크 클릭 가능
- [ ] **ADMIN-03**: 승인/거부 액션 → `audit_log` 자동 기록 + `publish()` 호출 (승인) 또는 reason 메모 (거부)
- [ ] **ADMIN-04**: 관리자 역할 게이트 — `profiles.role IN ('admin','editor')` 미들웨어 + RLS 이중 보호
- [ ] **ADMIN-05**: 캐노니컬 테이블 변경의 소프트 삭제 + 버전 히스토리 (audit_log 기반 1-click 롤백)
- [ ] **ADMIN-06**: `/admin/users` — 사용자/역할 관리 (관리자 전용)

### Launch & SEO (LAUNCH)

- [ ] **LAUNCH-01**: `robots.txt` + 동적 `sitemap.xml` (캐노니컬 published 기업만 포함, ≥5 facts 조건)
- [ ] **LAUNCH-02**: 팩트 ≥5개 미달 기업 페이지는 `noindex` 메타 (thin content 패널티 회피)
- [ ] **LAUNCH-03**: 200개 이상의 검증된 기업 데이터 시드 (초기 사용자 피드백 기준 만족)
- [ ] **LAUNCH-04**: Vercel Pro 업그레이드 (Hobby ToS는 상업적 사용 금지)
- [ ] **LAUNCH-05**: 부하 테스트 — 5천 동시 요청 / 100k 가상 데이터셋에서 패시트 필터 p95 < 1초 확인

## v2 Requirements

### Auth Expansion

- **AUTH-V2-01**: Naver 로그인 (Custom OIDC)
- **AUTH-V2-02**: 이메일/패스워드 회원가입 (소셜 외 옵션)

### Investor Pages

- **INV-V2-01**: 투자자 프로필 페이지 (`/investors/[slug]`) — 포트폴리오, 라운드 참여 이력
- **INV-V2-02**: 투자자 ↔ 기업 관계 시각화

### Advanced Search

- **SRCH-V2-01**: 자연어/시맨틱 검색 (LLM 기반 필터 빌더)
- **SRCH-V2-02**: "as-of date" 시점 슬라이더 — 과거 시점 기업 상태 조회 (스냅샷 스키마 필요)

### Asia Expansion

- **GEO-V2-01**: 일본/싱가포르/동남아 스타트업 데이터 수집 + 영어 UI 활성화
- **GEO-V2-02**: 지역별 필터 확장

### Monetization

- **MON-V2-01**: 유료 플랜 (고급 데이터/대용량 export/API 액세스)
- **MON-V2-02**: 결제 인프라 (Toss Payments / Stripe)

### Public API

- **API-V2-01**: 공개 read API + 키 발급
- **API-V2-02**: API 사용량 미터링/레이트리밋

### Search Scaling

- **SCALE-V2-01**: Meilisearch 셀프호스팅 (Fly.io) — 5만 기업 초과 시 Postgres에서 마이그레이션

### Data Sources

- **DATA-V2-01**: SimilarWeb 트래픽 데이터 통합 (예산 검토 후)
- **DATA-V2-02**: 더브이씨 데이터 파트너십 (스크래핑이 아닌 공식 라이선스)

### Visualization

- **VIZ-V2-01**: Embeddable 차트 (워터마크 + 출처 + iframe)
- **VIZ-V2-02**: 투자자 관계 그래프 (force-directed)

## Out of Scope

| Feature | Reason |
|---------|--------|
| 더브이씨(thevc.kr) 스크래핑 | ToS 명시적 금지 + 잡코리아/사람인 판례로 DB권 침해 위험 — 영원히 금지, 파트너십만 가능 |
| VC 매칭/딜소싱 워크플로 | 1순위 사용자가 투자자 아님 (리서처/언론/구직자); 별도 제품으로 분리 가능 |
| 채용 공고 게시·관리 | LinkedIn/원티드 영역, 외부 링크/메타만 노출 |
| 개별 기업 어드민 (기업이 자기 페이지 직접 편집) | v1은 관리자 큐레이션 + 사용자 제보로 충분; 별도 인증·KYC 필요 |
| 모바일 네이티브 앱 | 웹 반응형으로 충분, PWA로 보강 가능 |
| 실시간 데이터 동기화 (WebSocket) | 리서치 용도 → 일/주 단위 배치로 충분 |
| 사용자 작성 회사 리뷰 | 명예훼손 리스크 + 신호 약함 |
| AI 자동 요약 (라벨 없이) | 환각 시 신뢰 붕괴 — 라벨 + 검수 후에만 v2에서 검토 |
| 창업자 개인 프로필 페이지 (전체 커리어) | PIPA 리스크, 공시 자료 한정만 노출 |
| 글로벌(미국/유럽) 스타트업 | Crunchbase/PitchBook과 정면 경쟁 회피, 아시아 인텔리전스로 포지셔닝 |
| 무한 export (수만 행) | 비용 + 악용 우려; v1은 1,000행 캡 |
| 결제/유료 플랜 | v1은 무료 (소셜 증명 게이트만); 결제 v2 |
| 비디오/리치 미디어 콘텐츠 | 텍스트/차트 중심, 비용·복잡도 부담 |
| Vercel Cron 사용 | Hobby 1회/일 제한 + 스크래퍼 실행 부적합 — GitHub Actions로 |

## Traceability

(이 표는 ROADMAP.md 생성 후 채워집니다 — roadmapper 에이전트가 채움)

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01..14 | TBD | Pending |
| TRUST-01..07 | TBD | Pending |
| PROF-01..11 | TBD | Pending |
| SRCH-01..13 | TBD | Pending |
| USER-01..08 | TBD | Pending |
| COMP-01..06 | TBD | Pending |
| DATA-01..11 | TBD | Pending |
| ADMIN-01..06 | TBD | Pending |
| LAUNCH-01..05 | TBD | Pending |

**Coverage:**
- v1 requirements: 71 total (14 FOUND + 7 TRUST + 11 PROF + 13 SRCH + 8 USER + 6 COMP + 11 DATA + 6 ADMIN + 5 LAUNCH — note: counts will be re-verified after roadmapper traceability fill)
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 71 ⚠️ (resolved when ROADMAP.md is created)

---
*Requirements defined: 2026-04-20*
*Last updated: 2026-04-20 after initial definition*
