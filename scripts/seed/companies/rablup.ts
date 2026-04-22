import type { SeedCompany } from '../types';

/**
 * Lablup (래블업) — AI infra sector.
 * Backend.AI — 대규모 AI 학습 인프라 플랫폼.
 */
export const rablup: SeedCompany = {
  slug: 'lablup',
  display_name_ko: '래블업',
  display_name_en: 'Lablup',
  legal_name: '주식회사 래블업',
  sector: 'ai_infra',
  sub_sector: 'mlops',
  hq_address: '서울특별시 서초구 반포대로 45',
  founded_at: '2015-01-01',
  description_ko: 'Backend.AI를 제공하는 AI 학습 인프라 플랫폼.',
  website_url: 'https://www.lablup.com',
  logo_file: 'rablup.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '래블업', alias_type: 'brand' },
    { alias: 'Lablup', alias_type: 'english' },
    { alias: '주식회사 래블업', alias_type: 'legal' },
    { alias: 'Backend.AI', alias_type: 'common' },
  ],
  funding_rounds: [
    {
      stage: 'series_b',
      announced_at: '2024-05-01',
      original_text: 'Series B (2024, 공개 금액 비공개)',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '에이티넘인베스트먼트', name_en: 'Atinum Investment', investor_type: 'vc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'website_domain', value: 'lablup.com', last_verified_at: '2026-04-21' },
  ],
};
