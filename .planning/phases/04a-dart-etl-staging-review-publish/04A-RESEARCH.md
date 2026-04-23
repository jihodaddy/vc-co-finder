# Phase 04a: DART ETL + Staging→Review→Publish — Research

**Researched:** 2026-04-23
**Domain:** Python 3.12 ETL (DART 공시 → Supabase staging) + Fly.io scale-to-zero worker + GitHub Actions cron + Postgres `publish()` + Next.js `revalidateTag` cache drainer
**Confidence:** HIGH — 핵심 라이브러리·플랫폼 버전이 모두 공식 레지스트리/문서로 검증됨. 주요 리스크는 OpenDartReader 업스트림 업데이트 정체(2023-03 이후 릴리스 없음) 1건.

## Summary

Phase 4a는 VC Co-Finder 프로젝트의 **첫 Python 스택**이자 **첫 외부 서비스(Fly.io + GitHub Actions)** 도입 phase다. 아키텍처는 "GitHub Actions cron(02:00 KST) → Fly.io Python 3.12 worker `/run` endpoint → OpenDartReader DART pull → `staging.*` idempotent upsert → (Phase 4b) admin approve → `publish()` Postgres 함수(atomic) → `cache_invalidation_events` 큐 → Next.js `/api/cache/drain` → `revalidateTag`"로 구성된다.

연구를 통해 **CONTEXT 결정 D-06.3(Next.js Route Handler가 `cache_invalidation_events`를 per-minute poll)이 Vercel Hobby 제약상 불가능**하다는 사실을 확인했다(Hobby cron은 1일 1회 제한). 이를 **Supabase Database Webhooks(pg_net 기반)**로 대체 권장한다 — `cache_invalidation_events` INSERT 시 Supabase가 HTTP POST를 Next.js `/api/revalidate`에 바로 쏘는 구조로, polling 불필요·실시간·Hobby 호환이다. 이 한 가지가 planner가 D-06.3을 amend해야 하는 유일한 아이템이다.

두 번째 주의점: **OpenDartReader 0.2.3(2023-03-15)이 최신**이며 Python 3.12 공식 지원 여부는 명시되지 않았으나, 순수 Python + `requests`/`pandas` 의존이라 실제 호환성은 높다. 공식 fork(`quantylab/OpenDartReader`)가 더 활발하므로 대안 검토 필요.

**Primary recommendation:** Fly.io + uv + FastAPI + `psycopg[binary]` 직접 연결(publish RPC 호출용) + `supabase-py`(bulk upsert용) + OpenDartReader 0.2.3 + Supabase Database Webhook for cache invalidation. Wave 순서는 CONTEXT Step 13의 Wave 0→5와 대부분 일치하되, **Wave 1에서 `publish()` SQL 작성 전에 staging 테이블 스키마를 먼저 만들어야** 한다 — 자세한 내용은 §Architecture Patterns 참조.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (user decision — D-01, D-02, D-03)

**D-01 Identity Matching (user-locked):**
- **D-01.1** `corp_code` direct match via `public.company_identifiers(kind='dart_corp_code', value=corp_code)` is the ONLY matching path. O(1), deterministic, zero false matches.
- **D-01.2** Unmatched rows go to `staging.etl_review_queue` → Phase 4b admin UI. **NO fuzzy fallback** in Phase 4a.
- **D-01.3** Wave 0 bootstrap task: `etl/bootstrap_corp_codes.py` resolves `corp_code` for Phase 2 외감-대상 seed companies via DART 명칭 검색 API / `OpenDartReader.find_corp_code(name)`, writes `company_identifiers(kind='dart_corp_code', value=..., source_id=manual_curation_source)` rows. **Blocks** main ETL scheduling. Idempotent.

**D-02 DART Coverage Scope (user-locked):**
- **D-02.1** First-scope reports: (a) 연간 사업보고서 재무제표 (revenue / 영업이익 / 자산 / 부채), (b) executive roster via `임원 및 직원`, (c) 주요 단일보고서 (증자/감자/임원변경/합병/해산) via DART 공시검색 filtered to seeded corp_codes.
- **D-02.2** Seed validation set: **Phase 2 외감-대상 companies only** (est. 8–10 of 15). Non-외감는 `{skip_reason:'non_external_audit'}` 로그 후 스킵. ≥95% 매칭 성공 기준은 외감 subset에 대해서만 측정.
- **D-02.3** 분기/반기보고서 deferred — 연간만.
- **D-02.4** 수시공시 filter: 증자/감자/임원변경/합병분할/해산. 나머지 공시 타입 무시.

**D-03 ETL Cadence & Execution (user-locked):**
- **D-03.1** 매일 02:00 KST 전체 sweep (delta 아님). Idempotent upsert로 대부분의 날은 no-op.
- **D-03.2** DART API 20,000 calls/day(인증키당) — Phase 4a 규모(10 × 3~5 report types = ≤50 calls/day)에선 0 concern. Backoff 불필요.
- **D-03.3** GH Actions `.github/workflows/etl-daily.yml`, schedule `0 17 * * *` (UTC 17:00 = KST 02:00). `POST /run`을 Fly worker에 shared secret으로 호출. Fly는 scale-to-zero. 완료 후 idle → zero.
- **D-03.4** GH Actions job timeout 30 min, Fly timeout 동일. Phase 4a 실제 실행시간 <2 min 예상.

### Claude's Discretion (D-04 to D-09)

**D-04 Repo & Deployment:**
- D-04.1 Monorepo `etl/` 서브디렉토리. `src/` 에서 import 없음. Dockerfile + `fly.toml` at `etl/` root.
- D-04.2 PR flow: `etl/**` 변경 시 `pytest etl/tests` + `ruff check etl/` 실행. main 머지 시 Fly 배포(GH Actions).
- D-04.3 Python dep mgmt: **uv** + `etl/pyproject.toml` + `etl/uv.lock`. 연구자가 2026-04 현재 best practice 확인해야 함 — §Standard Stack 참조.
- D-04.4 Pinned deps: `OpenDartReader`, `httpx`, `supabase-py`, `sentry-sdk[fastapi]`, `fastapi` + `uvicorn`, `pytest`. APScheduler는 **사용 안 함** (GH Actions가 scheduler).

**D-05 Staging Table Design:** Entity-typed tables + `raw_payload jsonb`. Details in §Architecture Patterns / Pattern 3.

**D-06 publish() Semantics:**
- D-06.1 Postgres function, 단일 트랜잭션으로 staging→canonical upsert + `data_sources` + `audit_log` + `last_verified_at`.
- D-06.2 publish() 호출은 Phase 4b admin UI에서. Phase 4a는 통합 테스트만.
- D-06.3 Cache invalidation: publish()가 `cache_invalidation_events` INSERT → Next.js `/api/cache/drain` cron per minute poll → `revalidateTag(company:${id})`.
  - **⚠ CONTEXT의 per-minute polling은 Vercel Hobby cron 제약(1일 1회)으로 실행 불가.** §Common Pitfalls #1 + §Architecture Patterns / Pattern 5 참조. Supabase Database Webhook이 더 적합하다는 권고가 discretion 내에 있다.
- D-06.4 단일-company publish = transactional. 배치(Phase 4b 대량 승인)는 per-company transactional.

**D-07 Observability & Safety:**
- D-07.1 Sentry Python SDK on FastAPI. DSN = Fly secret. `corp_code` + `report_type` 태그.
- D-07.2 Run log: `public.etl_runs(id, started_at, finished_at, status, processed_count, new_count, updated_count, skipped_count, error_count, corp_codes text[])`. `/admin/etl` stub 에서 노출.
- D-07.3 CI grep ban on `thevc.kr`: GH Actions step `grep -r` — `.planning/`·`node_modules`·`etl/tests/fixtures/`(CONTEXT docs 용) 이외에서 매치 시 exit 1.
- D-07.4 Secrets: DART API key / SUPABASE_SERVICE_ROLE_KEY / SENTRY_DSN → Fly secrets + GH Actions repo secrets. 코드/env.example 노출 금지.

**D-08 Validation & Testing:**
- D-08.1 pytest: (a) corp_code resolver (mocked DART), (b) staging upsert idempotency (real Supabase test DB), (c) publish() SQL (pgtap 또는 plain SQL fixture), (d) ≥95% match rate assertion.
- D-08.2 Smoke test: `tests/etl/test_phase4a_e2e.py` — 토스 한 건 bootstrap→daily→verify.
- D-08.3 Load test out of scope.

**D-09 Documentation:**
- D-09.1 `etl/README.md`: local dev setup (uv + Supabase local + DART key), add new corp_code 절차, 수동 trigger.
- D-09.2 `/ko/sources` 업데이트: "DART Open API (Phase 4a 연동 예정)" → live entry with `etl_runs` 최근 timestamp.

### Deferred Ideas (OUT OF SCOPE — 연구하지 않음)

