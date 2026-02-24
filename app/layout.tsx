import type { Metadata, Viewport } from 'next';
import { Nunito, Inter } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
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
  themeColor: '#7C3AED',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
