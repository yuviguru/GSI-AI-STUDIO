import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface Studio {
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  href: string;
  tag?: string;
}

const STUDIOS: Studio[] = [
  { name: 'Story Studio', tagline: 'Illustrated storybooks from one idea', emoji: '📖', gradient: 'gradient-story', href: '/create/story' },
  { name: 'Music Lab', tagline: 'Melodies from a mood + genre', emoji: '🎵', gradient: 'gradient-music', href: '/create/music' },
  { name: 'Quiz Maker', tagline: 'Trivia games on any topic', emoji: '🧠', gradient: 'gradient-quiz', href: '/create/quiz' },
  { name: 'Game Studio', tagline: 'Choose-your-own-adventure worlds', emoji: '🎮', gradient: 'gradient-game', href: '/create/game' },
  { name: 'Comic Studio', tagline: 'Panel-by-panel comics, 5 styles', emoji: '🎨', gradient: 'gradient-comic', href: '/create/comic' },
  { name: 'Beat the AI', tagline: '9 head-to-head challenges', emoji: '⚡', gradient: 'gradient-ai', href: '/beat-the-ai' },
  { name: 'Kid CEO', tagline: 'Run a simulated startup', emoji: '👔', gradient: 'gradient-primary', href: '/ceo', tag: 'New' },
  { name: 'Skill Arena', tagline: 'Quickfire skill drills', emoji: '🏆', gradient: 'gradient-reward', href: '/skill-arena' },
  { name: 'AI X-Ray', tagline: 'See the AI behind every creation', emoji: '🔍', gradient: 'gradient-gamification', href: '/learn' },
  { name: 'Remix Feed', tagline: 'Riff on what other kids made', emoji: '✨', gradient: 'gradient-ai', href: '/explore' },
];

export function StudioShowcase() {
  return (
    <section id="studios" className="bg-brand-background py-20 sm:py-28">
      <div className="mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
              Ten studios. One playground.
            </p>
            <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
              Pick any. They all teach AI while you create.
            </h2>
          </div>
          <Link
            href="/explore"
            className="flex items-center gap-1.5 text-body font-semibold text-brand-primary transition-all hover:gap-2.5"
          >
            See what others made
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {STUDIOS.map((studio) => (
            <Link
              key={studio.name}
              href={studio.href}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-soft ring-1 ring-brand-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:ring-brand-primary/30"
            >
              {/* Gradient emoji chip */}
              <div
                className={`${studio.gradient} mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-button`}
              >
                <span aria-hidden>{studio.emoji}</span>
              </div>

              {/* Name + tag */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-base font-bold text-brand-text">
                  {studio.name}
                </h3>
                {studio.tag && (
                  <span className="shrink-0 rounded-full bg-brand-secondary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-secondary">
                    {studio.tag}
                  </span>
                )}
              </div>

              {/* Tagline */}
              <p className="mt-1.5 text-caption leading-relaxed text-brand-text-secondary">
                {studio.tagline}
              </p>

              {/* Hover arrow */}
              <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-brand-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Try it
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>

        {/* Footnote */}
        <p className="mt-10 text-center text-caption text-brand-text-muted">
          More studios shipping every month. App &amp; Chatbot Builder, Video
          Studio, Indian Language Mode — coming in 2026.
        </p>
      </div>
    </section>
  );
}
