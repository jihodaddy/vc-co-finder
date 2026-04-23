# VC·Finder Design System

> Source of truth for brand tokens, primitives, and usage rules.
> Established: Phase 3.1 (2026-04-23). Consumed by all future phases.
> Referenced by: `.planning/phases/03.1-.../03.1-CONTEXT.md` → D-05.1, `src/app/globals.css`, `src/app/fonts.ts`, Task plans 03.1-02 through 03.1-06.

The brand language is **cream / ink / lime** — a warm, editorial surface with ink typography and a single signature accent (`#CFEF3E`) reserved for CTAs, active state, and focus halos. All tokens below are emitted as CSS custom properties from `src/app/globals.css` and picked up by Tailwind v4's `@theme inline` block so utilities like `bg-primary`, `text-foreground`, `ring-ring`, `font-sans`, `font-mono` all resolve to the right brand value.

**File anchors (do not duplicate token values here — link to source):**

- Brand tokens: [`src/app/globals.css`](../src/app/globals.css)
- Font pipeline: [`src/app/fonts.ts`](../src/app/fonts.ts)
- shadcn config: [`components.json`](../components.json)
- Primitive reference implementations: [`.design-import/ui.jsx`](../.design-import/ui.jsx) (gitignored source of truth for shapes / spacing)

---

## 1. Tokens

### 1.1 Color — Semantic Roles

