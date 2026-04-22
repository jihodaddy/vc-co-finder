import type { SeedCompany } from '../types';

/**
 * Kakao Mobility (카카오모빌리티) — mobility sector.
 * 2017년 카카오에서 분사된 택시·내비 플랫폼.
 */
export const kakaomobility: SeedCompany = {
  slug: 'kakaomobility',
  display_name_ko: '카카오모빌리티',
  display_name_en: 'Kakao Mobility',
  legal_name: '주식회사 카카오모빌리티',
  sector: 'mobility',
  sub_sector: 'ride_hailing',
  hq_address: '경기도 성남시 분당구 판교역로 152',
  founded_at: '2017-08-01',
  description_ko: '카카오T 택시, 내비, 바이크 등을 운영하는 모빌리티 플랫폼.',
  website_url: 'https://www.kakaomobility.com',
  logo_file: 'kakaomobility.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '카카오모빌리티', alias_type: 'brand' },
    { alias: '주식회사 카카오모빌리티', alias_type: 'legal' },
    { alias: 'Kakao Mobility', alias_type: 'english' },
    { alias: '카카오T', alias_type: 'common' },
  ],
  funding_rounds: [
    {
      stage: 'series_d',
      amount_minor: 500_000_000_000n, // ₩5000억 (2021 Carlyle)
      currency_code: 'KRW',
      original_text: '₩5000억 (2021, Carlyle Group lead)',
      announced_at: '2021-02-19',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '칼라일그룹', name_en: 'Carlyle Group', investor_type: 'vc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '772-88-00822', last_verified_at: '2026-04-21' },
    { kind: 'website_domain', value: 'kakaomobility.com', last_verified_at: '2026-04-21' },
  ],
};
