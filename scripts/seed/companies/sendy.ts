import type { SeedCompany } from '../types';

/**
 * Sendy (센디) — logistics sector (B2B 물류 중개).
 * 참고: 같은 슬러그 이름의 케냐 스타트업이 존재하나 무관한 별도 회사.
 */
export const sendy: SeedCompany = {
  slug: 'sendy',
  display_name_ko: '센디',
  display_name_en: 'Sendy',
  legal_name: '주식회사 센디',
  sector: 'logistics',
  sub_sector: 'b2b_freight',
  hq_address: '서울특별시 강남구 테헤란로 419',
  founded_at: '2017-04-01',
  description_ko: '기업용 화물 중개 플랫폼 — 중소 제조업 대상 디지털 운송 마켓플레이스.',
  website_url: 'https://www.sendy.co.kr',
  logo_file: 'sendy.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '센디', alias_type: 'brand' },
    { alias: 'Sendy', alias_type: 'english' },
    { alias: '주식회사 센디', alias_type: 'legal' },
  ],
  funding_rounds: [
    {
      stage: 'series_b',
      announced_at: '2022-02-01',
      original_text: 'Series B (2022, 공개 금액 비공개)',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '에이티넘인베스트먼트', name_en: 'Atinum Investment', investor_type: 'vc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'website_domain', value: 'sendy.co.kr', last_verified_at: '2026-04-21' },
  ],
};
