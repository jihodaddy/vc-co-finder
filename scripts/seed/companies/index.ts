import type { SeedCompany } from '../types';
import { toss } from './toss';
import { daangn } from './daangn';
import { coupang } from './coupang';
import { baemin } from './baemin';
import { krafton } from './krafton';
import { kurly } from './kurly';
import { woowa } from './woowa';
import { kakaomobility } from './kakaomobility';
import { myrealtrip } from './myrealtrip';
import { yanolja } from './yanolja';
import { banksalad } from './banksalad';
import { sendbird } from './sendbird';
import { rablup } from './rablup';
import { sendy } from './sendy';
import { lunit } from './lunit';
// Branch modules (*-branch.ts) — Plan 02-05 Task 3a option (a): alias-only
// placeholders. They do NOT export a SeedCompany; aliases live in the parent
// module. Keep the files committed so the planner can later promote one to a
// distinct slug without a phase-blocking rename.

/**
 * Barrel re-exporting every seeded company module.
 *
 * Plan 02-05 Task 3a: 4 CRITICAL + 4 tranche-1 core.
 * Plan 02-05 Task 3b: 7 sector-diverse additions (travel, travel, fintech,
 * saas, ai_infra, logistics, healthcare).
 *
 * CRITICAL: The 4 brand families listed in ./CRITICAL.md MUST be present.
 * Deleting or renaming them breaks Phase 3 SRCH-13 regression tests.
 */
export const companies: SeedCompany[] = [
  // CRITICAL (SRCH-13 load-bearing)
  toss,
  daangn,
  coupang,
  baemin,
  // Tranche 1 additions (sector starter set)
  krafton,
  kurly,
  woowa,
  kakaomobility,
  // Tranche 2 (sector-diverse)
  myrealtrip,
  yanolja,
  banksalad,
  sendbird,
  rablup,
  sendy,
  lunit,
];
