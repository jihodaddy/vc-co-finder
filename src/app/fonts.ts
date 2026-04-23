import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';

/**
 * Phase 3.1 — Wave 1 font pipeline.
 *
 * Three fonts exposed as CSS variables consumed by globals.css @theme inline:
 *   --font-pretendard → body (Korean primary)
 *   --font-geist      → display/latin (brand wordmark, hero)
 *   --font-geist-mono → numeric + meta labels (tabular-nums)
 *
 * RESEARCH Pitfall 2: Pretendard Variable requires `weight: '45 920'`
 * explicitly or WebKit (Safari/iOS) renders all weights identical.
 * RESEARCH Pitfall 4: `display: 'swap'` + fallback stack enables
 * next/font's adjustFontFallback to minimize CLS on Korean first paint.
 */

export const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'Segoe UI',
    'sans-serif',
  ],
});

export const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

export const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});
