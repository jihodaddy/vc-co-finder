/**
 * Korean-aware bigint parser — paired with formatKRW for round-trip.
 *
 * Accepts:
 *   - "100억"       → 10_000_000_000n
 *   - "1.5조"       → 1_500_000_000_000n
 *   - "5억원"       → 500_000_000n (trailing 원 tolerated)
 *   - "500000000"   → 500_000_000n
 *   - "10,000,000"  → 10_000_000n (thousand-group commas stripped)
 *   - "1,500만"     → 15_000_000n
 *
 * Rejects (returns null):
 *   - Empty / whitespace-only
 *   - Non-numeric ("abc", "12ab3")
 *   - Negative values ("-100억", "-500000000") — threat mitigation T-03-03-01
 *   - Fractional raw integers without tier suffix ("1.5")
 *   - Unknown suffixes ("100K")
 *
 * Security notes (threats from 03-03 threat_model):
 *   - T-03-03-01 (Tampering): negative input rejected via regex `^(-)?` capture,
 *     then explicit numeric-negative check before bigint construction.
 *   - T-03-03-04 (ReDoS): regex is linear — `^(-?\d+(?:\.\d+)?)(조|억|만)?$` has
 *     no nested quantifiers, no back-references, no catastrophic alternation.
 *
 * Paired with `formatKRW` from `./currency.ts`:
 *   formatKRW(parseKRW('100억')!) === '100억원'
 *   formatKRW(parseKRW('1조')!)   === '1조원'
 *
 * Return contract: `bigint | null`. Callers render `aria-invalid` on null.
 */
export function parseKRW(input: string): bigint | null {
  const s = input.trim().replace(/,/g, '').replace(/원$/, '');
  if (!s) return null;

  // Tier suffixes (Korean): 조 = 10^12, 억 = 10^8, 만 = 10^4.
  // Single-suffix only — no "1억 5천만" stacking (caller handles composite input if needed).
  const m = s.match(/^(-?\d+(?:\.\d+)?)(조|억|만)?$/);
  if (!m) return null;

  const numericPart = m[1];
  const suffix = m[2];

  // Explicit sign check — mitigation T-03-03-01.
  if (numericPart.startsWith('-')) return null;

  const [intPart, fracPart = ''] = numericPart.split('.');

  if (!suffix) {
    // Raw number path — must be integer.
    if (fracPart) return null;
    return BigInt(intPart);
  }

  const tier: Record<string, bigint> = {
    '조': 10n ** 12n,
    '억': 10n ** 8n,
    '만': 10n ** 4n,
  };
  const multiplier = tier[suffix];

  // Preserve fractional precision through BigInt arithmetic:
  //   1.5조 → "1" + "5" = 15n * 10^12 / 10^1 = 1_500_000_000_000n
  //   100.25억 → "100" + "25" = 10025n * 10^8 / 10^2 = 10_025_000_000n
  const combined = BigInt(intPart + fracPart);
  const divisor = 10n ** BigInt(fracPart.length);
  return (combined * multiplier) / divisor;
}
