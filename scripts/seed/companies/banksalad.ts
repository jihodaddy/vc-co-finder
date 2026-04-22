import type { SeedCompany } from '../types';

/**
 * Banksalad (뱅크샐러드) — fintech sector.
 * 법인명: 주식회사 뱅크샐러드 (구. 레이니스트).
 */
export const banksalad: SeedCompany = {
  slug: 'banksalad',
  display_name_ko: '뱅크샐러드',
  display_name_en: 'Banksalad',
  legal_name: '주식회사 뱅크샐러드',
  sector: 'fintech',
  sub_sector: 'pfm',
  hq_address: '서울특별시 강남구 테헤란로 424',
  founded_at: '2012-12-01',
  description_ko: '마이데이터 기반 통합 자산·건강 관리 서비스.',
  website_url: 'https://www.banksalad.com',
  logo_file: 'banksalad.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '뱅크샐러드', alias_type: 'brand' },
    { alias: 'Banksalad', alias_type: 'english' },
    { alias: '주식회사 뱅크샐러드', alias_type: 'legal' },
    { alias: '레이니스트', alias_type: 'former', valid_to: '2020-12-01' },
  ],
  funding_rounds: [
    {
      stage: 'series_c',
      amount_minor: 45_000_000_000n, // ₩450억 (2020, KT/Kyobo)
      currency_code: 'KRW',
      original_text: '₩450억 (2020, KT·교보생명 등)',
      announced_at: '2020-07-01',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: 'KT', investor_type: 'cvc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '120-87-60300', last_verified_at: '2026-04-21' },
    { kind: 'website_domain', value: 'banksalad.com', last_verified_at: '2026-04-21' },
  ],
};
