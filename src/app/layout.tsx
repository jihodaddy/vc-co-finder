import type { ReactNode } from 'react';

/**
 * App Router requires a root layout, but next-intl's real layout lives
 * under `[locale]/layout.tsx`. This shim simply forwards children; all
 * `<html>` / `<body>` / provider setup happens at the locale level.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
