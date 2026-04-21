/**
 * Phase 1 smoke test suite — verifies all 5 Phase 1 success criteria
 * end-to-end against a deployed environment (or local dev server).
 *
 * Invocation:
 *   BASE_URL=https://YOUR_PROJECT.vercel.app \
 *   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   HEARTBEAT_SECRET=... \
 *   npm run test:smoke
 *
 * BASE_URL takes precedence; SMOKE_BASE_URL is accepted as an alias for
 * legacy `npm run test:smoke:prod` callers. When neither is set the entire
 * suite is skipped (so CI without a deploy URL stays green).
 *
 * Mirrors the skipIf pattern used by tests/rls/rls.test.ts so that env-less
 * runs are a graceful no-op rather than a noisy failure.
 *
 * Coverage maps to .planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md
 * Phase Boundary section (5 success criteria).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawBaseUrl = process.env.BASE_URL ?? process.env.SMOKE_BASE_URL ?? '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Whole-suite gate — must be a valid absolute http(s) URL. Empty string,
// stray '/', or any non-URL value (e.g., npm/Next.js may inject BASE_URL='/'
// into the script env on some platforms) is treated as "no smoke target" and
// skips the suite cleanly.
function isValidBase(u: string): boolean {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
const hasBaseUrl = isValidBase(rawBaseUrl);
const baseUrl = hasBaseUrl ? rawBaseUrl.replace(/\/$/, '') : '';
// Subset gate — Supabase-direct assertions (criteria #2, #3) need anon creds.
const hasSupabase = supabaseUrl.length > 0 && supabaseAnon.length > 0;

async function fetchUrl(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, { redirect: 'manual', ...init });
}

describe.skipIf(!hasBaseUrl)('Phase 1 Success Criterion #1 — Dev bootstrap + session persistence', () => {
  it('root / redirects to /ko/', async () => {
    const res = await fetchUrl('/');
    expect([302, 307, 308]).toContain(res.status);
    const loc = res.headers.get('location') ?? '';
    expect(loc).toMatch(/\/ko\/?$/);
  });

  it('/ko/ returns 200 with hero headline', async () => {
    const res = await fetchUrl('/ko/');
    expect(res.status).toBe(200);
    const text = await res.text();
    // Hero headline contains "한국·아시아 스타트업..." per PROJECT.md core value.
    expect(text).toContain('한국');
  });

  it('/ko/login renders OAuth buttons (Google + Kakao)', async () => {
    const res = await fetchUrl('/ko/login');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/Google|구글/i);
    expect(text).toMatch(/Kakao|카카오/i);
  });
});

describe.skipIf(!hasBaseUrl || !hasSupabase)('Phase 1 Success Criterion #2 — Canonical schema with provenance/freshness/currency triple', () => {
  // Lazy init — must NOT call createClient at module load because the suite
  // may be entirely skipped (envs missing) and createClient throws on empty URL.
  let anon: SupabaseClient;
  beforeAll(() => {
    anon = createClient(supabaseUrl, supabaseAnon, { auth: { persistSession: false } });
  });

  it('companies table exists and is anon-readable', async () => {
    const { data, error } = await anon
      .from('companies')
      .select('id,slug,display_name_ko,source_id')
      .limit(5);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('data_sources table exists with manual-curation seed row', async () => {
    const { data, error } = await anon
      .from('data_sources')
      .select('id,source_type')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    expect(error).toBeNull();
    expect(data?.source_type).toBe('manual');
  });

  it('funding_rounds has amount_minor + currency_code + original_text + last_verified_at + source_id columns', async () => {
    // Introspect schema by selecting expected columns. A column-not-found
    // error here means the migration is incomplete (criterion #2 fails).
    const { error } = await anon
      .from('funding_rounds')
      .select('id,amount_minor,currency_code,original_text,last_verified_at,source_id')
      .limit(1);
    expect(error).toBeNull();
  });
});

describe.skipIf(!hasBaseUrl || !hasSupabase)('Phase 1 Success Criterion #3 — RLS enforcement + audit triggers', () => {
  // Lazy init — see Criterion #2 comment.
  let anon: SupabaseClient;
  beforeAll(() => {
    anon = createClient(supabaseUrl, supabaseAnon, { auth: { persistSession: false } });
  });

  it('anon cannot INSERT into companies (RLS blocks)', async () => {
    const { error } = await anon.from('companies').insert({
      slug: 'smoke-attack-' + Date.now(),
      display_name_ko: 'attack',
      source_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(error).not.toBeNull();
  });

  it('anon cannot SELECT audit_log (RLS returns empty)', async () => {
    const { data } = await anon.from('audit_log').select('id').limit(1);
    // Per RLS docs, blocked SELECT returns [] not 401.
    expect(data ?? []).toEqual([]);
  });

  it('anon CAN INSERT dsar_requests (public DSAR form per Plan 06)', async () => {
    const { error } = await anon.from('dsar_requests').insert({
      requester_name: 'Smoke Test',
      requester_email: 'smoke@example.com',
      request_type: 'access',
      subject_description: 'Phase 1 smoke test — delete after verification',
      email_verification_token: crypto.randomUUID(),
    });
    expect(error).toBeNull();
  });
});

describe.skipIf(!hasBaseUrl)('Phase 1 Success Criterion #4 — i18n + privacy + DSAR routes', () => {
  it('/ko/privacy serves Korean PIPA policy with CPO designation', async () => {
    const res = await fetchUrl('/ko/privacy');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('개인정보처리방침');
    // CPO (개인정보보호책임자) section is a PIPA requirement (D-04.1).
    expect(text).toMatch(/개인정보\s*보호책임자|CPO/);
  });

  it('/ko/terms serves Korean terms', async () => {
    const res = await fetchUrl('/ko/terms');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('이용약관');
  });

  it('/ko/sources lists active + planned data sources (TRUST-07)', async () => {
    const res = await fetchUrl('/ko/sources');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('DART');
    expect(text).toContain('수동 큐레이션');
  });

  it('/ko/contact/dsar renders DSAR form with all 4 PIPA request types', async () => {
    const res = await fetchUrl('/ko/contact/dsar');
    expect(res.status).toBe(200);
    const text = await res.text();
    // D-04.3: 열람 / 정정 / 삭제 / 처리정지
    expect(text).toContain('열람');
    expect(text).toContain('정정');
    expect(text).toContain('삭제');
    expect(text).toContain('처리정지');
  });

  it('footer disclaimer (TRUST-06 "데이터 완전성") renders on landing', async () => {
    const res = await fetchUrl('/ko/');
    const text = await res.text();
    expect(text).toContain('데이터 완전성');
  });
});

describe.skipIf(!hasBaseUrl)('Phase 1 Success Criterion #5 — Sentry + Analytics + heartbeat', () => {
  it('/api/health returns 200 with public mode when no secret', async () => {
    const res = await fetchUrl('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('/api/health with heartbeat secret touches DB (dbReachable:true)', async () => {
    const secret = process.env.HEARTBEAT_SECRET;
    if (!secret) {
      // Mirrors Plan 07 guidance: skip the authenticated mode check when
      // HEARTBEAT_SECRET is unavailable in the test env. The public-mode
      // assertion above still validates the endpoint exists.
      console.warn('HEARTBEAT_SECRET not set in test env; skipping authenticated health check');
      return;
    }
    const res = await fetchUrl('/api/health', {
      headers: { authorization: `Bearer ${secret}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dbReachable).toBe(true);
  });

  it('robots.txt disallows admin + DSAR paths', async () => {
    const res = await fetchUrl('/robots.txt');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/Disallow:.*admin/i);
    expect(text).toMatch(/Disallow:.*dsar/i);
  });

  it('/ko/ emits Vercel Analytics script tag (FOUND-13)', async () => {
    const res = await fetchUrl('/ko/');
    const text = await res.text();
    // Vercel Analytics injects /_vercel/insights/script.js (or va.track call).
    // Match any of the canonical Analytics fingerprints.
    expect(text).toMatch(/_vercel\/insights|va\.track|vercel.*analytics/i);
  });
});
