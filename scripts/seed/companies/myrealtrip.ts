import type { SeedCompany } from '../types';

/**
 * MyRealTrip (마이리얼트립) — travel sector.
 * 가이드 투어 + 항공/호텔 중개 여행 플랫폼.
 */
export const myrealtrip: SeedCompany = {
  slug: 'myrealtrip',
  display_name_ko: '마이리얼트립',
  display_name_en: 'MyRealTrip',
  legal_name: '주식회사 마이리얼트립',
  sector: 'travel',
  sub_sector: 'ota',
  hq_address: '서울특별시 강남구 삼성로 512',
  founded_at: '2012-07-01',
  description_ko: '가이드 투어·액티비티·항공·숙박을 통합 제공하는 여행 플랫폼.',
  website_url: 'https://www.myrealtrip.com',
  logo_file: 'myrealtrip.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '마이리얼트립', alias_type: 'brand' },
    { alias: 'MyRealTrip', alias_type: 'english' },
    { alias: '주식회사 마이리얼트립', alias_type: 'legal' },
  ],
  funding_rounds: [
    {
      stage: 'series_d',
      amount_minor: 40_000_000_000n, // ₩400억 (2022, Altos)
      currency_code: 'KRW',
      original_text: '₩400억 (2022, Altos Ventures 포함)',
      announced_at: '2022-10-01',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '알토스벤처스', name_en: 'Altos Ventures', investor_type: 'vc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '201-81-81551', last_verified_at: '2026-04-21' },
    { kind: 'website_domain', value: 'myrealtrip.com', last_verified_at: '2026-04-21' },
  ],
};
