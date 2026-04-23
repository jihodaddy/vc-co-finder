import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CSS = readFileSync(
  resolve(__dirname, '../../../src/app/globals.css'),
  'utf8'
);

describe('globals.css — brand tokens (Phase 3.1 Wave 1)', () => {
  it('contains all 17 brand semantic tokens with correct hex', () => {
    expect(CSS).toMatch(/--background:\s*#FBF9F4/);
    expect(CSS).toMatch(/--foreground:\s*#14120E/);
    expect(CSS).toMatch(/--card:\s*#FFFFFF/);
    expect(CSS).toMatch(/--card-foreground:\s*#14120E/);
    expect(CSS).toMatch(/--popover:\s*#FFFFFF/);
    expect(CSS).toMatch(/--popover-foreground:\s*#14120E/);
    expect(CSS).toMatch(/--primary:\s*#CFEF3E/);
    expect(CSS).toMatch(/--primary-foreground:\s*#14120E/);
    expect(CSS).toMatch(/--secondary:\s*#F4F0E6/);
    expect(CSS).toMatch(/--secondary-foreground:\s*#14120E/);
    expect(CSS).toMatch(/--muted:\s*#F4F0E6/);
    expect(CSS).toMatch(/--muted-foreground:\s*#78726A/);
    expect(CSS).toMatch(/--accent:\s*#F4F0E6/);
    expect(CSS).toMatch(/--accent-foreground:\s*#14120E/);
    expect(CSS).toMatch(/--destructive:\s*#FFB5A0/);
    expect(CSS).toMatch(/--destructive-foreground:\s*#14120E/);
    expect(CSS).toMatch(/--ring:\s*#CFEF3E/);
  });

  it('uses rgba(20, 18, 14, 0.10) for border and input', () => {
    expect(CSS).toMatch(/--border:\s*rgba\(20,\s*18,\s*14,\s*0\.10\)/);
    expect(CSS).toMatch(/--input:\s*rgba\(20,\s*18,\s*14,\s*0\.10\)/);
  });

  it('contains chart palette --chart-1..5', () => {
    expect(CSS).toMatch(/--chart-1:\s*#14120E/);
    expect(CSS).toMatch(/--chart-2:\s*#CFEF3E/);
    expect(CSS).toMatch(/--chart-3:\s*#93C7FF/);
    expect(CSS).toMatch(/--chart-4:\s*#FFB5A0/);
    expect(CSS).toMatch(/--chart-5:\s*#D4C5FF/);
  });

  it('contains utility tokens (radius/shadow/fw)', () => {
    expect(CSS).toMatch(/--radius-sm:\s*4px/);
    expect(CSS).toMatch(/--radius-md:\s*7px/);
    expect(CSS).toMatch(/--radius-lg:\s*12px/);
    expect(CSS).toMatch(/--radius-pill:\s*999px/);
    expect(CSS).toMatch(
      /--shadow-sm:\s*0 1px 2px rgba\(20,\s*18,\s*14,\s*0\.06\)/
    );
    expect(CSS).toMatch(
      /--shadow-md:\s*0 12px 32px -12px rgba\(20,\s*18,\s*14,\s*0\.18\)/
    );
    expect(CSS).toMatch(/--fw-regular:\s*400/);
    expect(CSS).toMatch(/--fw-medium:\s*500/);
    expect(CSS).toMatch(/--fw-semibold:\s*600/);
    expect(CSS).toMatch(/--fw-bold:\s*700/);
  });

  it('@theme inline binds --font-sans and --font-mono to next/font variables', () => {
    expect(CSS).toMatch(
      /@theme inline \{[\s\S]*--font-sans:\s*var\(--font-pretendard\)/
    );
    expect(CSS).toMatch(
      /@theme inline \{[\s\S]*--font-mono:\s*var\(--font-geist-mono\)/
    );
  });

  it('retains tailwindcss + tw-animate-css imports and dark custom-variant', () => {
    expect(CSS).toMatch(/@import "tailwindcss"/);
    expect(CSS).toMatch(/@import "tw-animate-css"/);
    expect(CSS).toMatch(/@custom-variant dark \(&:is\(\.dark \*\)\)/);
  });
});