- 분기/반기보고서 parsing
- Delta-sweep ETL
- Multi-region Fly.io deploy
- DART push/webhook (DART는 push 미제공)
- Admin approve/reject UI → Phase 4b
- thevc.kr 스크래핑 (영원히 금지 + CI grep ban)
- Fuzzy-match identity reconciliation
- USD 재무제표 / FX 변환 (KRW-only)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | ETL 서비스 — Python 3.12 워커, Fly.io 배포, GH Actions cron 트리거 | §Standard Stack (FastAPI/uv/Fly.io/GH Actions verified current) + §Architecture Pattern 1 (scale-to-zero HTTP trigger) |
| DATA-02 | `staging.*` 스키마 — ETL staging-only 쓰기, admin 승인 후 `publish()` canonical upsert | §Architecture Pattern 3 (staging table shape) + §Architecture Pattern 4 (publish() SQL pattern) |
| DATA-03 | DART API ETL — 재무제표 (매출/영업이익/자산/부채), 임원 정보, 사업 보고서 — OpenDartReader | §Standard Stack (OpenDartReader 0.2.3 method surface) + §Code Examples 1–3 |
| DATA-04 | DART corp_code → 사업자등록번호 → 캐노니컬 `company_id` 매핑 테이블 | §Architecture Pattern 2 (corp_code lookup via existing `company_identifiers` table) |
| DATA-08 | ETL 모든 insert는 idempotent upsert (재실행 안전) | §Architecture Pattern 3 (PRIMARY KEY + `ON CONFLICT DO UPDATE`) |
| DATA-09 | ETL 실행 결과 로그 — 처리 건수, 신규/업데이트/스킵, 에러는 Sentry | §Standard Stack (sentry-sdk 2.58) + §Architecture Pattern 6 (`etl_runs` table) |
| DATA-10 | ETL publish 후 `revalidateTag(company:${id})` 웹훅으로 캐시 무효화 | §Architecture Pattern 5 (Supabase Database Webhook via pg_net — recommended over D-06.3 polling) |
| DATA-11 | 더브이씨(thevc.kr) 스크래핑 절대 금지 — 디스커버리 시그널 용도만 | §Code Examples 6 (CI grep-ban step) |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Python 3.12 + OpenDartReader + Fly.io + GitHub Actions cron (etl 서비스는 Next.js 레포 내 `etl/` subdirectory)
- **Data legal:** robots.txt / 이용약관 준수, 공식 API 우선(DART), 출처 명시 필수
- **Compliance:** 개인정보(임원) 노출은 공시 한정, PIPA 준수
- **Budget:** 월 $0 시작 — Fly.io free + GitHub Actions free + Supabase Free에 맞춰 설계
- **Trust:** 모든 데이터에 출처 + `last_verified_at` 필수. ETL rows → `data_sources(source_type='dart')` FK
- **GSD 워크플로우:** 직접 파일 수정 금지 — `/gsd-execute-phase` 경로 사용

## Standard Stack

### Core (ETL worker — `etl/` subdirectory)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Python** | 3.12 | Runtime | [VERIFIED: CLAUDE.md + Fly.io base image] CONTEXT 고정. 3.13이 나와 있지만 OpenDartReader 호환 리스크 회피 위해 3.12 유지. |
| **uv** | 0.11.7 (2026-04-15) | Package manager + lockfile | [VERIFIED: pypi.org/project/uv] 2026 Python Docker/CI 표준. 10~100x 빠른 resolve, `uv.lock` cross-platform, Dockerfile cache 친화. pip-tools/poetry 대비 단일 도구. [CITED: docs.astral.sh/uv/guides/integration/docker] |
| **FastAPI** | 0.136.0 (2026-04-16) | HTTP `/run` endpoint + Sentry auto-integration | [VERIFIED: pypi.org/project/fastapi] 최신 릴리스. `sentry-sdk[fastapi]` 자동 연동, shared-secret 인증 미들웨어 간단. |
| **uvicorn** | 0.45.0 | ASGI server | [VERIFIED: pypi] FastAPI 표준 서버. `--host 0.0.0.0 --port 8080` (Fly Proxy 표준) |
| **OpenDartReader** | 0.2.3 (2023-03-15) | DART Open API wrapper | [VERIFIED: pypi.org/project/OpenDartReader] ⚠ **이게 최신이다** — 마지막 릴리스 2023-03-15. 순수 Python + `requests`/`pandas`/`xmltodict` 의존이라 Python 3.12 실호환은 높음. 공식 fork `quantylab/OpenDartReader`가 더 활발한지 §Alternatives Considered 참조. |
| **httpx** | 0.28.1 | async HTTP (Supabase Database Webhook 응답, 보조 DART 호출) | [VERIFIED: pypi] `requests` 대체, async/await, HTTP/2. |
| **supabase-py** | 2.28.3 (2026-03-20) | Bulk upsert to `staging.*` + RPC `publish()` 호출(Phase 4b 경로) | [VERIFIED: pypi.org/project/supabase] PostgREST 기반 — `client.table('schema.staging.X').upsert(rows).execute()` 패턴. RPC는 `client.rpc('publish', {...}).execute()`. |
| **psycopg[binary]** | 3.3.3 | Direct Postgres 연결 (transactional bulk staging INSERT 시 PostgREST 우회) | [VERIFIED: pypi] **선택적**. supabase-py 만으로도 가능하지만, 대량 upsert + staging 스키마 직접 접근 시 psycopg가 더 단순/빠름. §Architecture Patterns / Pattern 3 참조. |
| **sentry-sdk[fastapi]** | 2.58.0 (2026-04-13) | 에러 트래킹 + FastAPI 자동 통합 | [VERIFIED: pypi] FastAPI 자동 integration, `before_send`로 PII 스크럽, `tag` 기반 corp_code 라벨링. [CITED: docs.sentry.io/platforms/python/integrations/fastapi] |
| **pytest** | 9.0.3 | Test runner | [VERIFIED: pypi] 표준. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **pydantic** | v2.x (FastAPI 번들) | Request/response 모델 | FastAPI `/run` 페이로드 검증, DART row → staging dataclass 변환 |
| **ruff** | latest | Linting + formatting | CI `ruff check etl/` (D-04.2) |
| **python-dateutil** | latest | 날짜 파싱 | DART의 `bsns_year` / `rcept_dt` 텍스트 → date 변환 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| **OpenDartReader 0.2.3 (FinanceData)** | `dart-fss` 0.4.3 (josw123) | [VERIFIED: dart-fss.readthedocs.io/en/latest] dart-fss는 더 활발, 사업보고서 XBRL 파싱까지 지원. 하지만 더 무겁고 API가 달라 CONTEXT.md에서 "OpenDartReader"로 명시 고정. **권장: OpenDartReader를 쓰되, 0.2.3 유지관리 정체가 Phase 4a.1 운영 중 문제되면 dart-fss로 마이그레이션 후보.** |
| **OpenDartReader (FinanceData)** | `quantylab/OpenDartReader` fork | [CITED: github.com/quantylab/OpenDartReader] quantylab이 더 활발할 수 있으나 PyPI에는 미배포 — git 직접 pin 필요 (`uv pip install git+https://github.com/quantylab/OpenDartReader.git@COMMIT_SHA`). 재현 가능하지만 비표준. 본가(FinanceData) 유지 권장. |
| **supabase-py (PostgREST)** | `psycopg[binary]` 직접 연결 | PostgREST는 편하지만 (a) `staging.*` 스키마를 PostgREST `db-schemas` 화이트리스트에 추가 필요, (b) COPY 대량 insert는 psycopg만 지원. **권장: hybrid — psycopg(스키마 쓰기) + supabase-py(RPC `publish()` + 공개 `etl_runs` 기록)** |
| **pip-tools / poetry** | **uv** | [CITED: docs.astral.sh/uv] uv가 10-100x 빠르고 Docker cache mount 공식 지원. 2026 표준. CONTEXT D-04.3에서 uv 확정. |
| **APScheduler** | **GitHub Actions cron** | CONTEXT D-04.4: 프로세스 내 scheduler 쓰지 않음 — GH Actions가 scheduler of truth. Fly worker는 HTTP trigger 시에만 깨어남. |
| **Next.js Cron (`/api/cache/drain` per-minute poll)** | **Supabase Database Webhook** | **결정적 발견.** [CITED: vercel.com/docs/cron-jobs/usage-and-pricing] Vercel Hobby는 cron "1일 1회" 제한 — CONTEXT D-06.3이 Hobby에서 **작동하지 않는다**. Supabase Database Webhook은 pg_net 기반 INSERT-trigger HTTP POST로, 1분 미만 latency + 추가 cron 불필요 + Hobby 호환. Planner가 D-06.3을 amend해야 함. §Common Pitfalls #1. |
| **Vercel Cron Pro** | Supabase Webhook | Pro는 $20/mo — 예산 원칙 위배(월 $0). |

### Installation (v1 baseline)

```bash
# etl/pyproject.toml 기본 셋업 (uv init 이후)
uv add \
  "OpenDartReader>=0.2.3" \
  "fastapi>=0.136" \
  "uvicorn[standard]>=0.45" \
  "supabase>=2.28" \
  "psycopg[binary]>=3.3" \
  "httpx>=0.28" \
  "sentry-sdk[fastapi]>=2.58" \
  "pydantic>=2.9" \
  "python-dateutil>=2.9"

uv add --dev "pytest>=9.0" "pytest-asyncio>=0.24" "ruff>=0.7" "pytest-mock>=3.14"

# uv.lock 생성 확인
uv sync --locked
```

### Version Verification

모든 버전은 PyPI 레지스트리 직접 조회(2026-04-23)로 검증됨:

| Package | Verified Version | Release Date | Verified By |
|---------|------------------|--------------|-------------|
| uv | 0.11.7 | 2026-04-15 | `curl https://pypi.org/pypi/uv/json` |
| fastapi | 0.136.0 | 2026-04-16 | 동일 |
| uvicorn | 0.45.0 | 2026 | 동일 |
| supabase | 2.28.3 | 2026-03-20 | 동일 |
| sentry-sdk | 2.58.0 | 2026-04-13 | 동일 |
| OpenDartReader | 0.2.3 | **2023-03-15** ⚠ | 동일 |
| httpx | 0.28.1 | — | 동일 |
| psycopg | 3.3.3 | — | 동일 |
| pytest | 9.0.3 | — | 동일 |

⚠ OpenDartReader가 3년 이상 미업데이트. Python 3.12 공식 호환 선언 없음. **완화책:** Wave 5 smoke test(pytest)에서 실제 API 호출로 호환성 검증; Wave 0 bootstrap 실행 전 로컬에서 "pytest etl/tests/test_opendartreader_compat.py" 선행 실행.

## Architecture Patterns

### Recommended Project Structure

