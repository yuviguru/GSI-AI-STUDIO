import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { Hero } from '@/components/marketing/Hero';
import { LogoBar } from '@/components/marketing/LogoBar';
import { WhatYouCanMake } from '@/components/marketing/WhatYouCanMake';
import { AiXRayShowcase } from '@/components/marketing/AiXRayShowcase';
import { VsChatGPT } from '@/components/marketing/VsChatGPT';
import { ForSchoolsDetail } from '@/components/marketing/ForSchoolsDetail';
import { Pricing } from '@/components/marketing/Pricing';
import { ParentFAQ } from '@/components/marketing/ParentFAQ';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { SiteFooter } from '@/components/marketing/SiteFooter';

// Option B (8 sections) — tight, Stripe-style structure.
// Retired sections (still on disk for rollback): HowItWorks, AudienceCards,
// StudioShowcase, FlagshipExperiences (folded into WhatYouCanMake),
// SafetyTrust (trust badges folded into ParentFAQ header), Testimonials.

export const metadata: Metadata = {
  title: 'GSI AI Studio — From first story to first AI engineer',
  description:
    "Indian kids learn AI by making things worth sharing. Create stories, music, quizzes and games with AI — and see how AI actually works. Aligned to India's school AI & Computational Thinking curriculum (every board).",
  openGraph: {
    title: 'GSI AI Studio',
    description: 'AI literacy, learned by creating.',
    type: 'website',
    locale: 'en_IN',
  },
};

export default function WelcomePage() {
  return (
    <>
      <MarketingNav />
      <main>
        {/* 1 — Hero (includes inline 3-step how-it-works) */}
        {/* Suspense lets Hero use useSearchParams (?heroVariant=...) without
            opting the whole route out of static prerendering. */}
        <Suspense>
          <Hero />
        </Suspense>
        {/* 2 — LogoBar (authorities + stats) */}
        <LogoBar />
        {/* 3 — What you can make (Flagship + Studios merged) */}
        <WhatYouCanMake />
        {/* 4 — How AI actually works (the X-Ray differentiator) */}
        <AiXRayShowcase />
        {/* 5 — GSI vs ChatGPT */}
        <VsChatGPT />
        {/* 6 — For schools (full detail) */}
        <ForSchoolsDetail />
        {/* 7 — Pricing + Parent FAQ (decision band, rendered back-to-back) */}
        <Pricing />
        <ParentFAQ />
        {/* 8 — Final CTA + Footer */}
        <FinalCTA />
      </main>
      <SiteFooter />
    </>
  );
}
