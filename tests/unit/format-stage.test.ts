import { describe, it, expect } from 'vitest';
import { stageLabel, STAGE_KEYS } from '@/lib/format/stage';
import ko from '@/../src/messages/ko.json';

describe('stageLabel', () => {
  it.each([
    ['pre_a', 'Pre-A'],
    ['seed', 'Seed'],
    ['series_a', '시리즈 A'],
    ['series_b', '시리즈 B'],
    ['series_c', '시리즈 C'],
    ['series_d', '시리즈 D'],
    ['bridge', 'Bridge'],
    ['safe', 'SAFE'],
    ['convertible_note', '전환사채'],
    ['grant', '지원금'],
    ['undisclosed', '비공개'],
  ])('ko locale: %s → %s', (stage, expected) => {
    expect(stageLabel(stage, 'ko')).toBe(expected);
  });

  it('unknown stage throws', () =>
    expect(() => stageLabel('series_x' as unknown as string, 'ko')).toThrow());
});

describe('STAGE_KEYS', () => {
  it('contains exactly 11 stages (matches funding_stage ENUM)', () => {
    expect(STAGE_KEYS).toHaveLength(11);
  });
  it('every STAGE_KEY has a ko.json.profile.stage entry', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dict = (ko as any).profile.stage as Record<string, string>;
    for (const k of STAGE_KEYS) {
      expect(dict[k]).toBeTruthy();
    }
  });
});