```
etl/
├── pyproject.toml            # uv-managed
├── uv.lock                   # committed
├── Dockerfile                # multi-stage, uv-based
├── fly.toml                  # scale-to-zero config
├── .dockerignore             # .venv, .git, tests, __pycache__
├── src/etl/
│   ├── __init__.py
│   ├── main.py               # FastAPI app (only /run + /health)
│   ├── config.py             # env vars (pydantic-settings)
│   ├── sentry.py             # sentry_sdk.init wiring
│   ├── dart/
│   │   ├── client.py         # OpenDartReader wrapper + retry/timeout
│   │   ├── reports.py        # finstate_all + 임원 + 공시 pulls
│   │   └── corp_code.py      # find_corp_code + bootstrap helpers
│   ├── db/
│   │   ├── psycopg_client.py # direct Postgres (staging bulk upsert)
│   │   ├── supabase_client.py # supabase-py (RPC publish, etl_runs)
│   │   └── staging_upsert.py # idempotent INSERT ... ON CONFLICT
│   ├── pipeline/
│   │   ├── run.py            # orchestrates: for each corp_code → pull → upsert → log
│   │   └── review_queue.py   # unmatched → staging.etl_review_queue
│   └── bootstrap_corp_codes.py # Wave 0 entry point (manual run)
├── tests/
│   ├── conftest.py           # pytest fixtures (mocked DART + supabase test DB)
│   ├── fixtures/
│   │   ├── dart/             # recorded DART responses (JSON)
│   │   └── seed_corp_codes.json
│   ├── unit/
│   │   ├── test_corp_code_resolver.py
│   │   ├── test_staging_upsert.py
│   │   └── test_dart_reports.py
│   ├── sql/
│   │   └── test_publish_function.sql # pgtap or psql \i
│   └── e2e/
│       └── test_phase4a_e2e.py
└── README.md
```

**Rationale:**
- `src/etl/` layout (not flat `etl/*.py`) enables `uv run pytest` import from `etl.dart.client` form without PYTHONPATH hacks
- `dart/` vs `db/` vs `pipeline/` separation mirrors the data flow — planner can split tasks along these boundaries
- `tests/fixtures/` ships recorded DART responses → tests don't hit real API on CI

### Pattern 1: Fly.io Scale-to-Zero FastAPI Worker

**What:** Fly Machine idle → stopped. GH Actions POSTs `https://{app}.fly.dev/run` → Fly Proxy wakes machine → FastAPI runs ETL → returns → machine idles → Fly Proxy stops after idle timeout.

**When to use:** Any scheduled job that runs <30 min, <once-per-hour. Free tier compatible.

**`etl/fly.toml` (verified from Fly docs):**
```toml
app = "vcfinder-etl"
primary_region = "nrt"  # Tokyo — closest to Supabase APAC + Korean users

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"
  PYTHONUNBUFFERED = "1"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"      # [CITED: fly.io/docs/launch/autostop-autostart]
  auto_start_machines = true
  min_machines_running = 0         # true scale-to-zero
  processes = ["app"]

  [[http_service.checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/health"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"                 # Python + OpenDartReader imports ~150MB; 256MB too tight
```

**Cold-start reality (verified from Fly community 2026):** 300-500ms to boot machine + ~800ms Python + OpenDartReader import + pandas import. Total first-request latency ~1.5-2s. GH Actions workflow_dispatch tolerates this — not user-facing.

**Dockerfile (verified from docs.astral.sh/uv/guides/integration/docker):**
```dockerfile
# Stage 1: Build with uv
FROM python:3.12-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.11.7 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

# Install deps (cached unless uv.lock/pyproject.toml change)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

# Install project
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

# Stage 2: Runtime
FROM python:3.12-slim
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app/src"
WORKDIR /app
EXPOSE 8080
CMD ["uvicorn", "etl.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**FastAPI `/run` endpoint skeleton:**
```python
# etl/src/etl/main.py
from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
import os
from etl.sentry import init_sentry
from etl.pipeline.run import run_daily_sweep

init_sentry()
app = FastAPI(title="vcfinder-etl")

RUN_SECRET = os.environ["ETL_RUN_SHARED_SECRET"]

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/run")
def run(
    x_etl_secret: str = Header(...),
    background: BackgroundTasks = None,
):
    if x_etl_secret != RUN_SECRET:
        raise HTTPException(status_code=401, detail="bad secret")
    # Run synchronously — GH Actions awaits response; 30-min timeout tolerant
    result = run_daily_sweep()
    return result  # {run_id, processed, new, updated, skipped, errors}
```

### Pattern 2: corp_code Direct Identity Match (D-01.1)

**What:** `company_identifiers(kind='dart_corp_code', value='00126380')` already exists as an enum value and FK’d table (migration 0004). ETL looks up `company_id` via this exact row — no fuzzy.

**When to use:** Every row pulled from DART. If lookup misses → review queue (D-01.2), not canonical.

**SQL pattern:**
```sql
-- ETL staging upsert, identity resolution at read time
SELECT company_id
FROM public.company_identifiers
WHERE kind = 'dart_corp_code'
  AND value = $1
  AND deleted_at IS NULL;
-- None → staging.etl_review_queue insert with reason='unmatched_corp_code'
```

**Existing infra to reuse (verified from repo):**
- `identifier_kind` ENUM already has `'dart_corp_code'` (migration `0002_enums.sql` line 43)
- `company_identifiers` table has `UNIQUE(kind, value)` constraint — safe for conflict detection
- Phase 2 seed companies (scripts/seed/companies/*.ts) have `identifiers: [{ kind: 'business_registration_number', ... }]` but **no `dart_corp_code` rows yet** — Wave 0 bootstrap populates these for 외감 subset

**Bootstrap algorithm (Wave 0, `etl/src/etl/bootstrap_corp_codes.py`):**
```python
# Pseudocode
import OpenDartReader
dart = OpenDartReader(api_key=DART_API_KEY)

for seed_company in load_phase2_seed_from_db():  # SELECT slug, display_name_ko, legal_name FROM companies
    corp_code = dart.find_corp_code(seed_company["legal_name"]) \
             or dart.find_corp_code(seed_company["display_name_ko"])
    if not corp_code:
        print(f"SKIP non-외감 or unresolvable: {seed_company['slug']}")
        continue
    # Idempotent upsert
    supabase.table("company_identifiers").upsert({
        "company_id": seed_company["id"],
        "kind": "dart_corp_code",
        "value": corp_code,
        "source_id": MANUAL_SOURCE_ID,  # 00000000-0000-0000-0000-000000000001
    }, on_conflict="kind,value").execute()
```

**Pitfall:** `find_corp_code()` does **fuzzy/substring** matching (returns first match); Phase 2 seed names like "비바리퍼블리카"/"토스" may resolve OR miss. Bootstrap must produce a human-readable report (CSV) of resolved vs unresolved companies so the user can manually fill the stragglers via Supabase Studio before the main ETL runs.

### Pattern 3: Entity-Typed Staging Tables + `raw_payload` (D-05.1)

**What:** Staging tables have typed columns (for `publish()` simplicity) + `raw_payload jsonb` (for re-parseability when schema evolves).

**Migration (Wave 1, new file e.g. `supabase/migrations/0018_staging_tables.sql`):**
```sql
-- staging.financial_statements: annual 사업보고서 재무제표 (D-02.1a)
CREATE TABLE staging.financial_statements (
  corp_code TEXT NOT NULL,
  fiscal_year INT NOT NULL,           -- bsns_year
  fiscal_period TEXT NOT NULL,        -- 'annual' | (future) 'q1'|'h1'|'q3'
  revenue_minor BIGINT,
  operating_income_minor BIGINT,
  total_assets_minor BIGINT,
  total_liabilities_minor BIGINT,
  currency_code CHAR(3) NOT NULL DEFAULT 'KRW',
  original_text TEXT,                 -- DART원본 계정과목명 + 원화단위 힌트
  fs_div TEXT NOT NULL DEFAULT 'CFS', -- 'CFS' consolidated | 'OFS' separate
  raw_payload JSONB NOT NULL,
  source_url TEXT,                    -- https://dart.fss.or.kr/dsaf001/main.do?rcpNo=...
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  etl_run_id UUID NOT NULL,
  PRIMARY KEY (corp_code, fiscal_year, fiscal_period, fs_div)
);

-- staging.executives: 임원 정보
CREATE TABLE staging.executives (
  corp_code TEXT NOT NULL,
  exec_name TEXT NOT NULL,
  position TEXT NOT NULL,
  appointed_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  raw_payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  etl_run_id UUID NOT NULL,
  PRIMARY KEY (corp_code, exec_name, position, COALESCE(appointed_date, '1900-01-01'::DATE))
);

-- staging.disclosures: 수시공시 D-02.4 filter
CREATE TABLE staging.disclosures (
  corp_code TEXT NOT NULL,
  disclosure_id TEXT NOT NULL,        -- rcept_no
  disclosure_type TEXT NOT NULL,      -- '증자'|'감자'|'임원변경'|'합병분할'|'해산'
  disclosure_date DATE NOT NULL,      -- rcept_dt
  title TEXT NOT NULL,                -- report_nm
  raw_payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  etl_run_id UUID NOT NULL,
  PRIMARY KEY (corp_code, disclosure_id)
);

-- staging.etl_review_queue: unmatched / ambiguous → Phase 4b admin
CREATE TABLE staging.etl_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corp_code TEXT NOT NULL,
  reason TEXT NOT NULL,              -- 'unmatched_corp_code'|'ambiguous_name'|'parse_error'
  entity_kind TEXT NOT NULL,         -- 'financial_statements'|'executives'|'disclosures'
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrences INT NOT NULL DEFAULT 1,
  raw_payload JSONB NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,                  -- auth.uid() of admin
  resolution_note TEXT
);
CREATE INDEX ix_review_queue_unresolved ON staging.etl_review_queue(first_seen_at) WHERE resolved_at IS NULL;

