import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  MessageCircle,
  Briefcase,
  Trophy,
  BookOpenCheck,
  LineChart,
  Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HeroBento } from './HeroBento';

interface FeatureRow {
  icon: LucideIcon;
  label: string;
}

interface Flagship {
  id: string;
  badge: string;
  emoji: string;
  title: string;
  tagline: string;
  body: string;
  features: FeatureRow[];
  cta: { label: string; href: string };
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
    emoji: '👔',
    title: 'Kid CEO',
    tagline: 'Run your first business before you spend a rupee.',
    body: 'A real-time business simulator. Pick a venture, make decisions as events hit, and discover your CEO DNA after 30, 60 or 90 days. Runs over weeks — with a dedicated Telegram bot that texts you when something changes.',
    features: [
      { icon: Briefcase, label: 'Pick or invent your business — 12+ templates' },
      { icon: MessageCircle, label: '@GSIKidCeoAssistantBot on Telegram' },
      { icon: Trophy, label: 'CEO DNA — shareable founder archetype' },
    ],
    cta: { label: 'Start a business', href: '/ceo' },
    gradient: 'from-brand-primary via-purple-500 to-brand-ai',
    accent: 'text-brand-primary',
    bubble: 'bg-gradient-to-br from-brand-primary/10 via-brand-ai/5 to-transparent',
    bubbleLine1: 'Week 3 · Day 18',
    bubbleLine2: '"Your biggest customer wants a discount. Agree?"',
  },
  {
    id: 'homework',
    badge: 'Flagship · Class 3–12',
    emoji: '📚',
    title: 'AI Homework Assistant',
    tagline: 'An AI tutor that teaches, doesn\'t hand over answers.',
    body: 'A Telegram bot your child chats with when they\'re stuck. Step-by-step hints, never direct answers. Every session logs to a parent-visible web history — subject, score, and the full transcript.',
    features: [
      { icon: BookOpenCheck, label: 'Hint-based tutoring — never the answer' },
      { icon: LineChart, label: 'Per-subject scores parents can open' },
      { icon: Send, label: 'Works in Telegram — where kids already chat' },
    ],
    cta: { label: 'See homework history', href: '/homework/history' },
    gradient: 'from-brand-secondary via-emerald-500 to-brand-primary',
    accent: 'text-brand-secondary',
    bubble: 'bg-gradient-to-br from-brand-secondary/10 via-brand-primary/5 to-transparent',
    bubbleLine1: 'Class 7 · Math',
    bubbleLine2: '"Try this: if 3x + 5 = 20, what do we do first?"',
  },
];

export function WhatYouCanMake() {
  return (
    <section id="studios" className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(91,95,255,0.15), rgba(32,201,151,0.08) 50%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            What your child can make
          </p>
          <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
            Two flagship experiences. Nine creation studios. One playground.
          </h2>
          <p className="mt-4 text-body-lg leading-relaxed text-brand-text-secondary">
            Most of what we ship is a creation studio. Two of them are bigger —
            deeper, longer-running, and worth calling out.
          </p>
        </div>

        {/* Flagship cards — top */}
        <div id="flagship" className="mt-14 grid gap-6 lg:grid-cols-2">
          {FLAGSHIPS.map((f) => (
            <FlagshipCard key={f.id} flagship={f} />
          ))}
        </div>

        {/* Studios bento — visual showcase, every tile is a clickable preview */}
        <div className="mt-16">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-brand-text-muted">
                Plus the creation studios
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-brand-text sm:text-2xl">
                Tap any tile. Every one teaches AI while you create.
              </h3>
            </div>
            <Link
              href="/explore"
              className="flex items-center gap-1.5 text-caption font-semibold text-brand-primary transition-all hover:gap-2.5"
            >
              See what others made
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10">
            <HeroBento />
          </div>

          <p className="mt-10 text-center text-caption text-brand-text-muted">
            More studios every month. App &amp; Chatbot Builder, Video Studio,
            Indian Language Mode — shipping in 2026.
          </p>
        </div>
      </div>
    </section>
  );
}

function FlagshipCard({ flagship: f }: { flagship: Flagship }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[32px] bg-white shadow-card ring-1 ring-brand-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
      {/* Header band */}
      <div className={`relative overflow-hidden px-7 pt-7 pb-7 ${f.bubble}`}>
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-3xl shadow-elevated`}
            >
              <span aria-hidden>{f.emoji}</span>
            </div>
            <div>
              <div className={`text-[10px] font-bold uppercase tracking-wide ${f.accent}`}>
                {f.badge}
              </div>
              <div className="mt-0.5 font-display text-2xl font-extrabold text-brand-text">
                {f.title}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-text-secondary ring-1 ring-brand-border/60 backdrop-blur-sm">
            <Clock className="h-3 w-3" />
            Live
          </div>
        </div>

        <p className="mt-5 font-display text-lg font-bold leading-snug text-brand-text sm:text-xl">
          {f.tagline}
        </p>

        {/* Chat bubble */}
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-brand-border/60">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${f.gradient} text-white`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-muted">
              {f.bubbleLine1}
            </div>
            <div className="mt-0.5 text-[12px] font-semibold text-brand-text">
              {f.bubbleLine2}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-7 pb-7 pt-5">
        <p className="text-caption leading-relaxed text-brand-text-secondary">
          {f.body}
        </p>

        <ul className="mt-5 space-y-2.5">
          {f.features.map((feat) => {
            const Icon = feat.icon;
            return (
              <li key={feat.label} className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${f.gradient} text-white`}
                >
                  <Icon className="h-3 w-3" />
                </div>
                <span className="text-[12px] leading-relaxed text-brand-text">
                  {feat.label}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex-1" />
        <Link
          href={f.cta.href}
          className={`inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-br ${f.gradient} px-5 py-2.5 text-caption font-semibold text-white shadow-button transition-all hover:brightness-110 active:scale-[0.98]`}
        >
          {f.cta.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
