import Link from 'next/link';
import { ArrowRight, Clock, MessageCircle, Briefcase, Trophy, BookOpenCheck, LineChart, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FeatureRow {
  icon: LucideIcon;
  label: string;
}

interface Flagship {
  id: string;
  badge: string;
  badgeGradient: string;
  emoji: string;
  title: string;
  tagline: string;
  body: string;
  features: FeatureRow[];
  meta: { label: string; value: string }[];
  cta: { label: string; href: string };
  secondaryLinkLabel?: string;
  gradient: string;
  accent: string;
  bubble: string;
  bubbleLine1: string;
  bubbleLine2: string;
}

const FLAGSHIPS: Flagship[] = [
  {
    id: 'kid-ceo',
    badge: 'Flagship · Age 10+',
    badgeGradient: 'from-brand-primary to-brand-ai',
    emoji: '👔',
    title: 'Kid CEO',
    tagline: 'Run your first business before you spend a rupee.',
    body: 'A real-time business simulator built for kids. Pick a venture — lemonade stand, t-shirt shop, game studio, or invent your own — then run it for 30, 60, or 90 days of real time. Real events hit your inbox, you make decisions, and a dedicated Telegram bot texts you when something changes. At the end, you unlock your CEO DNA — a shareable profile of how you think as a founder.',
    features: [
      { icon: Briefcase, label: 'Pick or invent your business — 12+ templates' },
      { icon: MessageCircle, label: 'Dedicated @GSIKidCeoAssistantBot on Telegram' },
      { icon: Trophy, label: 'CEO DNA profile — shareable founder archetype' },
    ],
    meta: [
      { label: 'Duration', value: '30 / 60 / 90 days' },
      { label: 'Age', value: '10+' },
      { label: 'Parallel runs', value: 'Up to 3' },
    ],
    cta: { label: 'Start a business', href: '/ceo' },
    secondaryLinkLabel: 'See how the sim works →',
    gradient: 'from-brand-primary via-purple-500 to-brand-ai',
    accent: 'text-brand-primary',
    bubble: 'bg-gradient-to-br from-brand-primary/10 via-brand-ai/5 to-transparent',
    bubbleLine1: 'Week 3 · Day 18',
    bubbleLine2: '"Your biggest customer wants a discount. Agree?"',
  },
  {
    id: 'homework',
    badge: 'Flagship · Class 3–12',
    badgeGradient: 'from-brand-secondary to-brand-primary',
    emoji: '📚',
    title: 'AI Homework Assistant',
    tagline: 'An AI tutor that teaches, doesn\'t hand over answers.',
    body: 'A Telegram bot (@GSIPersonalAssistantBot) your child chats with when they get stuck on a math problem, a science concept, or an English essay. Step-by-step hints, not direct answers. Every session logs to a web history parents can open — subject, score, full transcript — so you see exactly what your child learned and where they struggled.',
    features: [
      { icon: BookOpenCheck, label: 'Hint-based tutoring — never just hands over the answer' },
      { icon: LineChart, label: 'Per-subject scores and trends parents can open anytime' },
      { icon: Send, label: 'Works in the chat app your family already uses' },
    ],
    meta: [
      { label: 'Subjects', value: 'Math · Science · English · SS' },
      { label: 'Platform', value: 'Telegram + web history' },
      { label: 'Parent view', value: 'Full transcript' },
    ],
    cta: { label: 'See homework history', href: '/homework/history' },
    secondaryLinkLabel: 'Open the Telegram bot →',
    gradient: 'from-brand-secondary via-emerald-500 to-brand-primary',
    accent: 'text-brand-secondary',
    bubble: 'bg-gradient-to-br from-brand-secondary/10 via-brand-primary/5 to-transparent',
    bubbleLine1: 'Class 7 · Math',
    bubbleLine2: '"Try this: if 3x + 5 = 20, what do we do first?"',
  },
];

export function FlagshipExperiences() {
  return (
    <section id="flagship" className="relative overflow-hidden bg-white py-20 sm:py-28">
      {/* Ambient */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(91,95,255,0.18), rgba(32,201,151,0.12) 50%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            Not just studios — flagship experiences
          </p>
          <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
            Two standouts your child won&apos;t get anywhere else.
          </h2>
          <p className="mt-4 text-body-lg leading-relaxed text-brand-text-secondary">
            Most of what we ship is a creation studio. These two are bigger —
            deeper, longer-running, and built around how Indian kids actually
            live with their phones.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {FLAGSHIPS.map((f) => (
            <FlagshipCard key={f.id} flagship={f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FlagshipCard({ flagship: f }: { flagship: Flagship }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[32px] bg-white shadow-card ring-1 ring-brand-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
      {/* Header visual */}
      <div className={`relative overflow-hidden px-7 pt-7 pb-8 sm:px-9 sm:pt-9 ${f.bubble}`}>
        {/* Decorative dots */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gradient-to-br opacity-20 blur-2xl"
          style={{ backgroundImage: 'linear-gradient(135deg, currentColor, transparent)' }}
        />

        <div className="relative flex items-start justify-between gap-4">
          {/* Icon + badge */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-4xl shadow-elevated`}
            >
              <span aria-hidden>{f.emoji}</span>
            </div>
            <div>
              <div
                className={`inline-block rounded-full bg-gradient-to-r ${f.badgeGradient} bg-clip-text px-0 text-[10px] font-bold uppercase tracking-wide text-transparent`}
              >
                {f.badge}
              </div>
              <div className="mt-0.5 font-display text-3xl font-extrabold text-brand-text">
                {f.title}
              </div>
            </div>
          </div>

          {/* Clock/Live tag */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-text-secondary ring-1 ring-brand-border/60 backdrop-blur-sm">
            <Clock className="h-3 w-3" />
            Live
          </div>
        </div>

        {/* Tagline */}
        <p className="mt-6 font-display text-xl font-bold leading-snug text-brand-text sm:text-2xl">
          {f.tagline}
        </p>

        {/* Chat-bubble preview */}
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-brand-border/60">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${f.gradient} text-sm text-white`}
          >
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-muted">
              {f.bubbleLine1}
            </div>
            <div className="mt-0.5 text-caption font-semibold text-brand-text">
              {f.bubbleLine2}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-7 pb-8 pt-6 sm:px-9 sm:pb-9">
        <p className="text-body leading-relaxed text-brand-text-secondary">
          {f.body}
        </p>

        {/* Features */}
        <ul className="mt-6 space-y-3">
          {f.features.map((feat) => {
            const Icon = feat.icon;
            return (
              <li key={feat.label} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${f.gradient} text-white`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-caption leading-relaxed text-brand-text">
                  {feat.label}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Meta grid */}
        <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl bg-brand-background p-4">
          {f.meta.map((m) => (
            <div key={m.label}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-muted">
                {m.label}
              </div>
              <div className="mt-0.5 font-display text-xs font-bold text-brand-text sm:text-caption">
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-8 flex-1" />
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={f.cta.href}
            className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-br ${f.gradient} px-6 py-3 text-body font-semibold text-white shadow-button transition-all hover:brightness-110 active:scale-[0.98]`}
          >
            {f.cta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {f.secondaryLinkLabel && (
            <Link
              href={f.cta.href}
              className={`text-caption font-semibold ${f.accent} transition-opacity hover:opacity-70`}
            >
              {f.secondaryLinkLabel}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
