---
phase: 02-read-only-profiles-manual-seed
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 44
files_reviewed_list:
  - package.json
  - scripts/seed/_push_migrations.cjs
  - scripts/seed/fx.ts
  - scripts/seed/seed.ts
  - scripts/seed/types.ts
  - src/app/[locale]/(public)/companies/[slug]/error.tsx
  - src/app/[locale]/(public)/companies/[slug]/loading.tsx
  - src/app/[locale]/(public)/companies/[slug]/not-found.tsx
  - src/app/[locale]/(public)/companies/[slug]/page.tsx
  - src/components/profile/AliasList.tsx
  - src/components/profile/CompanyLogo.tsx
  - src/components/profile/FundingRoundsTable.tsx
  - src/components/profile/Hero.tsx
  - src/components/profile/IdentifierList.tsx
  - src/components/profile/SourceBadge.tsx
  - src/components/profile/WatchlistButton.tsx
  - src/components/site/header.tsx
  - src/components/site/mobile-nav.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/separator.tsx
  - src/components/ui/table.tsx
  - src/lib/data/companies.ts
  - src/lib/data/freshness.ts
  - src/lib/db/schema/companies.ts
  - src/lib/db/schema/data-sources.ts
  - src/lib/db/schema/enums.ts
  - src/lib/db/schema/funding.ts
  - src/lib/db/schema/index.ts
  - src/lib/format/currency.ts
  - src/lib/format/date.ts
  - src/lib/format/stage.ts
  - supabase/migrations/0016_fix_audit_log_composite_pk.sql
  - tests/__mocks__/server-only.ts
  - tests/smoke/phase2-success-criteria.test.ts
  - tests/unit/companies-data.test.ts
  - tests/unit/company-logo.test.tsx
  - tests/unit/company-page.render.test.tsx
  - tests/unit/format-currency.test.ts
  - tests/unit/format-date.test.ts
  - tests/unit/format-stage.test.ts
  - tests/unit/freshness.test.ts
  - tests/unit/seed-coverage.test.ts
  - tests/unit/seed-idempotency.test.ts
  - tests/unit/source-badge.test.tsx
  - vitest.config.ts
findings:
  critical: 0
  warning: 6
  info: 9
  total: 15
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-04-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 44
**Status:** issues_found

## Summary

Phase 2 (read-only profiles + manual seed) 구현 전반은 견고하며, 잘 문서화된 의도적 설계 결정(D-Discretion-*, RESEARCH Pitfall/Open Question 레퍼런스)이 코드 전반에 주석으로 추적 가능하다. 타입 안전성, 캐싱(`unstable_cache` + tag), 슬러그 정규표현 게이트(V5), `last_verified_at` 기반 freshness, BigInt 기반 KRW 포매팅 등 핵심 파트는 의도대로 작동한다.

그러나 **서비스 런타임 견고성** 측면에서 몇 가지 개선 여지가 발견되었다. 특히 `src/lib/data/companies.ts`가 Supabase 응답의 `data_sources` 조인 결과를 `null` 보호 없이 `sourceMetaFromRow()`에 넘기는 부분은 데이터 무결성이 깨졌을 때(예: `source_id` FK 있지만 대상 row가 soft-delete) 프로필 전체 페이지 렌더가 500으로 폭발할 수 있다. 그 외 4건의 경고는 모바일 내비 a11y 결함, seed 스크립트의 부분-실패 롤백 부재, `amount_minor` 시맨틱 오버로드, `formatProfileDate`의 느슨한 파싱이다.

Critical 이슈는 없음. 시크릿/주입/eval/dangerouslySetInnerHTML 등의 안전 패턴 스캔 결과도 모두 clean.

## Warnings

### WR-01: `sourceMetaFromRow` null-unsafe when joined `data_sources` row missing

**File:** `src/lib/data/companies.ts:90-107` (consumer call sites lines 143, 173, 193, 221)
**Issue:** `sourceMetaFromRow(src, factLastVerifiedAt)`는 `src.id`, `src.source_type` 등 필드에 직접 접근한다. 그러나 Supabase가 반환하는 `source` 조인은 다음 경우에 `null`이 될 수 있다:
- `source_id` FK가 가리키는 `data_sources` row가 `deleted_at != null` (쿼리에 `.is('deleted_at', null)` 가 data_sources 쪽에 걸려있지 않음)
- PostgREST embedding 실패 (RLS/grant 누락)
- 개발 환경에서 seed 불완전 상태

