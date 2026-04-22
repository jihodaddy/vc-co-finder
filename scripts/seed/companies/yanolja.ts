import type { SeedCompany } from '../types';

/**
 * Yanolja (야놀자) — travel/accommodation sector.
 */
export const yanolja: SeedCompany = {
  slug: 'yanolja',
  display_name_ko: '야놀자',
  display_name_en: 'Yanolja',
  legal_name: '주식회사 야놀자',
  sector: 'travel',
  sub_sector: 'accommodation',
  hq_address: '서울특별시 강남구 테헤란로 131',
  founded_at: '2007-02-01',
  description_ko: '국내 1위 숙박·레저 여행 플랫폼 — 호텔 PMS SaaS(야놀자클라우드) 운영.',
  website_url: 'https://www.yanolja.com',
  logo_file: 'yanolja.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '야놀자', alias_type: 'brand' },
    { alias: 'Yanolja', alias_type: 'english' },
    { alias: '주식회사 야놀자', alias_type: 'legal' },
  ],
  funding_rounds: [
    {
      stage: 'series_d',
      amount_minor: 2_000_000_000_000n, // ₩2조 (2021, SoftBank Vision Fund 2)
      currency_code: 'KRW',
      original_text: '₩2조 (2021, SoftBank Vision Fund 2 lead)',
      announced_at: '2021-07-15',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '소프트뱅크 비전펀드 2', name_en: 'SoftBank Vision Fund 2', investor_type: 'vc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '120-86-54352', last_verified_at: '2026-04-21' },
    { kind: 'website_domain', value: 'yanolja.com', last_verified_at: '2026-04-21' },
  ],
};
