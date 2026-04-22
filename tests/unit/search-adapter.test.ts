import { describe, it, expect } from 'vitest';
import { searchAdapter, type SearchAdapter } from '@/lib/search/adapter';

describe('SRCH-11 SearchAdapter contract', () => {
  it('exports searchAdapter conforming to interface', () => {
    // Type-level contract check (compile-time):
    const _typecheck: SearchAdapter = searchAdapter;
    void _typecheck;
    expect(typeof searchAdapter.search).toBe('function');
    expect(typeof searchAdapter.autocomplete).toBe('function');
  });

  it('adapter.ts does NOT import @/lib/supabase/server (Phase 2 Pitfall #5)', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('src/lib/search/adapter.ts', 'utf8');
    expect(src).not.toMatch(/@\/lib\/supabase\/server/);
  });

  it('postgres.ts does NOT import @/lib/supabase/server; uses server-only', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('src/lib/search/postgres.ts', 'utf8');
    expect(src).not.toMatch(/@\/lib\/supabase\/server/);
    expect(src).toMatch(/import 'server-only'/);
  });

  it('adapter.ts is ≤40 lines (thin abstraction discipline)', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('src/lib/search/adapter.ts', 'utf8');
    expect(src.split('\n').length).toBeLessThanOrEqual(40);
  });

  it('adapter.ts imports server-only as first-line side-effect', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('src/lib/search/adapter.ts', 'utf8');
    expect(src).toMatch(/import 'server-only'/);
  });
});