이 경우 `TypeError: Cannot read properties of null (reading 'id')`가 발생하여 프로필 페이지 전체가 `error.tsx`로 떨어진다. 한 row의 데이터 품질 문제가 페이지 전체를 죽이는 것은 D-Discretion 맥락(TRUST-* 원칙)과 어긋난다.

**Fix:**
```ts
function sourceMetaFromRow(src: SourceRow | null | undefined, factLastVerifiedAt: string): SourceMeta | null {
  if (!src) return null;
  return { /* ... existing body ... */ };
}

// In consumers, filter out rows that lost their source join:
const aliases: WithMeta<CompanyAlias>[] = (row.aliases ?? [])
  .filter((a: any) => a.deleted_at === null && a.source)
  .map((a: any) => {
    const meta = sourceMetaFromRow(a.source, a.last_verified_at);
    if (!meta) return null;
    return attachSource({ /* ... */ }, meta);
  })
  .filter(Boolean);
```
또는 `sourceMetaFromRow`가 `null`을 반환할 때 Sentry에 warning 로그를 남기고 해당 row를 스킵한다.

### WR-02: Seed delete-then-insert is not atomic; partial failures corrupt state

**File:** `scripts/seed/seed.ts:136-237`
**Issue:** 회사별로 aliases/identifiers/funding_rounds를 DELETE한 뒤 INSERT한다. 트랜잭션으로 감싸져 있지 않아, 예를 들어 `funding_rounds.delete()`는 성공했는데 중간 round의 investor insert가 실패하면 해당 회사는 이전 펀딩 라운드를 잃은 채 부분 상태에 머문다. 다시 실행하면 복구되지만, 실패 상태 DB가 유저 요청을 받을 수 있다는 위험이 있다.

Supabase JS는 클라이언트 레벨 트랜잭션을 지원하지 않으므로 진정한 롤백은 불가능하지만, 다음 중 하나로 리스크를 완화할 수 있다:
- 회사별 작업을 `supabase.rpc('seed_one_company', ...)` Postgres 함수로 감싸서 서버 측 트랜잭션 사용
- 실패 시 회사 전체를 soft-delete하는 보상 코드 추가
- 최소한 CRITICAL slugs(toss/daangn/coupang/baemin)는 실패 시 명시적 `process.exit(1)` 보장

**Fix:**
```ts
for (const co of allCompanies) {
  try {
    await seedOne(supabase, co);
    ok++;
  } catch (e) {
    fail++;
    console.error(`[seed] FAIL ${co.slug}:`, (e as Error).message);
    const CRITICAL = new Set(['toss', 'daangn', 'coupang', 'baemin']);
    if (CRITICAL.has(co.slug)) {
      console.error(`[seed] CRITICAL slug failed — aborting to prevent half-seeded SRCH-13 fixtures`);
      process.exit(1);
    }
  }
}
```

### WR-03: `amount_minor` semantic overload (KRW 원 vs USD cents) in seed

**File:** `scripts/seed/seed.ts:62-66`, `scripts/seed/types.ts:28-30`
**Issue:** `SeedFundingRound.amount_minor`의 공식 시맨틱은 "KRW 원(not 억원)"이지만, `normalizeFundingRound`은 `currency_code === 'USD'`일 때 같은 필드를 "USD cents"로 재해석한다. 이는 seed 데이터 작성자가 `{ amount_minor: 50_000_000_000n, currency_code: 'USD' }`를 USD 500,000,000 달러(5억 달러)로 의도했는지, 500억 달러를 의도했는지 판단하기 어렵게 한다. 또한 미래에 KRW+USD 혼합 시드가 늘어날수록 실수 확률이 커진다.

**Fix:** USD 입력 시 별도 필드를 사용하도록 타입을 강화한다:
```ts
export type SeedFundingRound =
  | { currency_code: 'KRW'; amount_minor?: bigint; /* ... */ }
  | { currency_code: 'USD'; amount_usd_cents: bigint; /* ... */ }
  | { currency_code?: undefined; /* undisclosed */ /* ... */ };
```
또는 최소한 `types.ts` 주석에 "USD 입력 시 amount_minor는 USD cents로 해석됨"을 명시하고, `seed.ts:62-66` 근처에 역시 같은 경고 주석을 단다.

### WR-04: Mobile nav lacks Escape-key handler and outside-click close

**File:** `src/components/site/mobile-nav.tsx:31-99`
**Issue:** 햄버거 메뉴는 열기/닫기 토글만 지원하고, Escape 키 / 외부 클릭 / Tab focus-trap을 처리하지 않는다. 키보드 유저가 메뉴를 열면 Tab이 뒤 페이지 컨텐츠로 빠지고, Esc로 닫을 수 없다. 모바일 nav는 전형적인 a11y 실패 지점이며, 프로젝트 CLAUDE.md의 "Trust" 원칙 관점에서 아쉽다.

