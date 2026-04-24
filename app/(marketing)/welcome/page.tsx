import type { Metadata } from 'next';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { Hero } from '@/components/marketing/Hero';
import { LogoBar } from '@/components/marketing/LogoBar';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { AudienceCards } from '@/components/marketing/AudienceCards';
import { StudioShowcase } from '@/components/marketing/StudioShowcase';
import { FlagshipExperiences } from '@/components/marketing/FlagshipExperiences';
import { AiXRayShowcase } from '@/components/marketing/AiXRayShowcase';
import { ForSchoolsDetail } from '@/components/marketing/ForSchoolsDetail';
import { VsChatGPT } from '@/components/marketing/VsChatGPT';
import { SafetyTrust } from '@/components/marketing/SafetyTrust';
import { Pricing } from '@/components/marketing/Pricing';
import { ParentFAQ } from '@/components/marketing/ParentFAQ';
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
        <HowItWorks />
        <AudienceCards />
        <StudioShowcase />
        <FlagshipExperiences />
        <AiXRayShowcase />
        <VsChatGPT />
        <SafetyTrust />
        <Pricing />
        <ForSchoolsDetail />
        <ParentFAQ />
        <Testimonials />
        <FinalCTA />
      </main>
      <SiteFooter />
    </>
  );
}
