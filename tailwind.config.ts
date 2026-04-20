import type { Config } from 'tailwindcss';

// Tailwind v4 uses a CSS-first config in globals.css.
// This file exists for tooling compatibility (e.g., shadcn CLI) and to surface
// content paths for any Tailwind v3-style consumers. Actual theme tokens live in
// `src/app/globals.css` via `@theme` at-rule.
const config: Config = {
  content: [
    './src/**/*.{ts,tsx,js,jsx,mdx}',
  ],
};

export default config;
