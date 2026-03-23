import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Figtree, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/**
 * Font loading — Design System §5
 * Display: Satoshi (local, variable weight)
 * Body: Figtree (Google Fonts, variable weight)
 * Mono: JetBrains Mono (Google Fonts, for XP/scores/stats)
 */
const satoshi = localFont({
  src: [
    { path: './fonts/Satoshi-Variable.woff2', style: 'normal' },
    { path: './fonts/Satoshi-VariableItalic.woff2', style: 'italic' },
  ],
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
      <body>{children}</body>
    </html>
  );
}
