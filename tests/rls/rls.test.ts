/**
 * RLS integration test — exercises the anon key against a Supabase project
 * that has migrations 0001-0015 applied. Verifies the invariants authored in
 * 0012_rls_canonical.sql + 0013_rls_user_scoped.sql.
 *
 * This is a live integration test. It is NOT run by the default `npm test`
 * Vitest config unless the anon key + URL env vars are present. Plan 08 will
 * wire the env in CI after `supabase db push`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Hard-skip the whole suite if env is absent — CI has env, local may not.
const hasEnv = Boolean(url) && Boolean(anonKey);

describe.skipIf(!hasEnv)('RLS policies — canonical tables (anon)', () => {
  let anon: SupabaseClient;

  beforeAll(() => {
    anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
  });

  it('anon CAN select from companies (deleted_at IS NULL policy)', async () => {
    const { data, error } = await anon.from('companies').select('id,slug').limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('anon CANNOT insert into companies', async () => {
    const { error } = await anon.from('companies').insert({
      slug: 'anon-attack-' + Date.now(),
      display_name_ko: '해킹시도',
      source_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(error).not.toBeNull();
    // 42501 = RLS violation; PGRST = PostgREST policy violation prefix.
    expect(error!.code).toMatch(/42501|PGRST/);
  });

  it('anon CANNOT update companies', async () => {
    const { error } = await anon
      .from('companies')
      .update({ display_name_ko: 'hacked' })
      .eq('slug', 'rls-fixture-company');
    // PostgREST returns either an explicit RLS error OR a silent 0-row update
    // depending on the client. In supabase-js, blocked UPDATE surfaces as
    // error OR data === [] — we accept either.
    if (error) {
      expect(error.code).toMatch(/42501|PGRST/);
    }
    // Guard: verify the row is untouched regardless of surfaced error shape.
    const { data } = await anon
      .from('companies')
      .select('display_name_ko')
      .eq('slug', 'rls-fixture-company')
      .maybeSingle();
    if (data) {
      expect(data.display_name_ko).not.toBe('hacked');
    }
  });

  it('anon CANNOT delete from companies', async () => {
    const { error } = await anon
      .from('companies')
      .delete()
      .eq('slug', 'rls-fixture-company');
    if (error) {
      expect(error.code).toMatch(/42501|PGRST/);
    }
    // Guard: fixture row must still exist.
    const { data } = await anon
      .from('companies')
      .select('id')
      .eq('slug', 'rls-fixture-company')
      .maybeSingle();
    expect(data).not.toBeNull();
  });

  it('anon CANNOT select from audit_log (forensic integrity)', async () => {
    const { data, error } = await anon.from('audit_log').select('id').limit(1);
    // When the RLS SELECT policy returns false, PostgREST returns an empty
    // array with no error, not a 401 — authorization gates happen at the
    // transport layer, RLS gates at the row layer.
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  it('anon CAN insert dsar_requests (public DSAR form)', async () => {
    const { error } = await anon.from('dsar_requests').insert({
      requester_name: 'RLS Test User',
      requester_email: 'rls-test@example.com',
      request_type: 'access',
      subject_description: 'RLS fixture — delete me',
      email_verification_token: crypto.randomUUID(),
    });
    expect(error).toBeNull();
  });

  it('anon CANNOT insert oversized dsar_requests (length CHECK)', async () => {
    const { error } = await anon.from('dsar_requests').insert({
      requester_name: 'X'.repeat(200),  // exceeds 100-char bound
      requester_email: 'rls-test@example.com',
      request_type: 'access',
      subject_description: 'abuse attempt',
      email_verification_token: crypto.randomUUID(),
    });
    expect(error).not.toBeNull();
  });
});
