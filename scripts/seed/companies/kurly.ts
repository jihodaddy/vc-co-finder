import type { SeedCompany } from '../types';

/**
 * Kurly (컬리 / 마켓컬리) — commerce sector (fresh grocery).
 * 마켓컬리 브랜드는 실제 서비스명이고 법인명은 "주식회사 컬리".
 */
export const kurly: SeedCompany = {
  slug: 'kurly',
  display_name_ko: '컬리',
  display_name_en: 'Kurly',
  legal_name: '주식회사 컬리',
  sector: 'commerce',
  sub_sector: 'grocery',
  hq_address: '서울특별시 강남구 테헤란로 152',
  founded_at: '2014-12-30',
  description_ko: '새벽배송 기반 프리미엄 신선식품 커머스.',
  website_url: 'https://www.kurly.com',
  logo_file: 'kurly.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '컬리', alias_type: 'brand' },
    { alias: '마켓컬리', alias_type: 'brand', valid_from: '2015-05-01' },
    { alias: 'Kurly', alias_type: 'english' },
    { alias: 'Market Kurly', alias_type: 'english' },
    { alias: '주식회사 컬리', alias_type: 'legal' },
  ],
  funding_rounds: [
    {
      stage: 'series_d',
      amount_minor: 225_400_000_000n, // ₩2254억 (2021, Anchor PE lead)
      currency_code: 'KRW',
      original_text: '₩2254억 (2021, Anchor Equity Partners lead)',
      announced_at: '2021-07-09',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '앵커에쿼티파트너스', name_en: 'Anchor Equity Partners', investor_type: 'vc', participant_type: 'lead' },
        { name_ko: 'DST 글로벌', name_en: 'DST Global', investor_type: 'vc', participant_type: 'participant' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '261-81-23567', last_verified_at: '2026-04-21' },
    { kind: 'website_domain', value: 'kurly.com', last_verified_at: '2026-04-21' },
  ],
};