**Fix:**
```tsx
import { useEffect, useRef } from 'react';
// ...
const panelRef = useRef<HTMLElement>(null);
useEffect(() => {
  if (!open) return;
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
  const onClick = (e: MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('mousedown', onClick);
  return () => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('mousedown', onClick);
  };
}, [open]);
// <nav ref={panelRef} ...>
```

### WR-05: `freshnessLevel` silently returns `expired` for invalid dates

**File:** `src/lib/data/freshness.ts:16-24`
**Issue:** `lastVerifiedAt`이 파싱 불가능한 문자열일 때 `differenceInDays(now, Invalid Date)`는 `NaN`을 반환하고, `NaN <= 30` / `NaN <= 180`은 모두 false이므로 `'expired'`로 빠진다. 데이터 품질 문제가 "오래된 정보"로 잘못 표시되는 것은 TRUST-05 관점에서 위험하다(사용자는 실제 신선도와 데이터 파싱 실패를 구별할 수 없다).

**Fix:**
```ts
export function freshnessLevel(lastVerifiedAt: string, now: Date = new Date()): FreshnessLevel {
  const parsed = new Date(lastVerifiedAt);
  if (Number.isNaN(parsed.getTime())) {
    // 데이터 품질 문제를 silently 'expired'로 위장하지 않는다.
    throw new Error(`freshnessLevel: invalid lastVerifiedAt "${lastVerifiedAt}"`);
  }
  const days = differenceInDays(now, parsed);
  // ...
}
```
호출측(`SourceBadge.tsx`)에서 try/catch로 감싸 Sentry 리포트 후 'expired' fallback을 사용하면 silent failure는 피하면서 UI는 깨지지 않는다.

### WR-06: `formatProfileDate` uses `new Date()` fallback for non-date-only strings

**File:** `src/lib/format/date.ts:15-19`
**Issue:** `iso.length === 10 ? parseISO(iso) : new Date(iso)` — `new Date(iso)`의 비-ISO 문자열 파싱은 브라우저/Node 간 일관되지 않는다 (ECMA-262는 ISO 8601만 보장하고 그 외는 구현체 재량). 현재 호출자들은 DB에서 나온 ISO-8601 문자열만 넘기지만, 미래 호출자가 다른 포맷을 넘길 경우 silent 오작동 가능.

**Fix:**
```ts
import { parseISO, isValid } from 'date-fns';
export function formatProfileDate(iso: string): string {
  const d = parseISO(iso); // parseISO는 ISO 8601 full grammar 지원
  if (!isValid(d)) throw new Error(`formatProfileDate: invalid input "${iso}"`);
  return format(d, 'yyyy-MM-dd', { locale: ko });
}
```

## Info

### IN-01: Hardcoded Korean string "출처" in FundingRoundsTable bypasses i18n

**File:** `src/components/profile/FundingRoundsTable.tsx:64`
**Issue:** `<TableHead className="sr-only">출처</TableHead>` — 다른 모든 컬럼은 `t('columns.*')`에서 가져오지만 이 헤더만 하드코드. Phase 8 i18n 확장 시 누락 가능.
**Fix:** `profile.rounds.columns.source` 키를 `ko.json`에 추가하고 `{columns.source}` 로 치환.

### IN-02: SourceBadge 조건 렌더가 D-01 "한 행에 하나" 규칙과 미묘하게 충돌

**File:** `src/components/profile/FundingRoundsTable.tsx:88-89, 127`
**Issue:** `r.amountMinor === null ? null : <SourceBadge meta={r._meta} />` — 금액 미공개 라운드는 SourceBadge를 숨긴다. 그러나 D-01 주석은 "one per row"을 표방하고, 미공개 라운드도 "공개되지 않았음이 manual 출처로 확인된 사실"이므로 출처 배지를 표시하는 편이 일관된다.
**Fix:** 미공개 라운드에도 `<SourceBadge>`를 렌더하거나, 이 예외가 의도라면 컴포넌트 상단 JSDoc에 "미공개 라운드는 출처 배지 생략"을 명시.

### IN-03: `AliasList`는 동시에 여러 `legal+current` alias가 있으면 모두 굵게 표시

