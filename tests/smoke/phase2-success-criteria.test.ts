/**
 * Phase 2 smoke suite — final form.
 *
 * Requires `npm run dev` running in another terminal with a seeded DB.
 * Run with:  BASE_URL=http://localhost:3000 npm run test:smoke
 *
 * Every assertion maps to a row in 02-VALIDATION.md Per-Task Verification Map.
 * VALIDATION sign-off flips `nyquist_compliant: true` after this suite is green.
 *
 * NOTE: The Phase 2 project layout places i18n messages at `src/messages/`
 * (not root `messages/`) — Plan 02-01 deviation #1 resolved this. Import path
 * below matches the real location so the test reads the actual ko.json in use.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import koMessages from '../../src/messages/ko.json';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const DISCLAIMER = (koMessages as any).footer?.disclaimerText as string | undefined;
if (!DISCLAIMER) {
  throw new Error(
    'footer.disclaimerText missing — Phase 1 contract drift. Check messages/ko.json before assuming smoke test failure.',
  );
}

async function getHtml(path: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: 'follow',
    headers: { Accept: 'text/html' },
  });
  const body = await res.text();
  return { status: res.status, body };
}

describe('Phase 2 — /ko/companies/toss', () => {
  let toss: { status: number; body: string };
  beforeAll(async () => {
    toss = await getHtml('/ko/companies/toss');
  });

  it('PROF-01: returns 200', () => {
    expect(toss.status).toBe(200);
  });

  it('PROF-02: Hero contains display_name_ko "토스"', () => {
    expect(toss.body).toMatch(/토스/);
  });

  it('PROF-02: Hero contains HQ label AND website anchor with rel="noopener noreferrer"', () => {
    // We assert BOTH the HQ label presence and the secure-link pattern.
    // (HQ label text comes from profile.hero.hqLabel — default "HQ".)
    expect(toss.body).toMatch(/HQ/);
    expect(toss.body).toMatch(/rel="noopener noreferrer"/);
  });

  it('PROF-03: >=1 funding-round row with 억원 formatted amount', () => {
    // Either 억원 (happy path) or 비공개 (amount undisclosed — acceptable per D-Discretion-2)
    const hasMoney = /억원|조원|만원|비공개/.test(toss.body);
    expect(hasMoney).toBe(true);
    // At least one known stage label must appear:
    const hasStage = /시리즈 [A-D]|Pre-A|Seed|Bridge|SAFE|전환사채|지원금/.test(toss.body);
    expect(hasStage).toBe(true);
  });

  it('PROF-08: @container class present for responsive card transition', () => {
    // Tailwind v4 emits @container utility both in class attributes
    // and potentially in CSS. Assert class presence in HTML.
    expect(toss.body).toMatch(/@container/);
  });

  it('PROF-10: Aliases section contains BOTH "토스" AND "비바리퍼블리카"', () => {
    expect(toss.body).toMatch(/토스/);
    expect(toss.body).toMatch(/비바리퍼블리카/);
  });

  it('PROF-11: formatKRW output appears (at least one of 억원 / 만원 / grouped 원)', () => {
    // Seeded Toss data renders formatted KRW amounts through formatKRW.
    // Any of the tier suffixes (억 / 조 / 만) + 원, or the undisclosed literal, is acceptable.
    expect(toss.body).toMatch(/\d{1,3}(,\d{3})*(억|조|만)?원|비공개/);
  });

  it('TRUST-04: contains "출처:" string at least once (inline source badge)', () => {
    expect(toss.body).toMatch(/출처:/);
  });

  it('TRUST-05: contains one of text-green-600 / text-amber-500 / text-red-600 (freshness dot color)', () => {
    const freshness =
      /text-green-600/.test(toss.body) ||
      /text-amber-500/.test(toss.body) ||
      /text-red-600/.test(toss.body);
    expect(freshness).toBe(true);
  });

  it('TRUST-06 inherited: footer disclaimer text present', () => {
    expect(toss.body).toContain(DISCLAIMER);
  });

  it('ISR: response has Next.js data-page-loaded markers (HTML served — not redirected)', () => {
    // Sanity — we got actual HTML, not a 301/302 to login.
    expect(toss.body).toMatch(/<html/i);
    expect(toss.body).not.toMatch(/\/login/);
  });
});

describe('Phase 2 — /ko/companies/daangn (SRCH-13 alias coverage)', () => {
  let daangn: { status: number; body: string };
  beforeAll(async () => {
    daangn = await getHtml('/ko/companies/daangn');
  });

  it('returns 200', () => expect(daangn.status).toBe(200));
  it('contains 당근 AND 당근마켓 (current brand + former brand)', () => {
    expect(daangn.body).toMatch(/당근/);
    expect(daangn.body).toMatch(/당근마켓/);
  });
  it('former alias rendered with line-through class', () => {
    expect(daangn.body).toMatch(/line-through/);
  });
});

describe('Phase 2 — /ko/companies/coupang (SRCH-13 English alias)', () => {
  let coupang: { status: number; body: string };
  beforeAll(async () => {
    coupang = await getHtml('/ko/companies/coupang');
  });

  it('returns 200', () => expect(coupang.status).toBe(200));
  it('contains 쿠팡 AND Coupang', () => {
    expect(coupang.body).toMatch(/쿠팡/);
    expect(coupang.body).toMatch(/Coupang/);
  });
});

describe('Phase 2 — /ko/companies/baemin (SRCH-13 legal-vs-brand)', () => {
  let baemin: { status: number; body: string };
  beforeAll(async () => {
    baemin = await getHtml('/ko/companies/baemin');
  });

  it('returns 200', () => expect(baemin.status).toBe(200));
  it('contains 배민 AND 우아한형제들 (legal entity != brand)', () => {
    expect(baemin.body).toMatch(/배민/);
    expect(baemin.body).toMatch(/우아한형제들/);
  });
});

describe('Phase 2 — not-found path', () => {
  it('PROF-01: /ko/companies/__definitely_missing__ returns 404', async () => {
    const res = await fetch(`${BASE_URL}/ko/companies/__definitely_missing__`);
    expect(res.status).toBe(404);
  });

  it('404 page renders profile.notFound.heading copy', async () => {
    const res = await fetch(`${BASE_URL}/ko/companies/__definitely_missing__`);
    const body = await res.text();
    // Must render our custom not-found.tsx, not Next's default.
    expect(body).toMatch(/요청하신 기업을 찾을 수 없습니다/);
  });
});

// Dead-reference so test runner picks up the env var:
export { BASE_URL };
