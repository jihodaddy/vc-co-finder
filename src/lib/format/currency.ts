/**
 * Korean currency formatter (PROF-11).
 *
 * NOT server-only — safe in RSC + client.
 *
 * Rule source: .planning/phases/02-read-only-profiles-manual-seed/02-CONTEXT.md §D-Discretion-3
 *
 * TRADE-OFF (documented per RESEARCH Open Question A3):
 * D-Discretion-3 says "{억 part}억 {만 part}만원 when 만 part ≥ 1000만,
 * else just {억 part}억원". This is a STRICT LITERAL reading — it produces
 * "1억원" for 1억 9,999만원 (199,999,999원). A future contributor may
 * prefer "render man part whenever > 0" (which would give "1억 9,999만원").
 * Either policy is defensible; we lock strict literal here because the
 * user-authored CONTEXT wording is explicit. To change policy, update
 * both this helper and every test expectation in format-currency.test.ts.
 *
 * DIVERGENCE from Postgres format_krw (migration 0011): The SQL helper
 * produces "{조} {억} {만}원" with no thousands-grouping commas. The JS
 * helper groups with ko-KR locale. This is intentional — the SQL helper
 * is for admin DB inspection; the JS helper is user-facing UX.
 */
export type FormatKRWOptions = {
  undisclosedLabel?: string;
};

const JO = 1_0000_0000_0000n;
const EOK = 1_0000_0000n;
const MAN = 1_0000n;
const MAN_PART_THRESHOLD = 1000n; // 1,000만 — the D-Discretion-3 threshold

export function formatKRW(
  // String accepted for RSC-safe data (see CompanyFundingRound.amountMinor).
  amountMinor: bigint | number | string | null | undefined,
  opts: FormatKRWOptions = {}
): string {
  if (amountMinor === null || amountMinor === undefined) {
    return opts.undisclosedLabel ?? '비공개';
  }
  const n: bigint =
    typeof amountMinor === 'bigint'
      ? amountMinor
      : typeof amountMinor === 'string'
        ? BigInt(amountMinor)
        : BigInt(Math.trunc(amountMinor));
  if (n < 0n) {
    throw new Error('formatKRW: negative amounts not supported');
  }
  if (n === 0n) return '0원';

  // Tier 1: < 1만 → raw 원
  if (n < MAN) {
    return `${Number(n).toLocaleString('ko-KR')}원`;
  }

  // Tier 2: < 1억 → 만 with 1-decimal trim
  if (n < EOK) {
    const manWhole = n / MAN;            // integer 만
    const remainder = n % MAN;           // leftover 원 (for decimal calc)
    if (remainder === 0n) {
      return `${Number(manWhole).toLocaleString('ko-KR')}만원`;
    }
    // Compute 1-decimal form: round half-up to nearest 0.1만
    const tenths = (n * 10n + (MAN / 2n)) / MAN;
    const wholePart = tenths / 10n;
    const decimalDigit = tenths % 10n;
    if (decimalDigit === 0n) {
      return `${Number(wholePart).toLocaleString('ko-KR')}만원`;
    }
    return `${Number(wholePart).toLocaleString('ko-KR')}.${decimalDigit}만원`;
  }

  // Tier 3: < 1조 → 억 (+ optional 만 part if ≥ 1000만)
  if (n < JO) {
    const eok = n / EOK;
    const remainderAfterEok = n % EOK;
    const man = remainderAfterEok / MAN; // 0..9999
    if (man >= MAN_PART_THRESHOLD) {
      return `${Number(eok).toLocaleString('ko-KR')}억 ${Number(man).toLocaleString('ko-KR')}만원`;
    }
    return `${Number(eok).toLocaleString('ko-KR')}억원`;
  }

  // Tier 4: ≥ 1조 → 조 (+ optional 억 part)
  const jo = n / JO;
  const eokPart = (n % JO) / EOK;
  if (eokPart > 0n) {
    return `${Number(jo).toLocaleString('ko-KR')}조 ${Number(eokPart).toLocaleString('ko-KR')}억원`;
  }
  return `${Number(jo).toLocaleString('ko-KR')}조원`;
}
