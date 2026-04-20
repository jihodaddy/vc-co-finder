# RLS Integration Tests

Live-fires the anonymous Supabase client against a project with migrations
0001-0015 applied, asserting the canonical invariants of
`0012_rls_canonical.sql` and `0013_rls_user_scoped.sql`.

## Prerequisites

- `.env.local` (or shell env) has `NEXT_PUBLIC_SUPABASE_URL` +
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The database has been reset + migrated. Either:
  - local: `supabase db reset` (applies every migration in order), OR
  - remote (Plan 08): `supabase db push`.
- The seed row `companies.slug = 'rls-fixture-company'` exists
  (migration 0015 inserts it).

## Run

```bash
npm run test:rls
```

If the env vars are not set the whole suite is skipped — this is intentional
so `npm test` in a fresh clone is green.

## What it verifies

- Anon CAN `SELECT` canonical tables (the `deleted_at IS NULL` policy).
- Anon CANNOT `INSERT` / `UPDATE` / `DELETE` canonical tables
  (service-role-only writes; policies `canonical_no_insert/update/delete`).
- Anon CANNOT `SELECT` `audit_log` (forensic integrity — `audit_log_no_read`).
- Anon CAN `INSERT` into `dsar_requests` (public DSAR form).
- Anon CANNOT `INSERT` oversized `dsar_requests` (length-bound `CHECK`).

## Expected error shapes

PostgREST surfaces RLS violations as either:

- `error.code === '42501'` — Postgres `insufficient_privilege` (typical for
  INSERT blocked by WITH CHECK false).
- `error.code.startsWith('PGRST')` — PostgREST-layer policy violation.

For UPDATE/DELETE, some clients receive `data === []` (0 rows affected) with
no error — the test falls back to verifying the row state did not change.