All 17 semantic tokens are defined in `:root` in `src/app/globals.css` and surface as Tailwind utilities through the `@theme inline` block (`bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, …). Values below are **verbatim hex** from `.design-import/ui.jsx` — do not convert to OKLCH (RESEARCH Pattern 1 + Anti-Pattern 2: shadcn chart components accept raw hex; OKLCH conversion causes precision loss on brand-critical lime).

| Token                         | Value                        | Brand Name   | Role & Usage |
| ----------------------------- | ---------------------------- | ------------ | ------------ |
| `--background`                | `#FBF9F4`                    | cream        | Page canvas. `bg-background` on `<body>`. Never use pure white for full-bleed surfaces. |
| `--foreground`                | `#14120E`                    | ink          | Primary body text. `text-foreground`. High contrast against cream (WCAG AAA). |
| `--card`                      | `#FFFFFF`                    | white        | Elevated card surface over cream (`Card`, profile hero panels). |
| `--card-foreground`           | `#14120E`                    | ink          | Text on card surface. |
| `--popover`                   | `#FFFFFF`                    | white        | Dropdown/popover/tooltip surfaces. |
| `--popover-foreground`        | `#14120E`                    | ink          | Text on popover surface. |
| `--primary`                   | `#CFEF3E`                    | **lime**     | Signature accent. `bg-primary` on Button default + Checkbox checked + Switch on + chip `filter-chip active`. Reserved for CTA / active / signature states — never decorative. |
| `--primary-foreground`        | `#14120E`                    | ink          | Ink-on-lime (10.8:1 contrast). Button label color. |
| `--secondary`                 | `#F4F0E6`                    | creamDeep    | Muted surface (Button secondary, passive chip bg). |
| `--secondary-foreground`      | `#14120E`                    | ink          | Text on creamDeep. |
| `--muted`                     | `#F4F0E6`                    | creamDeep    | Backdrop for read-only data zones (facet counts, empty slots). |
| `--muted-foreground`          | `#78726A`                    | inkMute      | Meta labels, placeholder text, inactive chip text. |
| `--accent`                    | `#F4F0E6`                    | creamDeep    | Hover bg on menu items, dropdown rows. |
| `--accent-foreground`         | `#14120E`                    | ink          | Text on hovered accent. |
| `--destructive`               | `#FFB5A0`                    | coral        | Negative states (delete action, negative delta in `Delta` component, D-01.3). |
| `--destructive-foreground`    | `#14120E`                    | ink          | Text on coral. |
| `--border`                    | `rgba(20, 18, 14, 0.10)`     | line         | Hairline divider + card border. Ink at 10% alpha keeps warm tone over cream. |
| `--input`                     | `rgba(20, 18, 14, 0.10)`     | line         | Form input border (matches `--border`). |
| `--ring`                      | `#CFEF3E`                    | lime         | Focus halo. `focus-visible:ring-ring ring-[3px]` everywhere. D-01.4 signature halo. |

**Dark mode:** `.dark` block retained in `globals.css` with OKLCH placeholders so shadcn primitives don't break, but brand-consistent dark values are **deferred to v2** (D-01.6). Do not consume `.dark` in Phase 3.1.

### 1.2 Color — Chart Palette

Recharts series colors for Sparkline, Delta, and all Phase 6 time-series views. Exposed as `var(--chart-1)` … `var(--chart-5)` and surfaced via shadcn's Chart primitive config (`--color-chart-1` … `--color-chart-5`).

| Token       | Value     | Brand Name | Use |
| ----------- | --------- | ---------- | --- |
| `--chart-1` | `#14120E` | ink        | Primary metric line (default Sparkline stroke). |
| `--chart-2` | `#CFEF3E` | lime       | Positive highlight / target series. |
| `--chart-3` | `#93C7FF` | sky        | Secondary series (comparison company in Phase 6). |
| `--chart-4` | `#FFB5A0` | coral      | Negative delta / alert series. |
| `--chart-5` | `#D4C5FF` | lilac      | Tertiary series / sector overlay. |

### 1.3 Radius / Shadow / Weight Scale

Utility tokens live alongside colors in `:root`. Use the Tailwind utility class (e.g. `rounded-md`, `shadow-sm`) — they resolve to these values via `@theme inline`.

| Token            | Value                                         | Use |
| ---------------- | --------------------------------------------- | --- |
| `--radius-sm`    | `4px`                                         | MiniTag, micro-chips, inline pills. |
| `--radius-md`    | `7px`                                         | Button default, input, form controls. |
| `--radius-lg`    | `12px`                                        | Card, section container, profile hero. |
| `--radius-pill`  | `999px`                                       | Filter chips, round badges, avatar pill shells. |
| `--shadow-sm`    | `0 1px 2px rgba(20, 18, 14, 0.06)`            | Subtle lift on hoverable tiles / avatars. |
| `--shadow-md`    | `0 12px 32px -12px rgba(20, 18, 14, 0.18)`    | Card hover, popover elevation, sticky bar drop. |
| `--fw-regular`   | `400`                                         | Body copy. |
| `--fw-medium`    | `500`                                         | UI labels, chip text, button default. |
| `--fw-semibold`  | `600`                                         | Headers (H3/H4), emphasized numerics, meta labels. |
| `--fw-bold`      | `700`                                         | Brand wordmark, section titles, metric display. |

---

## 2. Typography

### 2.1 Font Stack

Three fonts are loaded through `src/app/fonts.ts` using Next.js `next/font` (self-hosted, zero external requests at runtime) and attached to `<html>` via their CSS-variable `.variable` classes on `src/app/[locale]/layout.tsx`.

| Font                   | Loader                          | CSS Variable          | Tailwind Utility | Primary Use |
| ---------------------- | ------------------------------- | --------------------- | ---------------- | ----------- |
| **Pretendard Variable** | `next/font/local` (weight `45 920`) | `--font-pretendard`   | `font-sans`      | Body, Korean-primary UI, paragraphs, headings. |
| **Geist**               | `next/font/google`              | `--font-geist`        | `font-[var(--font-geist)]` | Brand wordmark, hero headline, display-weight numerics. |
| **Geist Mono**          | `next/font/google`              | `--font-geist-mono`   | `font-mono`      | Numeric cells, metric values, meta labels (`LIVE`, `ACTIVE`), code-ish IDs. |

`globals.css @theme inline` binds `--font-sans: var(--font-pretendard)` and `--font-mono: var(--font-geist-mono)` so stock Tailwind `font-sans` / `font-mono` utilities resolve correctly.

> RESEARCH Pitfall 2: Pretendard Variable requires `weight: '45 920'` explicitly or WebKit (Safari / iOS) renders every weight identically. Do not remove this from `fonts.ts`.

### 2.2 Scale

Phase 3.1 inherits the size / weight scale declared in `.planning/phases/02-read-only-profiles-manual-seed/02-UI-SPEC.md §Typography`. Phase 3.1 additions:

- **Meta label** (brand `META` style): `font-mono uppercase text-[11px] tracking-[0.3em]` — used for `LIVE`, `ACTIVE`, facet group headers, table-column headers.
- **Numeric display** (Delta, Sparkline tooltips, KPI values): `font-mono tabular-nums font-semibold` at contextual size (12–14px).
- **Brand wordmark**: `font-[var(--font-geist)] font-bold tracking-[-0.3px]` — logo-lockup only.

### 2.3 Usage Rules

1. **Numeric cells always `font-mono tabular-nums`** (amount, count, metric, date/timestamp columns) so columns align in tables and KPI rows.
2. **Meta labels always uppercase + Geist Mono + expanded tracking** (`tracking-[0.3em]`) — distinguishes micro-labels from body.
3. **Body Korean text uses `font-sans`** (Pretendard). Never override to latin-only stack in Korean contexts — Pretendard handles Hangul + Latin harmoniously.
4. **Brand wordmark uses Geist** with `font-bold tracking-[-0.3px]` for logo lockup; body UI never references `--font-geist` directly.
5. **Focus halo is always `focus-visible:ring-ring focus-visible:ring-[3px]`** — lime halo is part of the brand signature; do not replace with `ring-primary` or ad-hoc color.

---

## 3. Primitives Inventory

### 3.1 shadcn/ui (canonical) — `src/components/ui/`

Shadcn Radix variant primitives, all consuming the tokens above automatically. Phase 3.1 Wave 2 adds Chart, Slider, Avatar (run `npx shadcn add chart slider avatar` on the `neutral`-flipped `components.json`). Existing primitives inherit brand values the moment globals.css lands — no per-primitive patches required.

| Primitive    | Installed?        | Brand Override (if any) |
| ------------ | ----------------- | ----------------------- |
| accordion    | ✓ (Phase 2)        | none — token inheritance |
| avatar       | Phase 3.1 Wave 2   | used as `LogoTile` base; company color tints `style.background`. |
| badge        | ✓ (Phase 2)        | Wave 2 adds `variant="filter-chip"` + `dismissible` prop (D-02.2). `filter-chip` active = `bg-primary text-primary-foreground` (lime + ink), dismissible renders inline × button. |
| button       | ✓ (Phase 1)        | none — default variant = lime CTA via `--primary`. |
| card         | ✓ (Phase 2)        | none — `rounded-lg shadow-sm` pulls correct tokens. |
| chart        | Phase 3.1 Wave 2   | default palette = `--chart-1`..`--chart-5`; Sparkline wraps `<ChartContainer>`. |
| checkbox     | ✓ (Phase 3)        | checked state = lime per `--primary`. |
| dialog       | ✓ (Phase 2)        | none. |
| dropdown-menu | ✓ (Phase 2)       | none. |
| input        | ✓ (Phase 3)        | border = `--input` (ink @ 10%); focus ring = `--ring` (lime). |
| label        | ✓ (Phase 3)        | none. |
| popover      | ✓ (Phase 2)        | none. |
| select       | ✓ (Phase 3)        | none. |
| separator    | ✓ (Phase 2)        | none — `bg-border` pulls ink-hairline. |
| slider       | Phase 3.1 Wave 2   | thumb = 20px white circle with 2px ink border; focus halo = lime @ 25% alpha — visual polish for `FacetRangeInputs` dual-thumb. |
| sonner       | ✓ (Phase 3)        | toast accent = `--primary`. |

### 3.2 Metrics (brand domain, Phase 3.1) — `src/components/metrics/`

Brand-specific data-viz primitives that do NOT belong in `src/components/ui/` (canonical shadcn surface). Primitives ship in Phase 3.1 Wave 2; real-data consumption lands in later phases.

| Component   | File                                       | Props                                                        | Ships / Consumes |
| ----------- | ------------------------------------------ | ------------------------------------------------------------ | ---------------- |
| `Sparkline` | `src/components/metrics/Sparkline.tsx`     | `data: number[]`, `color?: string`, `width?: number`, `height?: number`, `labels?: string[]` | Primitive ships Phase 3.1 Wave 2; consumed on profile hero + Phase 6 time-series. |
| `Delta`     | `src/components/metrics/Delta.tsx`         | `value: number`, `size?: number`                              | Primitive ships Phase 3.1 Wave 2; consumed wherever a `+x.x%` or `-x.x%` badge is rendered (profile hero, Phase 6). |
| `LogoTile`  | `src/components/metrics/LogoTile.tsx`      | `company: { name: string; color?: string; logoUrl?: string }`, `size?: number`, `radius?: number` | Primitive ships Phase 3.1 Wave 2; optional wave-4 mount on search result cards; full rollout Phase 4+. |

---

## 4. Usage Rules

- **Always use semantic tokens** — `bg-primary`, `text-foreground`, `ring-ring`, `border-border`. Never hardcoded hex in JSX. *Exception:* `LogoTile` accepts a per-company `color` prop (that's data, not theme; stays in JSX `style.background`).
- **Lime (`--primary`) is reserved** for active / signature / CTA states only. Non-active decorative UI never gets lime — use `--muted` or `--secondary` instead.
- **Focus rings always `focus-visible:ring-ring focus-visible:ring-[3px]`** on every interactive element (button, link, input, chip, slider thumb). Lime halo is brand signature.
- **All user-facing strings via `next-intl` `t()`** — Do NOT hardcode Korean strings in JSX (Phase 1 FOUND-10 carry-forward). Even short labels like "검색" and "필터" go through translation keys.
- **Tabular-nums on numeric cells** — every table cell that renders an amount / count / date uses `font-mono tabular-nums` so columns align.
- **Destructive = coral (`--destructive`)**, not red. Delete / negative-delta surfaces read as coral + ink text, never red + white.
- **Card elevation** — cards use `rounded-lg border border-border` with optional `shadow-sm` on hover. Do NOT stack shadows; a single `shadow-md` is the heaviest elevation in Phase 3.1.

---

## 5. v2 Deferred

Explicitly not shipping in Phase 3.1 (or any pre-launch phase). Do not retro-fit these without a new CONTEXT round.

- **Dark mode brand palette** — `.dark` block in `globals.css` keeps OKLCH placeholders so shadcn primitives don't crash, but no brand-consistent dark values are authored. `landing.jsx variant='B'` reference exists in `.design-import/`, but Phase 3.1 ships light-only.
- **Full landing marketing experience** — scan animation, auto-rotating facet demo, ticker, feature grid, brand-story sections. Phase 3.1 wave 5 ships a minimal 1-screen hero with CTA → `/search` only.
- **Compare page** (`/compare/[a]/[b]`) visual & logic — Phase 6 or 7.
- **Real Sparkline / Delta / LogoTile data wiring** on profile / search / watchlist routes — primitives land in Phase 3.1, real time-series data in Phase 6.
- **Motion tokens** — `ui.jsx` references `transition 0.12s-0.15s`; Phase 3.1 inherits these implicitly but does NOT formalize a motion token scale. v2.
- **Visual regression testing** (Chromatic, Playwright screenshots) — post-launch quality phase.
- **Storybook / component playground** — only if more than 3 contributors touch UI; solo v1 does not need it.
- **Brand illustration / custom icons** beyond `lucide-react` — deferred.
