import { Quote } from 'lucide-react';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  context: string;
  accent: 'primary' | 'secondary' | 'accent';
}

// NOTE: these are persona-based illustrative testimonials from the PRD (Aarav/Meena/Ramesh).
// Replace with real user quotes as they land — keep the structure and rotation.
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'I made a storybook about my dog Biscuit and sent it to my grandmother in Coimbatore. She printed it out. It took me 10 minutes.',
    name: 'Aarav',
    role: 'Class 5 · Young Creator',
    context: 'Chennai · Story Studio',
    accent: 'primary',
  },
  {
    quote:
      'Finally — my daughter opens an AI app and I\'m happy about it. The weekly report actually shows what she learned, not just how long she scrolled.',
    name: 'Meena R.',
    role: 'Parent of Priya (Class 9)',
    context: 'Bengaluru · Pro plan',
    accent: 'secondary',
  },
  {
    quote:
      'We were staring down the 2026-27 mandate with no AI teachers. GSI ships the studios, lesson plans and compliance reports in one package. Pilot moved to full deployment in four weeks.',
    name: 'Ramesh Iyer',
    role: 'Principal · DAV Public School',
    context: 'Pilot · 320 students',
    accent: 'accent',
  },
];

const ACCENT_MAP = {
  primary: 'text-brand-primary bg-brand-soft',
  secondary: 'text-brand-secondary bg-brand-secondary/10',
  accent: 'text-brand-accent bg-brand-accent/10',
} as const;

export function Testimonials() {
  return (
    <section className="bg-brand-background py-20 sm:py-28">
      <div className="mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            Kids, parents, schools
          </p>
          <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
            Three people. Same platform. Different wins.
          </h2>
        </div>

        {/* Cards */}
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.name}
              className="flex flex-col rounded-3xl bg-white p-7 shadow-soft ring-1 ring-brand-border/60"
            >
              {/* Quote icon */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${ACCENT_MAP[t.accent]}`}
              >
                <Quote className="h-5 w-5" />
              </div>

              {/* Quote */}
              <blockquote className="mt-5 font-display text-lg font-semibold leading-relaxed text-brand-text">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div className="mt-6 flex-1" />

              {/* Attribution */}
              <div className="border-t border-brand-border pt-5">
                <div className="font-display text-sm font-bold text-brand-text">
                  {t.name}
                </div>
                <div className="mt-0.5 text-caption text-brand-text-secondary">
                  {t.role}
                </div>
                <div className="mt-1 text-[11px] text-brand-text-muted">
                  {t.context}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
