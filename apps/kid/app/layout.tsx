import type { Metadata, Viewport } from 'next';
import { Figtree, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

/**
 * Font loading — Design System §5
 * Display: Plus Jakarta Sans (Google Fonts) — temporary Satoshi stand-in
 *   (real Satoshi woff2 files in app/fonts/ are placeholder HTML, not actual fonts)
 * Body: Figtree (Google Fonts, variable weight)
 * Mono: JetBrains Mono (Google Fonts, for XP/scores/stats)
 */
const satoshi = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GSI AI Studio — Create with AI, Learn How It Works',
  description:
    'AI creation platform for Indian kids. Build stories, music, quizzes and games with AI while learning how artificial intelligence works. Aligned to CBSE AI curriculum.',
  manifest: '/manifest.json',
  keywords: ['AI for kids', 'CBSE AI curriculum', 'AI learning', 'kids coding', 'EdTech India'],
  openGraph: {
    title: 'GSI AI Studio',
    description: 'Create with AI. Learn how it works.',
    type: 'website',
    locale: 'en_IN',
  },
};

export const viewport: Viewport = {
  themeColor: '#5B5FFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${satoshi.variable} ${figtree.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Book Studio fonts (BOOK-009). The per-page font picker in the book
            editor uses these real family names (Quicksand / Lexend / Lora /
            Patrick Hand / Fredoka / Comic Neue), so they must be loaded or
            changing a page's font does nothing. The CSS is tiny and each woff2
            only downloads on a page that actually renders that family. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* no-page-custom-font is a pages/_document heuristic — in the App
            Router this <head> lives in the ROOT layout, so the fonts load on
            every page, not just one. Safe to ignore here. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&family=Fredoka:wght@400;500;700&family=Lexend:wght@400;500;700&family=Lora:wght@400;500;700&family=Patrick+Hand&family=Quicksand:wght@400;500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
