-- Plan 01-03 / Task 2: Minimal seed fixture used by the RLS integration test
-- (tests/rls/rls.test.ts). Safe to run in local dev + CI. Phase 2 seed data
-- will replace / extend this row, but the stable UUID guarantees the test
-- target is always present regardless of data reset state.
--
-- Note: canonical_no_insert RLS policies only block anon + authenticated.
-- This migration runs under the migration role (superuser / postgres), which
-- is not subject to RLS, so the INSERT succeeds.

INSERT INTO public.companies (id, slug, display_name_ko, source_id)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'rls-fixture-company',
  'RLS 테스트 기업',
  '00000000-0000-0000-0000-000000000001'  -- manual curation source from 0003
)
ON CONFLICT (slug) DO NOTHING;
