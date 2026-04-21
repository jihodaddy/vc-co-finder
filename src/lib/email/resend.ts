import 'server-only';

import { Resend } from 'resend';

/**
 * Lazy-initialized Resend client.
 *
 * We do NOT throw at module load if `RESEND_API_KEY` is missing — Plan 06
 * ships before the user has completed Resend domain verification (Task 3
 * checkpoint). This means importing this module in a route is safe; the
 * error only surfaces when an actual send is attempted.
 */
let cached: Resend | null = null;

export function getResend(): Resend {
  if (!cached) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        'RESEND_API_KEY is not configured. See .env.example + Plan 06 Task 3 (Resend domain verification).'
      );
    }
    cached = new Resend(apiKey);
  }
  return cached;
}

export async function sendDsarVerificationEmail(params: {
  to: string;
  name: string;
  verifyUrl: string;
  locale: 'ko' | 'en';
}): Promise<void> {
  const from = process.env.DSAR_FROM_EMAIL;
  if (!from) {
    throw new Error('DSAR_FROM_EMAIL is not configured. See .env.example.');
  }

  const subject =
    params.locale === 'ko'
      ? '[VC Co-Finder] 개인정보 요청 이메일 확인'
      : '[VC Co-Finder] Verify your personal data request';

  const body =
    params.locale === 'ko'
      ? `${params.name}님,\n\nVC Co-Finder에 접수된 개인정보 요청을 확인하려면 아래 링크를 클릭해 주십시오.\n\n${params.verifyUrl}\n\n링크는 72시간 동안 유효합니다. 본인이 요청한 것이 아니라면 이 이메일을 무시하십시오.\n\n— VC Co-Finder 개인정보 보호책임자`
      : `Dear ${params.name},\n\nTo verify your personal data request submitted to VC Co-Finder, click the link below.\n\n${params.verifyUrl}\n\nThe link expires in 72 hours. If you did not submit this request, please ignore this email.\n\n— VC Co-Finder CPO`;

  await getResend().emails.send({
    from,
    to: params.to,
    subject,
    text: body,
  });
}
