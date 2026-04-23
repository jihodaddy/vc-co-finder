# Phase 03.1 — Deferred Items

Items discovered during Phase 03.1 execution that are **out of scope** for this phase (Rule scope boundary — pre-existing, not caused by Phase 03.1 changes) and should be triaged separately.

## `tests/unit/search-schema.test.ts` — missing `pg` runtime dependency

- **Found during:** Plan 03.1-04 (Wave 4 search chrome restyle)
- **Symptom:** Vitest fails this suite at import time with `Error: Cannot find package 'pg' imported from tests/unit/search-schema.test.ts`.
- **Cause:** The test imports `Client as PgClient from 'pg'`, but `pg` is not declared as a dependency (not in `package.json`). This is a pre-existing Phase 3 integration-test issue, independent of any Phase 03.1 plan.
- **Verified pre-existing:** Stashing all Plan 03.1-04 changes and running the suite against the base branch reproduces the same failure (see 03.1-04-SUMMARY verification log).
- **Impact on Phase 03.1:** None — this is an integration test that was never in Phase 03.1 scope. All other tests (158 passing) are unaffected.
- **Triage:** Address in a future plan that reviews Phase 3 integration-test infra (likely install `pg` as a dev-dependency or convert to a skipped integration suite behind an env flag).

## `src/app/[locale]/(public)/contact/dsar/dsar-form.tsx` — one leftover `bg-neutral-900`

- **Found during:** Plan 03.1-06 final cross-wave audit (`rg "bg-(neutral|slate|gray|zinc|stone)-\d" src/`)
- **Symptom:** Line 123 uses `bg-neutral-900 px-4 py-2 text-white` on the DSAR submit button.
- **Cause:** DSAR form is a policy-adjacent route explicitly OUT of scope per Phase 3.1 CONTEXT D-03.2 (`/ko/privacy`, `/ko/terms`, `/ko/sources`, `/ko/login` inherit tokens automatically; no layout/color rework in Phase 3.1).
- **Impact on Phase 03.1:** None — falls outside the 5 route buckets that Phase 3.1 rolled brand language onto (shell + /search + / landing + /companies/[slug] + new primitives).
- **Triage:** In a follow-up polish pass, replace with shadcn `<Button>` (inherits `bg-primary text-primary-foreground` = lime + ink) or `bg-foreground text-background` for a neutral dark CTA. Low priority — DSAR button is correct functionally; only violates the "no stock-color classes anywhere" stretch goal.
