import type { SeedCompany } from '../types';

/**
 * Lunit (루닛) — healthcare AI sector.
 * 의료영상 AI — 코스닥 상장(328130).
 */
export const lunit: SeedCompany = {
  slug: 'lunit',
  display_name_ko: '루닛',
  display_name_en: 'Lunit',
  legal_name: '주식회사 루닛',
  sector: 'healthcare',
  sub_sector: 'medical_imaging_ai',
  hq_address: '서울특별시 강남구 테헤란로 374',
  founded_at: '2013-08-08',
  description_ko: '암 진단 및 치료 반응 예측 AI 의료영상 솔루션 — 코스닥 상장.',
  website_url: 'https://www.lunit.io',
  logo_file: 'lunit.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '루닛', alias_type: 'brand' },
    { alias: 'Lunit', alias_type: 'english' },
    { alias: '주식회사 루닛', alias_type: 'legal' },
  ],
  funding_rounds: [
    {
      stage: 'series_c',
      amount_minor: 30_000_000_000n, // ₩300억 (2021 pre-IPO)
      currency_code: 'KRW',
      original_text: '₩300억 (2021 pre-IPO)',
      announced_at: '2021-08-01',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: 'NVIDIA', investor_type: 'cvc', participant_type: 'participant' },
        { name_ko: '가드만아시아 매니지먼트', name_en: 'Guardman Asset Management', investor_type: 'vc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '318-86-00091', last_verified_at: '2026-04-21' },
    { kind: 'website_domain', value: 'lunit.io', last_verified_at: '2026-04-21' },
  ],
};
