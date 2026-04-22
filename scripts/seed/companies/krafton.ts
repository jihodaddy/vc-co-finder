import type { SeedCompany } from '../types';

/**
 * Krafton (크래프톤) — gaming sector (PUBG developer).
 * 블루홀 → 크래프톤 rebrand in Nov 2018; former alias preserved.
 */
export const krafton: SeedCompany = {
  slug: 'krafton',
  display_name_ko: '크래프톤',
  display_name_en: 'Krafton',
  legal_name: '크래프톤 주식회사',
  sector: 'gaming',
  hq_address: '경기도 성남시 분당구 백현로 97',
  founded_at: '2007-03-26',
  description_ko: 'PUBG 개발사 — 2021년 코스피 상장한 게임 회사.',
  website_url: 'https://www.krafton.com',
  logo_file: 'krafton.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '크래프톤', alias_type: 'brand' },
    { alias: 'Krafton', alias_type: 'english' },
    { alias: '크래프톤 주식회사', alias_type: 'legal' },
    { alias: '블루홀', alias_type: 'former', valid_to: '2018-11-30' },
  ],
  funding_rounds: [
    {
      stage: 'series_d',
      announced_at: '2018-03-01',
      original_text: '공시 금액 비공개 (IR: Series D, 2018)',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '텐센트', name_en: 'Tencent', investor_type: 'cvc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '215-87-42693', last_verified_at: '2026-04-21' },
  ],
};
