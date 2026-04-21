/**
 * Seed-time USD→KRW FX table.
 *
 * Source: Bank of Korea annual-average USD/KRW rates (public 통계DB).
 * Intentionally coarse — one rate per announce-year — so runtime never
 * calls an FX API (CONTEXT D-Discretion-2 + RESEARCH Pitfall 4).
 *
 * When a funding round has `currency_code: 'USD'`, convert to KRW 원 at
 * seed time and store both values + rate rationale in `original_text`.
 *
 * Update annually. Provenance: https://ecos.bok.or.kr/ (검색어: 원/달러)
 */
export const FX_BY_YEAR: Record<number, number> = {
  2010: 1156, 2011: 1108, 2012: 1127, 2013: 1095,
  2014: 1053, 2015: 1132, 2016: 1161, 2017: 1131,
  2018: 1100, 2019: 1166, 2020: 1180, 2021: 1144,
  2022: 1292, 2023: 1305, 2024: 1363, 2025: 1420, 2026: 1420,
};

export function krwToUsdRateForYear(year: number): number {
  const rate = FX_BY_YEAR[year];
  if (rate === undefined) {
    throw new Error(`No FX rate for year ${year}. Add to FX_BY_YEAR in scripts/seed/fx.ts.`);
  }
  return rate;
}

/** USD → KRW in minor units (원). */
export function usdToKrwMinor(usdAmount: number, announceYear: number): bigint {
  const rate = krwToUsdRateForYear(announceYear);
  return BigInt(Math.round(usdAmount * rate));
}

/** Exposed for symmetry / future 환율 변동 reporting; currently unused in runtime. */
export function krwToUsd(krwMinor: bigint, announceYear: number): number {
  const rate = krwToUsdRateForYear(announceYear);
  return Number(krwMinor) / rate;
}
