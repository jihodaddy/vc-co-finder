import koMessages from '@/../src/messages/ko.json';

/**
 * funding_stage ENUM (migration 0002) → localized label.
 *
 * Reads static JSON import (compile-time) so this is safe in RSC, client,
 * AND unit tests without next-intl bootstrap. For more complex
 * interpolation use next-intl's `t()`.
 */
export const STAGE_KEYS = [
  'pre_a', 'seed', 'series_a', 'series_b', 'series_c', 'series_d',
  'bridge', 'safe', 'convertible_note', 'grant', 'undisclosed',
] as const;

export type StageKey = (typeof STAGE_KEYS)[number];

type Locale = 'ko' | 'en';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const KO_STAGE = (koMessages as any).profile.stage as Record<string, string>;

const DICTS: Record<Locale, Record<string, string>> = {
  ko: KO_STAGE,
  // Plan 02-01 stubbed en.json with empty strings. When translations
  // arrive in Phase 8, add `en: (enMessages as any).profile.stage`.
  en: KO_STAGE, // fallback to ko per D-05.2 stub pattern
};

export function stageLabel(stage: string, locale: Locale = 'ko'): string {
  if (!STAGE_KEYS.includes(stage as StageKey)) {
    throw new Error(`stageLabel: unknown stage "${stage}". Valid: ${STAGE_KEYS.join(', ')}`);
  }
  const label = DICTS[locale]?.[stage];
  if (!label) {
    throw new Error(`stageLabel: missing label for "${stage}" in locale "${locale}"`);
  }
  return label;
}