-- RLS: service-role only (baseline from 0009_staging_schema)
ALTER TABLE staging.financial_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.executives           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.disclosures          ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.etl_review_queue     ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies = default-deny.
-- service_role has BYPASSRLS and is unaffected.
```

**Idempotent upsert (psycopg example):**
```python
# etl/src/etl/db/staging_upsert.py
UPSERT_FINSTATE_SQL = """
INSERT INTO staging.financial_statements
  (corp_code, fiscal_year, fiscal_period, revenue_minor, operating_income_minor,
   total_assets_minor, total_liabilities_minor, currency_code, original_text,
   fs_div, raw_payload, source_url, fetched_at, etl_run_id)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, NOW(), %s)
ON CONFLICT (corp_code, fiscal_year, fiscal_period, fs_div)
DO UPDATE SET
  revenue_minor = EXCLUDED.revenue_minor,
  operating_income_minor = EXCLUDED.operating_income_minor,
  total_assets_minor = EXCLUDED.total_assets_minor,
  total_liabilities_minor = EXCLUDED.total_liabilities_minor,
  original_text = EXCLUDED.original_text,
  raw_payload = EXCLUDED.raw_payload,
  source_url = EXCLUDED.source_url,
  fetched_at = NOW(),
  etl_run_id = EXCLUDED.etl_run_id
"""
```

### Pattern 4: `publish()` Postgres Function (D-06.1)

**What:** Single-transaction function that reads one staging row (or set of rows for one corp_code) + writes `public.*` canonical + `public.data_sources` + cache_invalidation_events. Invoked from Phase 4b admin UI via `supabase.rpc('publish_financial_statements', { corp_code, fiscal_year })`.

**Key design decisions (verified from Supabase + Postgres docs):**
1. **`SECURITY INVOKER`** (default) — admin UI calls via `service_role` key which has BYPASSRLS. `SECURITY DEFINER` would bypass the caller's identity and break audit attribution. **[CITED: supabase.com/docs/guides/database/functions]**
2. **Works WITH existing `fn_audit_log_write` trigger** (migration 0014) — trigger fires automatically on public table writes, tagging `TG_ARGV[0]='app'`. To change the tag to `'etl'`, use Postgres GUC: `PERFORM set_config('audit.source', 'etl', true);` before canonical writes, then update the audit function to read from GUC. **[ASSUMED]** ⚠ Existing `fn_audit_log_write` hardcodes `TG_ARGV[0]`; **Wave 1 task must patch it** to prefer `current_setting('audit.source', true)` if set, fall back to `TG_ARGV[0]`.
3. **Return type `JSONB`** (not `SETOF record`) — easier for supabase-py to consume and for planner to assert structure in pgtap tests.
4. **Locking:** `SELECT ... FROM staging.X WHERE ... FOR UPDATE` to prevent double-publish from concurrent admin clicks.

**Skeleton:**
```sql
-- Migration 0019_publish_function.sql (Wave 1 — after staging tables)
CREATE OR REPLACE FUNCTION public.publish_financial_statements(
  p_corp_code TEXT,
  p_fiscal_year INT,
  p_fs_div TEXT DEFAULT 'CFS'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_source_id UUID;
  v_staging RECORD;
  v_result JSONB;
BEGIN
  -- Tag audit writes as coming from ETL pipeline
  PERFORM set_config('audit.source', 'etl', true);

  -- 1. Identity resolution — FAIL FAST if no match
  SELECT company_id INTO v_company_id
  FROM public.company_identifiers
  WHERE kind = 'dart_corp_code' AND value = p_corp_code AND deleted_at IS NULL;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'unmatched_corp_code: %', p_corp_code
      USING HINT = 'Add row to company_identifiers or resolve via staging.etl_review_queue';
  END IF;

  -- 2. Lock staging row for the (corp_code, year, fs_div) tuple
  SELECT * INTO v_staging
  FROM staging.financial_statements
  WHERE corp_code = p_corp_code
    AND fiscal_year = p_fiscal_year
    AND fs_div = p_fs_div
    AND fiscal_period = 'annual'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'staging row not found: % / % / %', p_corp_code, p_fiscal_year, p_fs_div;
  END IF;

  -- 3. Create a data_sources row for provenance (DATA-10 / TRUST-01)
  INSERT INTO public.data_sources (source_type, source_url, etl_run_id, license_note)
  VALUES ('dart', v_staging.source_url, v_staging.etl_run_id::TEXT, 'DART Open API — 공개')
  RETURNING id INTO v_source_id;

  -- 4. Canonical upsert into company_facts (4 facts per year per company)
  -- audit_log trigger on company_facts automatically emits 4 rows tagged 'etl' via GUC
  INSERT INTO public.company_facts
    (company_id, fact_type, amount_minor, currency_code, original_text,
     observed_at, period_type, source_id, last_verified_at)
  VALUES
    (v_company_id, 'revenue',          v_staging.revenue_minor,           'KRW', v_staging.original_text,
     make_date(v_staging.fiscal_year, 12, 31), 'annual', v_source_id, NOW()),
    (v_company_id, 'operating_income', v_staging.operating_income_minor,  'KRW', v_staging.original_text,
     make_date(v_staging.fiscal_year, 12, 31), 'annual', v_source_id, NOW()),
    (v_company_id, 'total_assets',     v_staging.total_assets_minor,      'KRW', v_staging.original_text,
     make_date(v_staging.fiscal_year, 12, 31), 'annual', v_source_id, NOW()),
    (v_company_id, 'total_liabilities',v_staging.total_liabilities_minor, 'KRW', v_staging.original_text,
     make_date(v_staging.fiscal_year, 12, 31), 'annual', v_source_id, NOW());

  -- 5. Cache invalidation event for Next.js revalidateTag
  INSERT INTO public.cache_invalidation_events (tag, company_id, triggered_by, fired_at)
  VALUES ('company:' || (SELECT slug FROM public.companies WHERE id = v_company_id),
          v_company_id, 'publish_financial_statements', NOW());

  -- 6. Touch companies.last_verified_at
  UPDATE public.companies SET last_verified_at = NOW() WHERE id = v_company_id;

  v_result := jsonb_build_object(
    'company_id', v_company_id,
    'source_id', v_source_id,
    'fact_count', 4,
    'fiscal_year', p_fiscal_year
  );
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_financial_statements(TEXT, INT, TEXT) FROM anon, authenticated;
-- service_role bypasses grants; admin role granted in migration 0020 when Phase 4b lands
```

**Tests (pgtap, Wave 5):**
```sql
-- tests/sql/test_publish.sql
SELECT plan(6);

-- Setup: insert staging row + identifier mapping
INSERT INTO staging.financial_statements (...) VALUES (...);
INSERT INTO public.company_identifiers(company_id, kind, value, source_id) VALUES (...);

-- Assertions
SELECT lives_ok($$ SELECT publish_financial_statements('00126380', 2024) $$, 'publish succeeds');
SELECT results_eq(
  $$ SELECT fact_type FROM public.company_facts WHERE company_id = '...' $$,
  $$ VALUES ('revenue'), ('operating_income'), ('total_assets'), ('total_liabilities') $$,
  '4 facts inserted');
SELECT is((SELECT count(*) FROM public.audit_log WHERE source = 'etl'), 4::bigint, 'audit log tagged etl');
SELECT throws_ok(
  $$ SELECT publish_financial_statements('99999999', 2024) $$,
  'unmatched_corp_code: 99999999', 'raises on unknown corp_code');

SELECT * FROM finish();
```

### Pattern 5: Cache Invalidation — Supabase Database Webhook (RECOMMENDED over D-06.3)

**What:** Postgres trigger on `public.cache_invalidation_events` INSERT → Supabase Database Webhook → HTTP POST to Next.js `/api/revalidate` with `{ tag, company_id, signature }`. Next.js Route Handler verifies HMAC, calls `revalidateTag(tag)`.

**Why over the CONTEXT D-06.3 polling design:**
- ✓ Works on Vercel Hobby (no cron needed)
- ✓ Sub-second latency (vs up-to-1-min poll)
- ✓ No drift between `cache_invalidation_events` rows piling up and drain cron
- ✓ Built-in retry on 5xx by Supabase
- ✓ Uses pg_net which is already available on Supabase managed Free [CITED: supabase.com/docs/guides/database/extensions/pg_net]

**Implementation (Wave 1 migration after publish() is written):**
```sql
-- supabase/migrations/0020_cache_invalidation_webhook.sql
CREATE TABLE public.cache_invalidation_events (
  id BIGSERIAL PRIMARY KEY,
  tag TEXT NOT NULL,               -- 'company:toss' etc
  company_id UUID,
  triggered_by TEXT,                -- function name that fired
  fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ,        -- filled by webhook on successful POST
  dispatch_status TEXT              -- 'pending'|'ok'|'failed'
);
CREATE INDEX ix_cache_events_pending ON public.cache_invalidation_events(fired_at) WHERE dispatched_at IS NULL;

-- Supabase Database Webhook wiring is done via Dashboard OR via pg_net directly.
-- Dashboard route: Database > Webhooks > Create Webhook
--   Table: public.cache_invalidation_events
--   Events: INSERT
--   Type: HTTP Request
--   URL: https://vc-co-finder.vercel.app/api/revalidate
--   HTTP Headers: {"Authorization": "Bearer <shared-secret>", "Content-Type":"application/json"}
--   Timeout: 5000ms
```

**Next.js handler (Phase 4a Wave 4 task):**
```typescript
// src/app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  // Supabase webhook shape: { type: 'INSERT', table: '...', record: {...} }
  const tag = body.record?.tag;
  if (typeof tag !== 'string') {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }
  revalidateTag(tag);
  return NextResponse.json({ ok: true, revalidated: tag });
}
```

**Fallback retry (if Next.js is briefly unreachable):** Add a row marker + a manual drain endpoint `/api/cache/drain?limit=100` protected by the same secret, and a Next.js Server Action admin button in Phase 4b admin page. Supabase's built-in retry usually suffices (HTTP 2xx vs 4xx/5xx-driven).

**This replaces D-06.3's per-minute poll entirely.** Planner MUST record this as an amendment in the 04a plan.

### Pattern 6: `etl_runs` Observability Table (D-07.2)

```sql
-- Migration 0018 (alongside staging tables)
CREATE TABLE public.etl_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','partial_failure','failed')),
  processed_count INT NOT NULL DEFAULT 0,
  new_count INT NOT NULL DEFAULT 0,
  updated_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  corp_codes TEXT[],
  notes TEXT
);
-- Allow 'editor' + 'admin' role to SELECT (for /admin/etl stub)
ALTER TABLE public.etl_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY etl_runs_admin_read ON public.etl_runs FOR SELECT
  USING ((auth.jwt() ->> 'user_role') IN ('editor','admin'));
