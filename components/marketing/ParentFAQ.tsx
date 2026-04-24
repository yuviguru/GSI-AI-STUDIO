import { ChevronDown } from 'lucide-react';

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: 'How is this different from ChatGPT? Is it actually safe for kids?',
    a: 'ChatGPT is built for adults — no safety filter, no age gate, no learning layer. GSI runs every prompt and every AI output through a multi-layer child-safety filter before your child sees it. Nothing unsafe reaches the screen. And unlike ChatGPT, every creation comes with an AI X-Ray lesson mapped to the CBSE syllabus — so your child is learning, not just chatting.',
  },
  {
    q: 'What data do you collect about my child? Where is it stored?',
    a: 'Minimal by design. We store creations (so your child can come back to them), a progress record (for AI X-Ray concepts learned), and basic device info. No location tracking. No ad IDs. No selling or sharing data. Everything stays in Firestore asia-south1 (data in India). We&apos;re DPDPA 2023 ready and COPPA-aligned, and we don&apos;t use your child&apos;s prompts or outputs to train AI models.',
  },
  {
    q: 'What happens if my child sees inappropriate content?',
    a: 'It shouldn&apos;t. Every prompt passes an input filter before reaching any AI model, and every output (text, image, audio) is scanned before display. If something does get through, there&apos;s a one-tap report button on every creation — we investigate within 24 hours and tighten the filter. We also never generate identifiable real people, violence, or anything sexual.',
  },
  {
    q: 'Is the CBSE alignment real, or just marketing?',
    a: 'Real. The CBSE AI & Computational Thinking curriculum for Class 3–12 launches 2026-27 (announced October 2025, IIT Madras-led). We&apos;ve mapped 24 concepts — from "what is a prompt?" to "how do models handle bias?" — to specific CBSE standards. Each AI X-Ray tags the concept with its CBSE code (e.g. AI-3.2). Schools using GSI get auto-generated compliance reports.',
  },
  {
    q: 'What age is this actually for?',
    a: 'Ages 8–17. Story Studio and Comic Studio work beautifully from age 8. Music Lab, Quiz Maker and Game Studio fit Class 5 onwards. Kid CEO, Beat the AI and Skill Arena target 12+. The AI X-Ray lesson complexity adapts to your child&apos;s class level.',
  },
  {
    q: 'Can I cancel Pro anytime? What about refunds?',
    a: 'Yes — cancel in one tap from the parent dashboard, no questions asked. If you cancel within 7 days of upgrading and your child hasn&apos;t used Pro features, we refund in full. After that, Pro runs until your current billing period ends and then downgrades to Free automatically. Free forever tier always works, no card required.',
  },
];

export function ParentFAQ() {
  return (
    <section id="faq" className="bg-brand-background py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            Parent questions, straight answers
          </p>
          <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
            The six things every parent asks.
          </h2>
          <p className="mt-4 text-body-lg leading-relaxed text-brand-text-secondary">
            No fluff, no legalese. If you have a question not on this list,
            email <a href="mailto:hello@gsi.ai" className="text-brand-primary underline">hello@gsi.ai</a> — a human reads everything.
          </p>
        </div>

        {/* Accordion list */}
        <div className="mt-12 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-brand-border/60">
          {FAQS.map((faq, i) => (
            <details
              key={faq.q}
              className={`group ${i > 0 ? 'border-t border-brand-border' : ''}`}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-6 py-5 transition-colors hover:bg-brand-soft/40 sm:px-7 sm:py-6">
                <h3 className="font-display text-base font-bold text-brand-text sm:text-lg">
                  {faq.q}
                </h3>
                <ChevronDown
                  aria-hidden
                  className="mt-1 h-5 w-5 shrink-0 text-brand-primary transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <div className="px-6 pb-6 sm:px-7 sm:pb-7">
                <p
                  className="max-w-prose text-body leading-relaxed text-brand-text-secondary"
                  dangerouslySetInnerHTML={{ __html: faq.a }}
                />
              </div>
            </details>
          ))}
        </div>

        {/* Contact nudge */}
        <p className="mt-8 text-center text-caption text-brand-text-muted">
          Still have questions?{' '}
          <a
            href="mailto:hello@gsi.ai"
            className="font-semibold text-brand-primary hover:underline"
          >
            Email the founder directly
          </a>{' '}
          — we answer within 24 hours.
        </p>
      </div>
    </section>
  );
}
