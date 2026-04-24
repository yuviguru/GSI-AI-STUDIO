import Link from 'next/link';
import { ArrowRight, Sparkles, ShieldCheck, GraduationCap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AudienceCardData {
  id: string;
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  cta: { label: string; href: string };
  icon: LucideIcon;
  gradient: string;
  accent: string;
  ring: string;
}

const AUDIENCES: AudienceCardData[] = [
  {
    id: 'kids',
    kicker: 'For kids',
    title: 'Make stuff you’re proud of.',
    body: 'Pick a studio, describe an idea, and watch AI bring it to life. Share it on WhatsApp in one tap — with your own AI Engineer badge attached.',
    bullets: [
      '10 studios: stories, music, comics, games, quizzes',
      'Koko, your AI buddy, guides every creation',
      'Earn AI Points + unlock 12 badges as you learn',
    ],
    cta: { label: 'Try Story Studio', href: '/create/story' },
    icon: Sparkles,
    gradient: 'from-brand-ai to-brand-primary',
    accent: 'text-brand-ai',
    ring: 'ring-brand-ai/20',
  },
  {
    id: 'parents',
    kicker: 'For parents',
    title: 'Screen time that builds a skill.',
    body: 'Every output is child-safe by default. Every creation comes with a 30-second lesson in how the AI made it — so your child learns, not just consumes.',
    bullets: [
      'DPDPA-ready · no unsupervised ChatGPT risk',
      'Weekly progress report: concepts learned, time spent',
      'Free forever tier · upgrade to Pro for ₹299/mo',
    ],
    cta: { label: 'See how it works', href: '#x-ray' },
    icon: ShieldCheck,
    gradient: 'from-brand-secondary to-brand-primary',
    accent: 'text-brand-secondary',
    ring: 'ring-brand-secondary/20',
  },
  {
    id: 'schools-intro',
    kicker: 'For schools',
    title: 'CBSE AI mandate, solved.',
    body: 'The 2026-27 AI & Computational Thinking curriculum starts from Class 3. We ship the studios, lesson plans, teacher dashboards and compliance reports — so you don’t have to hire a specialist.',
    bullets: [
      'Ready-made CBSE-aligned lesson plans (Class 3–12)',
      'Teacher dashboard: assignments, progress, class reports',
      'Auto-generated compliance reports for audits',
    ],
    cta: { label: 'See what schools get', href: '#schools' },
    icon: GraduationCap,
    gradient: 'from-brand-accent to-brand-primary',
    accent: 'text-brand-accent',
    ring: 'ring-brand-accent/20',
  },
];

export function AudienceCards() {
  return (
    <section id="audiences" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            Built for every creator
          </p>
          <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
            Three audiences. One platform. Zero compromises.
          </h2>
          <p className="mt-4 text-body-lg text-brand-text-secondary">
            A kid, a parent and a principal should each find their answer on the
            same page. Here&apos;s yours.
          </p>
        </div>

        {/* Three cards */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {AUDIENCES.map((a) => {
            const Icon = a.icon;
            return (
              <article
                key={a.id}
                id={a.id}
                className={`group relative flex flex-col overflow-hidden rounded-3xl bg-white p-7 shadow-card ring-1 ${a.ring} transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover sm:p-8`}
              >
                {/* Icon badge */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-white shadow-button`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Kicker */}
                <p
                  className={`mt-5 text-caption font-bold uppercase tracking-wide ${a.accent}`}
                >
                  {a.kicker}
                </p>

                {/* Title */}
                <h3 className="mt-2 font-display text-2xl font-extrabold leading-snug tracking-tight text-brand-text">
                  {a.title}
                </h3>

                {/* Body */}
                <p className="mt-3 text-body-lg leading-relaxed text-brand-text-secondary">
                  {a.body}
                </p>

                {/* Bullets */}
                <ul className="mt-5 space-y-2.5">
                  {a.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2.5 text-caption text-brand-text"
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br ${a.gradient}`}
                      />
                      <span className="leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-6 flex-1" />
                <Link
                  href={a.cta.href}
                  className={`inline-flex items-center gap-1.5 text-body font-semibold ${a.accent} transition-all hover:gap-2.5`}
                >
                  {a.cta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {/* Decorative gradient corner */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${a.gradient} opacity-[0.06] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.12]`}
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
