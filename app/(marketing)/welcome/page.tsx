import type { Metadata } from 'next';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { Hero } from '@/components/marketing/Hero';
import { LogoBar } from '@/components/marketing/LogoBar';
import { AudienceCards } from '@/components/marketing/AudienceCards';
import { StudioShowcase } from '@/components/marketing/StudioShowcase';
import { AiXRayShowcase } from '@/components/marketing/AiXRayShowcase';
import { SafetyTrust } from '@/components/marketing/SafetyTrust';
import { Pricing } from '@/components/marketing/Pricing';
import { Testimonials } from '@/components/marketing/Testimonials';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export const metadata: Metadata = {
  title: 'GSI AI Studio — From first story to first AI engineer',
  description:
    'Indian kids learn AI by making things worth sharing. Create stories, music, quizzes and games with AI — and see how AI actually works. Aligned to the CBSE AI & Computational Thinking curriculum.',
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
        <Hero />
        <LogoBar />
        <AudienceCards />
        <StudioShowcase />
        <AiXRayShowcase />
        <SafetyTrust />
        <Pricing />
        <Testimonials />
        <FinalCTA />
      </main>
      <SiteFooter />
    </>
  );
}
