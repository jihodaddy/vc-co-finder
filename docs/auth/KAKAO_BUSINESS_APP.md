# Kakao Business App Registration — Parallel Blocker Task

Per D-01.1, Kakao OAuth requires a **Business** Kakao Developers app (not
personal) to obtain the `account_email` scope. Without `account_email`, the
Supabase user has no email — breaking the app's data model (our `profiles`
row and every email-dependent feature assumes a non-null email).

This checklist is a **process**, not a code change. It can run in parallel
with engineering; the `NEXT_PUBLIC_KAKAO_ENABLED=false` flag keeps the
Kakao button disabled (with a "준비 중" tooltip) until the steps below
finish. Flip the flag when the final step is green.

## Checklist (in order)

- [ ] Visit https://developers.kakao.com/console/app → create new app
      (personal is fine for now — Business conversion happens next).
- [ ] Navigate to My Application → 앱 설정 → **비즈 앱 전환**.
- [ ] Submit Business verification (requires 사업자등록증 — the user /
      project owner is the legal entity):
  - Upload 사업자등록증 PDF.
  - Fill company name, business registration number, CPO
    (개인정보보호책임자) name + email (use the same CPO identity declared
    in `/privacy` per D-04.1).
  - Wait 1–5 business days for approval.
- [ ] Once Business status is granted, in app settings →
      카카오 로그인 → **동의항목**:
  - Enable **카카오계정(이메일)** as **required** (this is the
    `account_email` scope).
  - Enable **프로필 정보(닉네임/프로필 사진)** as optional.
- [ ] Under 카카오 로그인 → **Redirect URI**: add
      `https://<YOUR_PROJECT>.supabase.co/auth/v1/callback`
      (Supabase is the OAuth redirect target, NOT our app — Supabase
      forwards to `/auth/callback` on our origin.)
- [ ] Copy **REST API 키** (this is the "Client ID" in Supabase terms) and
      create + copy **Client Secret** (generated under 보안).
- [ ] Supabase Dashboard → Authentication → Providers → Kakao:
  - Enable provider.
  - Paste REST API 키 as "Client ID".
  - Paste Client Secret.
  - Save.
- [ ] Set `NEXT_PUBLIC_KAKAO_ENABLED=true` in:
  - Vercel project env vars (Production AND Preview scopes), and
  - Local `.env.local` for any developer testing Kakao.
- [ ] Smoke test: visit `/ko/login` → tick PIPA consent → click Kakao →
      complete Kakao consent screen → verify the browser lands back on
      `/ko/` with a session cookie, and `/ko/me/profile` shows the
      Kakao-linked email.

## If blocked

If Business verification slips past Phase 1 end, ship Google-only per D-01.1
fallback. Kakao feature flag stays at `false`; the UI continues to show the
"Kakao 준비 중" tooltip. Add Kakao in a fast-follow plan once approved —
no code changes beyond the env flag are required because the button code
is already wired.

## Related docs

- `docs/auth/SUPABASE_AUTH_HOOK.md` — custom_access_token_hook enable
  (separate dashboard step, independent of Kakao).
- `.planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md` §D-01.1
  — decision record for this parallel-blocker pattern.
