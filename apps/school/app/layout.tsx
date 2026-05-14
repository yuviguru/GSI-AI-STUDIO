import type { Metadata, Viewport } from 'next';
import { Figtree, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

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
  title: 'GSI for Schools — Teacher & admin dashboard',
  description:
    "Teacher and school admin console for GSI AI Studio. Plan lessons, generate question papers, manage assignments, and stay DPDP-compliant.",
  manifest: '/manifest.json',
  keywords: ['CBSE teacher tools', 'lesson plan generator', 'school admin', 'DPDP compliance'],
  openGraph: {
    title: 'GSI for Schools',
    description: 'Teacher and school admin tools.',
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
    <html
      lang="en"
      className={`${satoshi.variable} ${figtree.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
