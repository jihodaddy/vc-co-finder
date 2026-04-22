---
status: partial
phase: 03-faceted-search-postgres-path
source: [03-VERIFICATION.md]
started: 2026-04-23T00:00:00Z
updated: 2026-04-23T00:00:00Z
---

## Current Test

Vercel 프로덕션 환경 DATABASE_URL percent-encoding 확인 (배포 시점 수행)

## Tests

### 1. 375px 모바일 뷰포트 반응형 계약 검증
expected: Chrome DevTools iPhone SE (375×667) → `/ko/search` → 드로어 슬라이드업 + pill 위치 + accordion 상태 유지 + chip/clearAll + card view + error boundary retry 모두 통과
result: passed
evidence: 2026-04-23 세션에서 사용자(lastboom@gmail.com)가 9/9 체크리스트 통과 보고. 03-07-SUMMARY.md에 기록.

### 2. Vercel 프로덕션 환경 DATABASE_URL percent-encoding
expected: Vercel 대시보드 → Project Settings → Environment Variables → DATABASE_URL → password 부분의 `#` `&` `^` 가 각각 `%23` `%26` `%5E` 로 percent-encoded 되어있거나, Supabase 대시보드에서 alphanumeric-only로 로테이션된 패스워드가 반영되어 있음
result: pending
why_human: Vercel 대시보드 환경변수는 코드로 검증 불가. 담당자가 직접 확인 필요. 배포 전까지만 확정되면 됨.
reference: deferred-items.md §DB-INFRA-01

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