```

### Anti-Patterns to Avoid

- **Running ETL inside Next.js API routes.** Vercel Hobby function timeout is 10s — DART finstate_all for 10 companies ≈ 30s. Stick to the separate Fly worker.
- **Using OpenDartReader directly in publish() or admin UI.** Keep OpenDartReader confined to `etl/`. Next.js should never import Python.
- **Using supabase-py `.rpc()` inside a `.transaction()` context manager.** PostgREST already wraps RPC calls in a transaction. **[CITED: dev.to/voboda — gotcha supabase-postgrest-rpc-with-transactions]** Nested transactions are either no-ops or errors.
- **Reading `auth.uid()` in `publish()`.** It returns NULL under service_role. Audit attribution relies on GUC + explicit `actor_id` passed in the RPC call.
- **Fuzzy-matching company names in Python code.** D-01.2 locks this out. Every row either matches `dart_corp_code` or goes to review queue.
- **Storing DART API key in `.env.example` or committed files.** Secrets live in Fly + GH Actions. `.env.example` documents **key names only**.
- **APScheduler in the Fly worker.** GH Actions IS the scheduler (D-04.4). An in-process scheduler would run whenever the machine is awake, defeating scale-to-zero.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DART API client (xml parsing, corp_code resolution, finstate shape) | Custom `httpx` wrapper | **OpenDartReader 0.2.3** | Handles DART quirks (xml↔json, corp_code cache, `list`/`finstate_all`/`company` endpoints, error responses). |
| Korean company name → corp_code resolution | `difflib.get_close_matches` | **`dart.find_corp_code(name)`** | DART has its own index; fuzzy-matching on our side produces false matches. |
| HTTP retry/backoff for DART | Custom `while retries < 5` loop | **httpx `Retry` transport** or **tenacity** `@retry` | Battle-tested exponential backoff + jitter. |
| PostgreSQL migrations | Drizzle Kit migrations | **Supabase CLI migrations (`supabase/migrations/*.sql`)** | Phase 1 D-02.2 locked this — Drizzle for queries, Supabase CLI for DDL. |
| Docker image layering for Python | Copy-all-then-install | **uv `--mount=type=cache` + multi-stage** | [CITED: docs.astral.sh/uv/guides/integration/docker] 10x faster rebuilds. |
| Scheduler | Cron-like process inside Fly | **GH Actions schedule + `workflow_dispatch`** | GH Actions is free, logs runs, supports manual replay. |
| Cache invalidation | Poll loop | **Supabase Database Webhook (pg_net)** | Free, real-time, managed. See Pattern 5. |
| Idempotent upsert | SELECT-then-INSERT | **`INSERT ... ON CONFLICT (...) DO UPDATE`** | Atomic, race-free, single round-trip. |
| Transactional publish | App-layer `BEGIN; COMMIT;` in Python | **plpgsql function** | Runs entirely in DB, exception = rollback, audit trigger fires naturally. |
| Sentry FastAPI setup | Middleware wiring | **`sentry_sdk[fastapi]` auto-enable** | Picks up routes + exceptions with zero boilerplate. |
| Test recordings for DART | Hit real API in tests | **vcr.py / `responses` library with JSON fixtures** | Reproducible CI, no rate limit hits. |

## Runtime State Inventory

> This is a greenfield phase (new Python service + new DB tables); no pre-existing runtime state of the kind this section is designed for. Documented below for completeness.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None in Phase 4a (creates new `staging.*` tables, new `company_identifiers(kind='dart_corp_code')` rows, new `etl_runs` rows). Phase 2's `scripts/seed/companies/*.ts` have **zero `dart_corp_code` identifiers** — this is a bootstrap gap, not stale state. | Wave 0 bootstrap fills dart_corp_code identifiers. No migration of existing data needed. |
| Live service config | New: Fly.io app `vcfinder-etl`. New: Supabase Database Webhook row (via Dashboard). New: GH Actions workflow file. None of these exist yet. | Wave 3/4 creates them. Document Supabase Webhook config in `etl/README.md` + `.planning/SUMMARY.md` after phase completes (Dashboard config is NOT in git). |
| OS-registered state | None — Fly Machines are declarative from `fly.toml`. | None. |
| Secrets/env vars | New env vars: `DART_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (exists in Next.js but must be shared with etl/), `SENTRY_DSN_ETL`, `ETL_RUN_SHARED_SECRET`, `SUPABASE_WEBHOOK_SECRET`. Document all in `etl/.env.example` + repo-root `.env.example`. | Wave 3 task: populate Fly secrets + GH Actions repo secrets. Wave 4 task: add `SUPABASE_WEBHOOK_SECRET` to Vercel env. |
| Build artifacts | uv.lock — new file, committed. uv builds the `.venv` inside Docker; no local artifact pollution. | None. |

## Common Pitfalls

### Pitfall 1: Vercel Hobby cron ≠ per-minute (BLOCKS D-06.3 as written)

**What goes wrong:** CONTEXT D-06.3 says "Poll cadence = per minute (Vercel Cron free tier minimum)". Vercel Hobby crons actually run **at most once per day** [VERIFIED: vercel.com/docs/cron-jobs/usage-and-pricing], and even Pro is limited to per-minute, not sub-minute. If the plan wires the polling drainer as written, deploy will **fail at cron registration time**.

**Why it happens:** Training data / older docs conflate Vercel's "minute precision" (Pro) with "minimum interval" (Hobby = 1/day).

**How to avoid:** Planner MUST replace D-06.3 polling with **Supabase Database Webhook** (Pattern 5). The webhook fires on INSERT to `cache_invalidation_events` and POSTs directly to a Next.js Route Handler — no cron needed. This is fully Free-tier compatible.

**Warning signs:** Any Vercel deploy error mentioning `crons[0].schedule` invalid + any PR review where cron.json contains a schedule < `0 * * * *`.

### Pitfall 2: OpenDartReader 0.2.3 is 3+ years stale

**What goes wrong:** Last PyPI release was 2023-03-15. DART could change XML schema or field names silently and break parsing. Python 3.12 compatibility unverified.

**Why it happens:** Small maintainer community, niche library.

**How to avoid:**
1. Add `tests/unit/test_opendartreader_compat.py` that hits 1 real API call behind a `PYTEST_NETWORK=1` env guard during `Wave 5`, run locally before deploy.
2. Pin exact version in `pyproject.toml` (`OpenDartReader==0.2.3`), not `>=0.2.3`.
3. If pandas/requests upstream majors make it break: `uv pip install git+https://github.com/quantylab/OpenDartReader.git@<commit-sha>` as fallback.
4. Build a thin wrapper in `etl/src/etl/dart/client.py` so migration to `dart-fss` or fork is localized if needed.

**Warning signs:** ImportError at Docker build, pandas DeprecationWarning about xml parser, empty DataFrames returned consistently.

### Pitfall 3: `finstate_all` returns empty DataFrame silently for non-consolidated companies

**What goes wrong:** [CITED: github.com/FinanceData/OpenDartReader/issues/11] Companies without subsidiaries (most 외감 없는 스타트업, some small 외감 companies) have no "CFS" (consolidated) statements — `finstate_all(corp, year, fs_div='CFS')` returns empty DataFrame, **not an exception**. Default `fs_div='CFS'` silently skips these companies.

**Why it happens:** DART splits data by CFS/OFS division; OpenDartReader defaults to CFS.

**How to avoid:** In `etl/src/etl/dart/reports.py`, implement fallback:
```python
df = dart.finstate_all(corp_code, year, fs_div='CFS')
if df.empty:
    df = dart.finstate_all(corp_code, year, fs_div='OFS')
if df.empty:
    # Report to staging.etl_review_queue with reason='no_financial_data_available'
    ...
```
Store `fs_div` in the staging row so `publish()` knows whether the fact came from consolidated or separate statements (and admin UI can label).

**Warning signs:** Staging table showing 0 financial rows for a specific corp_code across all years. ≥95% match SLA failure.

### Pitfall 4: Korean company name matching via `find_corp_code` is substring-greedy

**What goes wrong:** `dart.find_corp_code('토스')` may return the first company whose name *contains* "토스" — which could be an unrelated entity ("토스리테일" vs "토스"). Bootstrap silently writes wrong `dart_corp_code` → `company_identifiers`.

**Why it happens:** DART's name search is substring + case-insensitive; OpenDartReader returns the first hit.

**How to avoid:**
1. Bootstrap uses **legal_name first** (e.g., "비바리퍼블리카"), falls back to display_name_ko ("토스") only if legal_name miss.
2. Emit `tests/manual/bootstrap_verification.csv` from `bootstrap_corp_codes.py` with columns `[slug, resolved_corp_code, corp_name_per_dart, match_score]`; **human review required before commit**.
3. Wave 0 exit criterion: CSV reviewed by user; any ambiguous row → manually pinned in a `etl/data/corp_code_overrides.json` file consulted before API call.

**Warning signs:** Bootstrap resolves all 15 (not ≤10 외감). Financial statements appearing for a company that shouldn't be 외감.

### Pitfall 5: DART API key accidentally logged

**What goes wrong:** OpenDartReader passes `api_key` as query parameter to every HTTP request. `httpx` or `requests` stack traces (in Sentry) can include the full URL.

**Why it happens:** URL-as-log-line convention. Sentry captures `request.url` by default.

**How to avoid:**
1. `before_send` in sentry_sdk init scrubs `api_key=*` from any URL in `event['request']['url']` and `event['exception'][...]['value']`.
2. In Python logging, add a `logging.Filter` that redacts `api_key=[A-Za-z0-9]+`.
3. Consider wrapping OpenDartReader requests in an httpx transport that strips `api_key` from error messages before raising.

**Warning signs:** Sentry event containing `api_key=abc123...` in any field.

### Pitfall 6: `fn_audit_log_write` trigger hardcodes `TG_ARGV[0]='app'`

**What goes wrong:** Migration 0014 attaches the audit trigger with `TG_ARGV[0]='app'`. `publish()` can't change that to `'etl'` without either (a) dropping+re-attaching the trigger (invasive) or (b) patching the trigger function to prefer a GUC. Currently no audit entries will be tagged 'etl' — they'll all say 'app', masking ETL provenance.

**Why it happens:** Phase 1 D-03.4 anticipated this but deferred the GUC wiring to Phase 4a.

**How to avoid:** Wave 1 task: amend `fn_audit_log_write` (in new migration 0019 — copy-and-replace) to read:
```sql
v_source := COALESCE(current_setting('audit.source', true), TG_ARGV[0], 'app');
```
Then `publish()` sets `audit.source='etl'` before inserts. Backwards-compatible.

**Warning signs:** `SELECT DISTINCT source FROM audit_log` only returns 'app'.

### Pitfall 7: GitHub Actions cron schedule is UTC-only and unreliable

**What goes wrong:** CONTEXT D-03.3: `0 17 * * *` UTC = 02:00 KST **only when KST is UTC+9** (always). But GH Actions cron delays of 5-30 min are "normal and documented" [CITED: github.blog/changelog 2019-11-01]. High-load periods can skip runs entirely. Also: minimum schedule granularity is 5 min — doesn't affect our daily cadence but matters if we ever need per-hour.

**How to avoid:**
1. Add `workflow_dispatch:` trigger → manual runs always work.
2. Monitor `etl_runs` table: if today's row is missing after 03:30 KST, Sentry alert.
3. Don't panic at 02:10 vs 02:25 — it's within normal variance.
4. NEVER rely on cron timing for data correctness — use idempotent upsert so re-runs are safe.

**Warning signs:** Missing daily `etl_runs` row; Sentry alert "no etl_run logged for >24h".

### Pitfall 8: Fly Machine cold start causes first-request timeout

**What goes wrong:** First request after idle wakes Fly machine — can take 1-2s for Python + pandas + OpenDartReader imports. GH Actions → Fly `POST /run` with default HTTP timeout (no timeout) is fine, but health checks during boot can fail if `grace_period` is too short.

**How to avoid:**
1. `fly.toml` `[[http_service.checks]] grace_period = "10s"` (shown in Pattern 1).
2. Lazy-import heavy modules inside handlers, not at module top — measure with `python -X importtime main.py`.
3. Alternative: `min_machines_running = 1` keeps one warm (costs money; NOT for Phase 4a on free tier).

**Warning signs:** First `POST /run` returns 502; subsequent requests 200.

## Code Examples

### Example 1: OpenDartReader finstate_all pull with CFS→OFS fallback

```python
# etl/src/etl/dart/reports.py
# [CITED: github.com/FinanceData/OpenDartReader/blob/master/dart_finstate.py]
from typing import Optional
import OpenDartReader
import pandas as pd

ANNUAL_REPRT_CODE = '11011'  # 사업보고서 (annual)

class DartReports:
    def __init__(self, api_key: str):
        self.dart = OpenDartReader(api_key)

    def pull_annual_financials(
        self, corp_code: str, year: int
    ) -> tuple[Optional[pd.DataFrame], str]:
        """Returns (df, fs_div) where fs_div is 'CFS' or 'OFS' or 'NONE'.
        Pattern from PITFALLS #3.
        """
        for fs_div in ('CFS', 'OFS'):
            try:
                df = self.dart.finstate_all(
                    corp_code, year,
                    reprt_code=ANNUAL_REPRT_CODE,
                    fs_div=fs_div,
                )
                if df is not None and not df.empty:
                    return df, fs_div
            except Exception as e:
                # OpenDartReader raises rarely; caller captures to Sentry
                raise
        return None, 'NONE'
```

### Example 2: corp_code bootstrap with human-reviewable CSV

```python
# etl/src/etl/bootstrap_corp_codes.py
import csv
import OpenDartReader
from etl.db.supabase_client import admin_client

def bootstrap():
    dart = OpenDartReader(api_key=os.environ["DART_API_KEY"])
    client = admin_client()

    # Load Phase 2 seed companies
    companies = client.table("companies").select("id, slug, display_name_ko, legal_name") \
        .is_("deleted_at", "null").execute().data

    results = []
    for co in companies:
        # Try legal_name first (more precise), fall back to display_name_ko
        corp_code = None
        try_with = [co.get("legal_name"), co.get("display_name_ko")]
        for name in filter(None, try_with):
            code = dart.find_corp_code(name)
            if code:
                corp_code = code
                used_name = name
                break

        if corp_code:
            # Get DART's view of the company for human verification
            try:
                company_info = dart.company(corp_code)
                dart_name = company_info.get("corp_name", "?")
            except Exception:
                dart_name = "(lookup failed)"

            results.append({
                "slug": co["slug"],
                "resolved_via_name": used_name,
                "corp_code": corp_code,
                "dart_corp_name": dart_name,
                "needs_human_review": dart_name != co.get("legal_name")
                                   and dart_name != co.get("display_name_ko"),
            })
        else:
            results.append({
                "slug": co["slug"],
                "resolved_via_name": None,
                "corp_code": None,
                "dart_corp_name": None,
                "needs_human_review": True,
                "skip_reason": "non_external_audit_or_unresolvable",
            })

    # Write CSV for human review BEFORE committing identifiers
    with open("etl/data/bootstrap_review.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    # Only commit rows that don't need review
    safe_rows = [r for r in results if not r["needs_human_review"] and r["corp_code"]]
    for r in safe_rows:
        client.table("company_identifiers").upsert({
            "company_id": find_company_id(client, r["slug"]),
            "kind": "dart_corp_code",
            "value": r["corp_code"],
            "source_id": "00000000-0000-0000-0000-000000000001",  # manual source
        }, on_conflict="kind,value").execute()

    review_needed = [r for r in results if r["needs_human_review"]]
    print(f"auto-committed: {len(safe_rows)}, human review needed: {len(review_needed)}")
    print("Review etl/data/bootstrap_review.csv and manually confirm before scheduling ETL.")
```

### Example 3: Sentry init with PII scrubbing

```python
# etl/src/etl/sentry.py
# [CITED: docs.sentry.io/platforms/python/integrations/fastapi]
import os
import re
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

API_KEY_RE = re.compile(r'(api[_-]?key|crtfc_key)=[^&\s]+', re.IGNORECASE)

def _scrub_api_key(s: str) -> str:
    return API_KEY_RE.sub(r'\1=[REDACTED]', s)

def before_send(event, hint):
    # Scrub URL query strings
    if event.get("request", {}).get("url"):
        event["request"]["url"] = _scrub_api_key(event["request"]["url"])
    # Scrub exception messages
    for exc in event.get("exception", {}).get("values", []):
        if exc.get("value"):
            exc["value"] = _scrub_api_key(exc["value"])
    return event

def init_sentry():
    dsn = os.environ.get("SENTRY_DSN_ETL")
    if not dsn:
        return
    sentry_sdk.init(
        dsn=dsn,
        environment=os.environ.get("FLY_APP_NAME", "etl-local"),
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=0.1,  # 10% perf sampling
        send_default_pii=False,
        before_send=before_send,
    )
```

### Example 4: GitHub Actions workflow (daily cron + workflow_dispatch)

```yaml
# .github/workflows/etl-daily.yml
name: ETL daily sweep
on:
  schedule:
    - cron: '0 17 * * *'     # UTC 17:00 = KST 02:00
  workflow_dispatch:           # manual replay button

jobs:
  run-etl:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Trigger Fly worker
        env:
          ETL_RUN_URL: ${{ secrets.ETL_RUN_URL }}     # https://vcfinder-etl.fly.dev/run
          ETL_RUN_SHARED_SECRET: ${{ secrets.ETL_RUN_SHARED_SECRET }}
        run: |
          set -eo pipefail
          response=$(curl -sS -w "\n%{http_code}" \
            -X POST "$ETL_RUN_URL" \
            -H "X-ETL-Secret: $ETL_RUN_SHARED_SECRET" \
            -H "Content-Type: application/json" \
            --max-time 1800)
          body=$(echo "$response" | head -n -1)
          code=$(echo "$response" | tail -n1)
          echo "status=$code"
          echo "body=$body"
          if [ "$code" != "200" ]; then
            echo "::error::ETL worker returned $code"
            exit 1
          fi
```

### Example 5: GitHub Actions fly deploy workflow

```yaml
# .github/workflows/etl-deploy.yml
name: ETL deploy to Fly
on:
  push:
    branches: [main]
    paths:
      - 'etl/**'
      - '.github/workflows/etl-deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    concurrency: deploy-fly-etl
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only --config etl/fly.toml --app vcfinder-etl
        working-directory: etl
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Example 6: CI grep-ban step for `thevc.kr` (DATA-11)

```yaml
# .github/workflows/ci.yml — new job added to existing CI workflow
jobs:
  thevc-ban:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Forbid thevc.kr references in source
        run: |
          # Allow matches only in .planning/ (docs) + node_modules/ + etl/tests/fixtures/ (any recorded DART response accidentally)
          matches=$(grep -r -l -F 'thevc.kr' \
            --exclude-dir=.planning \
            --exclude-dir=node_modules \
            --exclude-dir=.next \
            --exclude-dir=.git \
            --exclude-dir='etl/tests/fixtures' \
            . || true)
          if [ -n "$matches" ]; then
            echo "::error::thevc.kr references found outside allowed paths:"
            echo "$matches"
            exit 1
          fi
          echo "clean — no thevc.kr references in source."
```

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|--------------|-------------------------|--------------|--------|
| `requirements.txt` + `pip-tools` | **uv lockfile + pyproject.toml** | 2024-2025 ecosystem shift | 10-100x faster CI, reproducible, single tool |
| `poetry` | **uv** | 2025 | Poetry install slow, uv is Rust-based and faster; same `pyproject.toml` |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 deprecated | (Next.js side — already done in Phase 1) |
| Postgres trigger → HTTP via custom function | **pg_net + Supabase Database Webhooks** | 2023-2024 | Managed, retriable, no custom pg_background |
| Poll cron drainers | **Database Webhook push** | — | Sub-second latency, no polling waste |
| DART XML direct scraping | **OpenDartReader / dart-fss** | 2020-2022 | Free official wrapper libraries exist; don't hand-roll |
| Docker image from scratch with pip | **Multi-stage uv + cache mounts** | 2024-2025 | Dramatically faster rebuilds |

**Deprecated/outdated:**
- **`@supabase/supabase-py` < 2.0** — current major is 2.x with async support and different import path (`from supabase import create_client`).
- **OpenDartReader-related tutorials pre-2022** — may reference pre-`finstate_all` APIs.
- **Vercel Cron for ETL** — Phase 1 STATE.md already locked this out.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | OpenDartReader 0.2.3 works on Python 3.12 (unverified — library declares `>=3` only, last release 2023-03-15) | Standard Stack | Wave 5 smoke test catches — if fails, fall back to `quantylab` fork or `dart-fss`. Planner should budget +½ day for this contingency. |
| A2 | DART 20,000 calls/day/key rate limit (from CONTEXT D-03.2) | Architecture Pattern 1 | Actual limit could differ by registration tier (personal vs institutional). For Phase 4a scale (<50 calls/day) this is irrelevant — but document for Phase 8 LAUNCH scaling. |
| A3 | `fn_audit_log_write` must be patched to support GUC-based source override | Common Pitfalls #6 | Without the patch, every publish() write is mis-attributed to 'app' in audit_log. Cheap to add; big data correctness win. |
| A4 | Supabase Database Webhooks work on Free tier (docs don't enumerate tier restrictions explicitly) | Architecture Pattern 5 | pg_net is enabled on all Supabase projects per docs; webhooks are "a convenience wrapper around triggers using pg_net" — high confidence they work, but verify in Wave 4 before finalizing. Fallback: custom trigger + pg_net direct call (more code, same mechanism). |
| A5 | Fly.io free-tier allocations cover our shared-cpu-1x 512MB + scale-to-zero pattern at zero cost | Standard Stack | Fly no longer advertises a hard "free tier" since 2024; instead $5 usage credit. Scale-to-zero with <5 min/day runtime effectively stays under $5/mo. Monitor in Wave 4. |
| A6 | Phase 2 seed companies ≥8 are 외감 대상 (for D-02.2 ≥95% match criterion) | User Constraints | If <8 turn out to be 외감, the ≥95% match criterion is statistically meaningless (small sample). Wave 0 bootstrap CSV tells us exactly which seed companies DART has data for — this number is the "denominator" the ≥95% applies to. |
| A7 | Phase 4a does NOT need to modify `fn_audit_log_write` if we accept that audit_log shows `source='app'` for publish-triggered writes | Common Pitfalls #6 | **Alternative to A3.** If planner chooses not to patch the trigger, downstream Phase 4b admin UI can still distinguish ETL writes via `etl_runs` joins. Cheaper but loses audit signal. Planner's call. |
| A8 | `cache_invalidation_events` table design (Pattern 5) is new — no existing migration | Architecture Pattern 5 | New table is greenfield; risk is only schema drift if another phase lands a conflicting design. Planner should verify no other phase references this name before approving. |

## Open Questions

1. **DART API key tier — personal vs institutional?**
   - What we know: DART offers two registration tracks; personal = 20k calls/day, institutional = higher. Phase 4a scale doesn't hit limits either way.
   - What's unclear: Does user already have a key? Which tier? (CONTEXT doesn't say.)
   - Recommendation: Planner Wave 0 precondition — user confirms DART API key exists + documents tier in `etl/README.md`.

2. **OpenDartReader Python 3.12 compatibility — will it work on CI/Fly?**
   - What we know: Declared `python_requires='>=3'` (so not even `>=3.7` explicit). Pure Python + pandas + requests + xmltodict deps.
   - What's unclear: Pandas 2.x / requests 2.32+ / Python 3.12 in combination could have edge cases.
   - Recommendation: Wave 0 local smoke test — `uv run python -c "import OpenDartReader; o = OpenDartReader('$DART_API_KEY'); print(o.company('00126380'))"`. If fails → switch to `quantylab` fork or `dart-fss` before Wave 1.

3. **HWP/HWPX parsing for attachment-based facts?**
   - What we know: CONTEXT STATE.md "Open Questions Phase 4a" flags this. Phase 4a only parses structured `finstate_all` fields — HWP attachments are out.
   - What's unclear: Does any Phase 4a requirement actually need HWP parsing?
   - Recommendation: **Explicitly deferred.** Annual 재무제표 via `finstate_all` returns structured rows; HWP attachments needed only for narrative-field extraction which isn't a DATA-0x requirement.

4. **`staging.*` schema exposure to PostgREST — how does supabase-py write to it?**
   - What we know: PostgREST by default serves `public` schema. To `.table('X')` a staging table, either (a) add `staging` to PostgREST `db-schemas` setting, or (b) use `psycopg` direct.
   - What's unclear: Does Supabase Dashboard allow `db-schemas` customization on managed Free tier? (Dashboard → Settings → API → Exposed schemas)
   - Recommendation: Use **psycopg direct** for staging writes (Pattern 3), supabase-py only for `public.etl_runs` + RPC calls. Sidesteps the question entirely.

5. **Phase 2 외감 subset — which of the 15 seed companies?**
   - What we know: Phase 2 seed has 15 companies. 외감 대상 subset is estimated 8-10 but not enumerated.
   - What's unclear: Which specific slugs are 외감?
   - Recommendation: Wave 0 bootstrap CSV answers this empirically — the subset is "whichever companies have `dart_corp_code` resolved". Document the subset in `etl/README.md` after Wave 0.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12 | Fly build | ✓ in `python:3.12-slim` Docker image | 3.12 | — |
| uv | Fly build + CI | ✓ via `ghcr.io/astral-sh/uv:0.11.7` | 0.11.7 | — |
| Fly.io account | Deploy | User must have/create | — | Deploy blocked until user creates + generates `FLY_API_TOKEN` |
| GitHub Actions runners | Cron + deploy | ✓ Free tier (2,000 min/mo for private repos; this repo's status TBD) | — | If private + exceeds → switch repo to public OR pay for Actions minutes |
| Supabase project | Staging writes + RPC | ✓ from Phase 1 | Postgres 15 | — |
| Supabase pg_net extension | Database Webhook | ✓ available on managed [VERIFIED: supabase.com/docs] | — | — |
| DART API key | Data pulls | **Unknown — CONTEXT doesn't confirm user holds one** | — | **BLOCKING** — planner Wave 0 precondition: confirm key exists, document tier. No viable fallback (cannot mock DART for production). |
| Sentry project | Error tracking | ✓ from Phase 1 (main app exists); need new DSN for `etl` | — | If creating fails: log to stdout + Fly logs for v1. |
| Vercel deployment | Cache drainer | ✓ from Phase 1 | — | — |
| Docker on local dev | Optional (can test without) | N/A | — | Not required — Fly builds remotely. |

**Missing dependencies with no fallback:**
- **DART API key ownership** (blocking — see Open Question 1)

**Missing dependencies with fallback:**
- **Sentry DSN for ETL** — fallback to stdout + Fly logs is acceptable v1; upgrade later.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.0 + pytest-asyncio + pytest-mock (Python) + pgtap (SQL) + existing Next.js vitest (JS) |
| Config file | `etl/pyproject.toml` (pytest config under `[tool.pytest.ini_options]`), pgtap via `supabase test db` |
| Quick run command | `cd etl && uv run pytest tests/unit -x` (<10s) |
| Full suite command | `cd etl && uv run pytest tests/ -v` + `supabase test db` |
| Phase gate | Full Python suite + pgtap + existing JS `pnpm test` green before `/gsd-verify-work` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Fly worker boots + `/health` returns 200 | integration | `curl -f https://vcfinder-etl.fly.dev/health` (post-deploy check in `.github/workflows/etl-deploy.yml`) | ❌ Wave 4 |
| DATA-01 | `/run` rejects requests without shared secret | unit | `uv run pytest etl/tests/unit/test_auth.py::test_run_rejects_bad_secret` | ❌ Wave 3 |
| DATA-02 | Staging tables exist with expected shape | schema | `supabase db diff --linked --schema staging` produces no diff post-migration | ❌ Wave 1 |
| DATA-02 | `publish()` function writes to canonical + audit_log atomically | pgtap | `supabase test db` running `etl/tests/sql/test_publish.sql` | ❌ Wave 5 |
| DATA-03 | finstate_all mock → staging.financial_statements upsert | unit | `uv run pytest etl/tests/unit/test_staging_upsert.py::test_finstate_idempotent` | ❌ Wave 2 |
| DATA-03 | Executive roster mock → staging.executives upsert | unit | `uv run pytest etl/tests/unit/test_dart_reports.py::test_executives_parse` | ❌ Wave 2 |
| DATA-04 | corp_code → company_id resolver | unit | `uv run pytest etl/tests/unit/test_corp_code_resolver.py` | ❌ Wave 2 |
| DATA-04 | Bootstrap script writes expected `company_identifiers` rows | integration | `uv run pytest etl/tests/e2e/test_bootstrap.py` against local Supabase | ❌ Wave 0 |
| DATA-08 | Re-running ETL twice produces no new audit_log rows | integration | `uv run pytest etl/tests/e2e/test_idempotent.py` (runs daily sweep twice) | ❌ Wave 5 |
| DATA-09 | Errors go to Sentry (mocked) + `etl_runs.error_count` increments | unit | `uv run pytest etl/tests/unit/test_run_pipeline.py::test_error_counted` | ❌ Wave 3 |
| DATA-10 | cache_invalidation_events INSERT triggers webhook POST | integration | Post-deploy: manual INSERT into cache_invalidation_events; verify Next.js logs show revalidate call | ❌ Wave 4 |
| DATA-11 | CI fails when `thevc.kr` appears in src | CI smoke | CI workflow itself — included in every PR run | ❌ Wave 4 |
| ≥95% match rate (goal) | Phase 2 외감 seed → ETL staging match rate ≥95% | integration | `uv run pytest etl/tests/e2e/test_phase4a_e2e.py::test_match_rate` | ❌ Wave 5 |

### Sampling Rate
- **Per task commit:** `cd etl && uv run pytest tests/unit -x` (Python only, <10s) + Next.js `pnpm test` (existing)
- **Per wave merge:** Full Python + pgtap suite + `ruff check etl/`
- **Phase gate:** All tests green + manual `/health` + `/run` smoke + Supabase Webhook smoke

### Wave 0 Gaps (test infrastructure to set up)
- [ ] `etl/pyproject.toml` — pytest config + ruff config
- [ ] `etl/tests/conftest.py` — fixtures for mocked DART client + local Supabase connection
- [ ] `etl/tests/fixtures/dart/*.json` — recorded `finstate_all`, `company`, `list` responses for 2-3 seed companies
- [ ] `etl/tests/unit/test_opendartreader_compat.py` — single real-API smoke test behind `PYTEST_NETWORK=1` guard
- [ ] pgtap install check — `supabase test db` tooling available

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | FastAPI `/run` endpoint — shared-secret header verified against `ETL_RUN_SHARED_SECRET`. No user auth (service-to-service). |
| V3 Session Management | no | Stateless service-to-service HTTP. |
| V4 Access Control | yes | `service_role` key limited to Fly worker + GH Actions secrets. RLS + schema-level REVOKE on `staging.*`. |
| V5 Input Validation | yes | `corp_code` format validation (8-digit string, [0-9]+). `fiscal_year` range (1990-current+1). Pydantic on `/run` payload. |
| V6 Cryptography | yes | HMAC via `hmac.compare_digest` for shared-secret comparison; TLS for all external traffic (Fly force_https). |
| V7 Error Handling & Logging | yes | No secrets in stack traces (Sentry before_send scrubs `api_key=`). `etl_runs` table for operational logs. |
| V8 Data Protection | yes | PIPA: 임원 이름 only from DART-public reports. No personal addresses / resident numbers. Raw payloads in staging retain original text but never persist to canonical without curation. |
| V9 Communications | yes | HTTPS everywhere. Supabase Webhook signature verification via `Authorization: Bearer` header. |
| V10 Malicious Code | yes | DART response parsing restricted to known xmltodict/pandas flows — no `eval()`, no dynamic SQL building from DART data. Parameterized queries only. |
| V11 Business Logic | yes | Idempotent upserts (DATA-08) prevent replay-driven state corruption. `publish()` transactional so partial writes impossible. |
| V12 Files and Resources | no | No file uploads in Phase 4a. |
| V13 API and Web Service | yes | FastAPI endpoints documented; error responses generic (no stack traces returned to caller). |
| V14 Configuration | yes | All secrets via Fly secrets / GH secrets. `.env.example` documents key names only. |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via corp_code | Tampering | Parameterized queries (psycopg `%s`) + RegEx format check before query |
| Replay of signed webhook POST | Spoofing | HMAC compare of Authorization Bearer header + optional nonce table |
| DART API key exfil via Sentry | Info Disclosure | `before_send` regex scrub of `api_key=` / `crtfc_key=` (Example 3) |
| Service-role key leak via stack trace | Info Disclosure | Never log connection strings; psycopg uses env-var-read connection |
| Fly `/run` endpoint abuse | DoS | Shared secret + Fly Proxy rate limits; idempotent operation so replay does no harm |
| Staging table exposure to anon | Info Disclosure | Schema GRANT revoked (migration 0009) + RLS enabled (Pattern 3) |
| thevc.kr DB-rights claim | Legal | CI grep-ban + CONTEXT decision lock — never scraping, never code reference |
| Admin impersonation on publish() | Elevation | `SECURITY INVOKER` + callable only through authenticated admin session (Phase 4b); service_role has BYPASSRLS but requires key possession |
| `fn_audit_log_write` tampering | Repudiation | `SECURITY DEFINER` on function; append-only `audit_log` with service_role-only SELECT (migration 0012 line 74-93) |

## Sources

### Primary (HIGH confidence)
- [OpenDartReader GitHub source — FinanceData/OpenDartReader/blob/master/dart.py](https://github.com/FinanceData/OpenDartReader/blob/master/dart.py) — method list enumerated
- [OpenDartReader dart_finstate.py](https://github.com/FinanceData/OpenDartReader/blob/master/dart_finstate.py) — finstate_all signature + fs_div behavior
- [OpenDartReader issue #11](https://github.com/FinanceData/OpenDartReader/issues/11) — empty DataFrame on non-consolidated companies
- [PyPI OpenDartReader 0.2.3 metadata](https://pypi.org/project/OpenDartReader/) — version + release date verified
- [PyPI fastapi 0.136.0](https://pypi.org/project/fastapi/) — version verified 2026-04-16
- [PyPI uv 0.11.7](https://pypi.org/project/uv/) — 2026-04-15
- [PyPI supabase 2.28.3](https://pypi.org/project/supabase/) — 2026-03-20
- [PyPI sentry-sdk 2.58.0](https://pypi.org/project/sentry-sdk/) — 2026-04-13
- [uv Docker integration guide](https://docs.astral.sh/uv/guides/integration/docker/) — multi-stage Dockerfile pattern
- [Fly.io autostop/autostart docs](https://fly.io/docs/launch/autostop-autostart/) — `auto_stop_machines = "stop"` + `min_machines_running = 0`
- [Fly.io FastAPI framework guide](https://fly.io/docs/python/frameworks/fastapi/)
- [Fly.io secrets CLI docs](https://fly.io/docs/flyctl/secrets/)
- [Sentry Python FastAPI integration](https://docs.sentry.io/platforms/python/integrations/fastapi/)
- [Sentry sensitive data scrubbing](https://docs.sentry.io/platforms/python/data-management/sensitive-data/)
- [Supabase pg_net extension](https://supabase.com/docs/guides/database/extensions/pg_net)
- [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)
- [Supabase Python RPC reference](https://supabase.com/docs/reference/python/rpc)
- [Supabase Python upsert reference](https://supabase.com/docs/reference/python/upsert)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Vercel Cron Jobs pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — confirms Hobby = 1/day
- [GitHub Actions cron minimum interval + reliability](https://cronbuilder.dev/blog/github-actions-cron-schedule.html)
- [Next.js revalidateTag reference](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)

### Secondary (MEDIUM confidence — WebSearch verified against official sources)
- [dart-fss 0.4.3 documentation](https://dart-fss.readthedocs.io/en/latest/dart_api.html) — reprt_code values 11011..11014 cross-verified
- [Supabase community: PostgREST RPC wraps in transaction](https://dev.to/voboda/gotcha-supabase-postgrest-rpc-with-transactions-45a7)
- [Fly.io community: cold-start latency 300-500ms machine + 800ms Python](https://community.fly.io/t/cold-start-causes-1-minute-timeout-for-first-request-fastapi-nginx/25101)
- [GitHub Actions schedule reliability changelog 2019-11](https://github.blog/changelog/2019-11-01-github-actions-scheduled-jobs-maximum-frequency-is-changing/)

### Tertiary (LOW confidence — needs runtime validation)
- DART 20,000 calls/day/key limit (from CONTEXT; official docs currently under maintenance — unverifiable via live fetch)
- Phase 2 외감 subset count estimate "8–10 of 15" (from CONTEXT; empirical count not yet established)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version number cross-checked against PyPI registry 2026-04-23
- Architecture: HIGH — Fly.io scale-to-zero + pg_net webhook + publish() SQL all verified against authoritative docs
- Pitfalls: HIGH — #1 (Vercel Hobby), #3 (CFS/OFS fallback), #5 (api_key scrubbing) verified against official sources; #2 (OpenDartReader staleness) verified against PyPI dates; #4 (name fuzzy matching) is source-code behavior verified via GitHub read
- Security: MEDIUM — ASVS mapping thorough but not every threat has been pen-tested against a real Fly deployment yet
- Observability: HIGH — Sentry integration pattern is official; `etl_runs` schema is straightforward
- Python 3.12 x OpenDartReader compat: LOW — only smoke-testable, not docs-verifiable

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days for the core stack; 7 days for OpenDartReader assumption — verify before Wave 2 starts)
