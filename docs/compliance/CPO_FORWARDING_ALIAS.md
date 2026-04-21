# CPO Email Forwarding Alias Setup

Per **D-04.1** (`.planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md`), the privacy policy lists a dedicated alias `privacy@YOUR_DOMAIN`, **NOT the owner's personal inbox**. This document covers the one-time DNS / email-forwarding setup that the project owner must complete in parallel with Plan 06 code.

## Why a forwarding alias

- PIPA §30 requires a public CPO (개인정보보호책임자) contact.
- Using a personal inbox (`owner@gmail.com`) exposes the owner to spam harvesting from privacy-policy crawlers and leaks contact patterns.
- A forwarding alias keeps the **public-facing contact stable** across personnel changes — only the forwarding rule needs updating.

## Options (pick one)

### Option A — Domain registrar free email forwarding (recommended)

Most registrars offer free `*@domain → personal inbox` forwarding:

| Registrar  | Where                                                            | Cost |
| ---------- | ---------------------------------------------------------------- | ---- |
| Cloudflare | Email Routing tab → Routes → "privacy" → destination address     | Free |
| Namecheap  | Domain List → Manage → Redirect Email                            | Free |
| Gandi      | Domain → Email forwarding                                        | Free |
| Porkbun    | Email Forwarding tab                                             | Free |

Source: `privacy@YOUR_DOMAIN`
Destination: owner's personal inbox

After saving, send a test email to `privacy@YOUR_DOMAIN` and confirm arrival.

### Option B — Google Workspace / Microsoft 365 alias

If you already have Workspace / Microsoft 365, add `privacy` as an alias to the primary admin account. No extra cost, no DNS to configure.

### Option C — Resend inbound (NOT YET — v2)

Resend does not currently offer inbound email. Skip.

## Update code + policy after the alias works

- [ ] DNS forwarding active: send test email to `privacy@YOUR_DOMAIN` → arrives in CPO inbox within 1 minute.
- [ ] Update `.env.local` and Vercel env: `DSAR_ADMIN_NOTIFY_EMAIL=privacy@YOUR_DOMAIN`.
- [ ] Update `src/messages/ko.json` `privacy.cpoBody` to replace `privacy@[도메인]` placeholder with the real `privacy@YOUR_DOMAIN`.
- [ ] Smoke test: submit a test DSAR at `/ko/contact/dsar` → admin notify email arrives at `privacy@YOUR_DOMAIN` → that forwards to CPO inbox.

## PIPA SLA (referenced in privacy policy + DSAR success page)

- **10일 이내 접수 확인** (acknowledge within 10 days)
- **30일 이내 처리 완료** (complete within 30 days)

The Phase 4b admin DSAR queue UI will surface every row with an age badge + SLA traffic light so the CPO never misses a deadline.

## Related

- `docs/compliance/RESEND_DOMAIN_SETUP.md` (TODO if more nuance arrives — Plan 06 Task 3 covers it inline)
- `src/messages/ko.json` `privacy.cpoBody`
- `.env.example` (`DSAR_ADMIN_NOTIFY_EMAIL`, `DSAR_FROM_EMAIL`)