**File:** `src/components/profile/AliasList.tsx:43-55`
**Issue:** UI-SPEC은 "accent row ONE per company"를 의도하나, 코드는 조건을 만족하는 모든 row를 굵게 그린다. 데이터 불변식(legal+validTo=null 은 최대 1개)이 깨지면 UI가 조용히 잘못된다.
**Fix:** seed 단계 invariant check 추가, 또는 렌더 시 첫 번째 legal-current만 강조하도록 `findIndex` 사용:
```tsx
const legalCurrentIdx = aliases.findIndex(a => a.validTo === null && a.aliasType === 'legal');
// a가 legalCurrentIdx일 때만 isLegalCurrent = true
```

### IN-04: `stageLabel`은 unknown stage에서 throw — RSC render 전체를 중단시킴

**File:** `src/lib/format/stage.ts:29-32`
**Issue:** DB에 funding_stage ENUM이 확장되었는데 앱이 아직 배포되지 않은 순간이 발생하면 `stageLabel('new_stage')`가 throw하여 프로필 전체가 error.tsx로 떨어진다. 페일 클로즈드는 안전하지만 UX는 방어적 폴백이 낫다.
**Fix:** `return DICTS[locale]?.[stage] ?? stage;` — 미지의 stage는 raw ENUM 값 그대로 표시하고, `console.warn`으로 Sentry에 전달.

### IN-05: `CompanyLogo` surrogate-pair edge case

**File:** `src/components/profile/CompanyLogo.tsx:30`
**Issue:** `displayNameKo.trim().charAt(0)` — UTF-16 surrogate pair(예: 이모지 스타트업명, 확장 한자)가 들어오면 반쪽만 표시. 현재 seed 데이터로는 발생하지 않지만 방어적으로:
**Fix:**
```ts
const letter = [...displayNameKo.trim()][0] ?? '?';
```

### IN-06: `_push_migrations.cjs` disables TLS verification

**File:** `scripts/seed/_push_migrations.cjs:39`
**Issue:** `ssl: { rejectUnauthorized: false }` — 로컬 개발 Supabase 자체 서명 인증서를 허용하려는 의도로 보이나, 프로덕션 DATABASE_URL을 잘못 설정하고 이 스크립트를 실행하면 MITM 취약. 현재는 로컬 마이그레이션 도구라 허용 범위이지만 방어적으로 환경 가드를 권장:
**Fix:**
```js
const isLocal = /localhost|127\.0\.0\.1|supabase\.internal/.test(cfg.host);
const client = new Client({
  ...cfg,
  ssl: isLocal ? { rejectUnauthorized: false } : true,
});
```

### IN-07: `createAnonClient` uses non-null assertions on env vars

**File:** `src/lib/data/companies.ts:19-25`
**Issue:** `process.env.NEXT_PUBLIC_SUPABASE_URL!` — 빌드/런타임에 env가 누락되면 `TypeError: Cannot read properties of undefined (reading 'trim')` 같은 불분명한 오류. `seed.ts:20-26`의 명시적 throw와 비교해 방어가 약하다.
**Fix:** 모듈 로드 시점에 검증:
```ts
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL/ANON_KEY must be set');
}
```

### IN-08: `data as any` + 10여 개 eslint-disable — 타입 안전성 손실

**File:** `src/lib/data/companies.ts:141, 161-225` (다수)
**Issue:** Supabase의 중첩 조인 응답 타입이 복잡해 `any`로 우회. Drizzle 스키마(이미 존재함)와 매핑한 Zod 파서를 한 번만 작성하면 런타임 검증 + 타입 안전성을 동시에 확보할 수 있고, WR-01도 같이 해결.
**Fix:** `const parsed = CompanyRowSchema.parse(row)` 형태로 전환. 예는 BLOCKER가 아닌 기술 부채 트래커로 남길 것.

### IN-09: `migrations/0016` serializes full composite-PK row into `audit_log.entity_id`

**File:** `supabase/migrations/0016_fix_audit_log_composite_pk.sql:45-49`
**Issue:** `v_entity_id := v_row::TEXT` — 복합 PK 테이블(round_investors, person_roles)의 전체 row를 audit_log의 entity_id TEXT 컬럼에 직렬화. 일부 테이블에 PII/금액이 섞일 경우 audit 로그 보존 정책과 충돌 가능. 또 entity_id 인덱스 기반 조회가 어려워짐.
**Fix:** 복합 PK 테이블별로 명시적 `concat(v_row->>'round_id', ':', v_row->>'investor_id')` 매핑을 권장. 현재 구현은 v1 수준 타협으로 OK.

---

_Reviewed: 2026-04-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
