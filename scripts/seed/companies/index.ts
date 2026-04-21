import type { SeedCompany } from '../types';

/**
 * Barrel re-exporting every seeded company module.
 *
 * Plan 02-05 fills the array by adding `import { toss } from './toss'`
 * etc., keeping one company per file for PR-reviewable diffs.
 *
 * CRITICAL: The 4 brand families listed in ./CRITICAL.md MUST be present.
 * Deleting or renaming them breaks Phase 3 SRCH-13 regression tests.
 */
export const companies: SeedCompany[] = [
  // Plan 02-05 populates this array. Empty here by design.
];
