# VC Co-Finder

한국·아시아 스타트업 검색·비교 인텔리전스 플랫폼. 1순위 사용자는 리서처·언론·구직자이며, 차별점은 다중 조건 패시트(faceted) 스마트 검색이다.

## Quick Start

```bash
# 1. Clone
git clone <repo> && cd vc-co-finder

# 2. Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local — see the inline comments for each variable's source URL.

# 3. Install and run
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/ko/`.

## Required Environment Variables

See `.env.example` for the full contract. Key ones:

| Variable | Purpose | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** service-role key (bypasses RLS) | Supabase Dashboard → Settings → API |
| `DATABASE_URL` | Postgres URL via pooler (transaction mode) | Supabase Dashboard → Settings → Database → Connection string |
| `NEXT_PUBLIC_APP_URL` | Public app URL (for redirects) | `http://localhost:3000` locally |

## Stack

Next.js 15.5 + TypeScript + Tailwind v4 + shadcn/ui (Radix) + Drizzle ORM + `@supabase/ssr` + next-intl.

Full stack details: [`.planning/research/STACK.md`](./.planning/research/STACK.md).
Architecture: [`.planning/research/ARCHITECTURE.md`](./.planning/research/ARCHITECTURE.md).

## Development Workflow

This repo uses the **GSD (Get Shit Done)** workflow. Do NOT make direct edits outside a GSD command — planning artifacts must stay in sync.

Entry points:
- `/gsd-quick` — small fixes, doc updates
- `/gsd-debug` — investigation, bug fixing
- `/gsd-execute-phase` — planned phase work

See [`CLAUDE.md`](./CLAUDE.md) for the full convention.

## Project Structure

```
src/
  app/
    [locale]/
      (public)/    # Anonymous-readable routes
      (authed)/    # Logged-in user routes (Phase 4c+)
      (admin)/     # Role-gated admin routes (Plan 03+)
  i18n/            # next-intl routing + request config
  lib/
    supabase/      # Three-way client split: client / server / admin
    db/            # Drizzle query client (migrations live in supabase/migrations)
    utils.ts       # shadcn `cn` helper
  messages/        # ko.json (source of truth) + en.json (stub)
  components/ui/   # shadcn primitives
```

## License

Proprietary. Data sources cited per entry — see `/ko/sources`.
