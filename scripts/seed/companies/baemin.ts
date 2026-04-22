import type { SeedCompany } from '../types';

/**
 * Baemin (배민 / 우아한형제들) — SRCH-13 critical brand family.
 * Acquired by Delivery Hero in 2019 (Woowa Brothers = subsidiary).
 */
export const baemin: SeedCompany = {
  slug: 'baemin',
  display_name_ko: '배민',
  display_name_en: 'Baemin',
  legal_name: '우아한형제들',
  sector: 'mobility',
  sub_sector: 'food_delivery',
  hq_address: '서울특별시 송파구 위례성대로 2',
  founded_at: '2010-07-01',
  description_ko: '배달의민족 앱 운영사 — 한국 대표 음식 배달 플랫폼.',
  website_url: 'https://www.baemin.com',
  logo_file: 'baemin.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '배민', alias_type: 'brand' },
    { alias: '배달의민족', alias_type: 'brand', valid_from: '2010-07-01' },
    { alias: '우아한형제들', alias_type: 'legal' },
    { alias: 'Baemin', alias_type: 'english' },
    { alias: 'Woowa Brothers', alias_type: 'english' },
  ],
  funding_rounds: [
    {
      stage: 'series_c',
      amount_minor: 36_000_000_000n, // ₩36B (2016, Goldman)
      currency_code: 'KRW',
      original_text: '₩36B (2016, Goldman Sachs lead)',
      announced_at: '2016-05-01',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '골드만삭스', name_en: 'Goldman Sachs', investor_type: 'vc', participant_type: 'lead' },
      ],
    },
    {
      stage: 'series_d',
      amount_minor: 320_000_000_000n, // ₩320B (2018, Hillhouse + Sequoia)
      currency_code: 'KRW',
      original_text: '₩320B (2018, Hillhouse + Sequoia)',
      announced_at: '2018-12-01',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '힐하우스캐피탈', name_en: 'Hillhouse Capital', investor_type: 'vc', participant_type: 'co_lead' },
        { name_ko: '세쿼이아캐피탈', name_en: 'Sequoia Capital', investor_type: 'vc', participant_type: 'co_lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '120-87-81003', last_verified_at: '2026-04-21' },
    { kind: 'website_domain', value: 'baemin.com', last_verified_at: '2026-04-21' },
  ],
};
