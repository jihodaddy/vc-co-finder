# Phase 03.1 — Deferred Items

Items discovered during Phase 03.1 execution that are **out of scope** for this phase (Rule scope boundary — pre-existing, not caused by Phase 03.1 changes) and should be triaged separately.

## `tests/unit/search-schema.test.ts` — missing `pg` runtime dependency

- **Found during:** Plan 03.1-04 (Wave 4 search chrome restyle)
- **Symptom:** Vitest fails this suite at import time with `Error: Cannot find package 'pg' imported from tests/unit/search-schema.test.ts`.
- **Cause:** The test imports `Client as PgClient from 'pg'`, but `pg` is not declared as a dependency (not in `package.json`). This is a pre-existing Phase 3 integration-test issue, independent of any Phase 03.1 plan.
- **Verified pre-existing:** Stashing all Plan 03.1-04 changes and running the suite against the base branch reproduces the same failure (see 03.1-04-SUMMARY verification log).
- **Impact on Phase 03.1:** None — this is an integration test that was never in Phase 03.1 scope. All other tests (158 passing) are unaffected.
- **Triage:** Address in a future plan that reviews Phase 3 integration-test infra (likely install `pg` as a dev-dependency or convert to a skipped integration suite behind an env flag).
