import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Phase 3.1 Wave 2 — RESEARCH Open Q #3 deliverable.
 *
 * Statically scans `src/components/ui/**\/*.tsx` for hardcoded neutral-scale
 * Tailwind classes (bg-gray-500, text-slate-400, etc). These bypass the
 * cream/ink/lime brand token system and would render wrong colors against
 * the Wave 1 palette. Brand tokens — bg-muted-foreground, text-foreground,
 * etc — auto-inherit from globals.css and must be used instead.
 *
 * When this test fails, fix the offending file by swapping the hardcoded
 * class for its brand-token equivalent:
 *   bg-neutral-500   → bg-muted-foreground
 *   text-gray-500    → text-muted-foreground
 *   border-slate-200 → border-border
 *   ring-zinc-400    → ring-ring
 */

const UI_DIR = join(__dirname, '../../../../src/components/ui');

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.tsx')) yield p;
  }
}

describe('ui/* — hardcoded neutral-scale Tailwind class audit', () => {
  it('no primitive references bg-(neutral|slate|gray|zinc|stone)-N or text-(...)-N', () => {
    const offenders: string[] = [];
    const re = /(bg|text|border|ring|from|to|via)-(neutral|slate|gray|zinc|stone)-\d+/g;
    for (const f of walk(UI_DIR)) {
      const src = readFileSync(f, 'utf8');
      const matches = src.match(re);
      if (matches) offenders.push(`${f}: ${matches.join(', ')}`);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
