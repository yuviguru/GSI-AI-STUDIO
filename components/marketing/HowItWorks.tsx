import { Layers, Sparkles, Share2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Step {
  num: string;
  icon: LucideIcon;
  title: string;
  body: string;
  example: string;
  gradient: string;
}

const STEPS: Step[] = [
  {
    num: '01',
    icon: Layers,
    title: 'Pick a studio',
    body: 'Ten studios to choose from — stories, music, quizzes, games, comics, and more.',
    example: '→ "Story Studio looks fun today."',
    gradient: 'from-brand-ai to-brand-primary',
  },
  {
    num: '02',
    icon: Sparkles,
    title: 'Describe an idea',
    body: 'Type what you want in plain English — one line or a paragraph. No prompt skills needed.',
    example: '→ "A dosa hero who saves Chennai."',
    gradient: 'from-brand-primary to-brand-secondary',
  },
  {
    num: '03',
    icon: Share2,
    title: 'Share + learn',
    body: 'Get a shareable creation + a 30-second AI X-Ray showing how the AI made it.',
    example: '→ WhatsApp it. Earn an AI Points badge.',
    gradient: 'from-brand-accent to-brand-primary',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            How it works
          </p>
          <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
            From idea to creation in 60 seconds.
          </h2>
          <p className="mt-4 text-body-lg leading-relaxed text-brand-text-secondary">
            No app install. No coding. No tutorial to watch. Three steps, then
            you&apos;re making things.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-16 grid gap-5 md:grid-cols-3">
          {/* Connector lines (desktop only) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-brand-border to-transparent md:block"
          />

          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article
                key={step.num}
                className="relative flex flex-col rounded-3xl bg-white p-6 shadow-soft ring-1 ring-brand-border/60 sm:p-7"
              >
                {/* Number chip */}
                <div className="relative flex items-center gap-3">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} text-white shadow-button`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="numeric font-display text-4xl font-extrabold text-brand-text-muted/30">
                    {step.num}
                  </span>
                </div>

                {/* Body */}
                <h3 className="mt-5 font-display text-xl font-extrabold text-brand-text">
                  {step.title}
                </h3>
                <p className="mt-2 text-body leading-relaxed text-brand-text-secondary">
                  {step.body}
                </p>

                {/* Example */}
                <div className="mt-5 rounded-xl bg-brand-background px-3 py-2.5">
                  <p className="font-mono text-caption text-brand-text">
                    {step.example}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
