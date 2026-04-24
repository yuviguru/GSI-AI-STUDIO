'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  Play,
  Check,
  ArrowRight,
  BarChart3,
  MessageCircle,
} from 'lucide-react';
import { KokoLottie } from './KokoLottie';

// Each tile is a mini preview of what the studio actually produces —
// not an icon. Designed to read like miniature product screenshots.

export function HeroBento() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Soft radial backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[920px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(91,95,255,0.18), rgba(138,92,255,0.10) 45%, transparent 70%)',
        }}
      />

      {/* Bento grid */}
      <div className="relative grid auto-rows-[130px] grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:auto-rows-[140px]">
        {/* 1 — Story Studio (2×2, tall book-cover feel) */}
        <BentoCell
          className="col-span-2 row-span-2 sm:col-span-1 sm:row-span-2 lg:col-span-1 lg:row-span-2"
          delay={0.05}
        >
          <StoryTile />
        </BentoCell>

        {/* 2 — Music Lab (1×1, waveform) */}
        <BentoCell delay={0.1}>
          <MusicTile />
        </BentoCell>

        {/* 3 — Quiz Maker (1×1, mock question) */}
        <BentoCell delay={0.15}>
          <QuizTile />
        </BentoCell>

        {/* 4 — Kid CEO (2×2, dashboard feel, NEW badge) */}
        <BentoCell
          className="col-span-2 row-span-2 sm:col-span-1 sm:row-span-2 lg:col-span-1 lg:row-span-2"
          delay={0.2}
        >
          <KidCeoTile />
        </BentoCell>

        {/* 5 — Comics (1×1, panel grid) */}
        <BentoCell delay={0.25}>
          <ComicsTile />
        </BentoCell>

        {/* 6 — Games (1×1, adventure choice) */}
        <BentoCell delay={0.3}>
          <GamesTile />
        </BentoCell>

        {/* 7 — AI X-Ray (full-width footer) */}
        <BentoCell
          className="col-span-2 row-span-1 sm:col-span-4"
          delay={0.35}
        >
          <XRayTile />
        </BentoCell>
      </div>

      {/* Koko — floats in the top-right corner, peeking over the grid */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: 8 }}
        animate={{ opacity: 1, scale: 1, rotate: 6, y: [0, -6, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.7 },
          scale: { duration: 0.6, delay: 0.7 },
          rotate: { duration: 0.6, delay: 0.7 },
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.3 },
        }}
        className="pointer-events-none absolute -right-4 -top-10 z-20 hidden lg:block"
      >
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-accent/40 to-brand-ai/25 blur-2xl"
          />
          <div className="relative rounded-full bg-white p-2.5 shadow-elevated ring-1 ring-brand-border/60">
            <KokoLottie expression="waving" size={84} />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[10px] font-bold text-brand-text shadow-card ring-1 ring-brand-border/60">
            <span className="text-brand-primary">Koko</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Bento cell wrapper ───────────────────────────────────────────────────────

function BentoCell({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={`group overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ── Tile: Story Studio ───────────────────────────────────────────────────────

// ── Story carousel pages ─────────────────────────────────────────────────────

interface StoryPage {
  emoji: string;
  text: string;
  background: string;
  accent: string;
}

const STORY_PAGES: StoryPage[] = [
  {
    emoji: '🥞',
    text: 'Meet Vada the Dosa — the bravest breakfast in all of Chennai.',
    background: 'linear-gradient(155deg, #FF9F43 0%, #FF6B6B 100%)',
    accent: 'rgba(255, 255, 255, 0.4)',
  },
  {
    emoji: '🤖',
    text: 'One cloudy morning, a giant robot stomped through Marina Beach.',
    background: 'linear-gradient(155deg, #5B5FFF 0%, #8A5CFF 100%)',
    accent: 'rgba(255, 159, 67, 0.5)',
  },
  {
    emoji: '⚡',
    text: '&ldquo;Not on my watch!&rdquo; shouted Vada, leaping into action.',
    background: 'linear-gradient(155deg, #20C997 0%, #5B5FFF 100%)',
    accent: 'rgba(255, 255, 255, 0.45)',
  },
  {
    emoji: '🏙️',
    text: 'Chennai cheered as the robot wobbled — then tumbled into the sea.',
    background: 'linear-gradient(155deg, #FF9F43 0%, #FFD166 60%, #8A5CFF 120%)',
    accent: 'rgba(138, 92, 255, 0.35)',
  },
];

function StoryTile() {
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setPage((p) => (p + 1) % STORY_PAGES.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [paused]);

  const current = STORY_PAGES[page]!;

  return (
    <div
      className="flex h-full flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Carousel panel */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col justify-between p-3 text-white"
            style={{ background: current.background }}
          >
            {/* Ambient accent blob */}
            <div
              aria-hidden
              className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
              style={{ background: current.accent }}
            />
            <div
              aria-hidden
              className="absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-white/15 blur-3xl"
            />

            {/* Top row — STORY chip + page counter */}
            <div className="relative flex items-start justify-between">
              <div className="rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-primary shadow-soft">
                Story
              </div>
              <div className="numeric rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-bold text-white/95 backdrop-blur-sm">
                Page {page + 1} / {STORY_PAGES.length}
              </div>
            </div>

            {/* Centered hero emoji */}
            <div className="relative flex justify-center">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 mx-auto my-auto h-20 w-20 rounded-full bg-white/30 blur-2xl"
              />
              <motion.span
                initial={{ scale: 0.85, rotate: -6 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="block text-[44px] drop-shadow-lg"
              >
                {current.emoji}
              </motion.span>
            </div>

            {/* Page text */}
            <p
              className="relative font-display text-[12px] font-bold leading-[1.25] text-white drop-shadow-md"
              dangerouslySetInnerHTML={{ __html: current.text }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Page indicator dots */}
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
          {STORY_PAGES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setPage(i);
                setPaused(true);
                window.setTimeout(() => setPaused(false), 4000);
              }}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === page ? 'w-5 bg-white' : 'w-1 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Footer strip */}
      <div className="flex items-center justify-between bg-white px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-brand-ai to-brand-primary text-[10px] font-bold text-white">
            A
          </div>
          <span className="text-[10px] font-semibold text-brand-text">
            Aarav · Class 5
          </span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold text-brand-text-muted">
          <span>❤️ 28</span>
          <span className="text-brand-border">·</span>
          <span className="text-brand-secondary">11s</span>
        </span>
      </div>
    </div>
  );
}

// ── Tile: Music Lab ──────────────────────────────────────────────────────────

function MusicTile() {
  const bars = [0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.6, 0.4, 0.85, 0.5, 0.7, 0.3, 0.6];
  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-br from-orange-50 via-white to-amber-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 shadow-soft">
          <span className="text-xs">🎵</span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-brand-accent">
            Music Lab
          </span>
        </div>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent text-white shadow-button"
          aria-label="Play"
        >
          <Play className="h-2.5 w-2.5 fill-current" />
        </button>
      </div>

      {/* Waveform */}
      <div className="flex h-12 items-center justify-center gap-0.5">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            className="w-1 rounded-full bg-gradient-to-t from-brand-accent to-orange-300"
            style={{ height: `${h * 100}%` }}
            animate={{
              scaleY: [1, h > 0.6 ? 1.15 : 0.8, 1],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.08,
            }}
          />
        ))}
      </div>

      <div>
        <div className="truncate font-display text-[11px] font-bold text-brand-text">
          Chennai Rain
        </div>
        <div className="text-[9px] text-brand-text-muted">Upbeat · 0:24</div>
      </div>
    </div>
  );
}

// ── Tile: Quiz Maker ─────────────────────────────────────────────────────────

function QuizTile() {
  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-br from-emerald-50 via-white to-indigo-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 shadow-soft">
          <span className="text-xs">🧠</span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-brand-secondary">
            Quiz Maker
          </span>
        </div>
        <div className="numeric text-[9px] font-bold text-brand-text-muted">
          Q3/10
        </div>
      </div>

      <div className="font-display text-[11px] font-bold leading-snug text-brand-text">
        Which Indian state has the most tigers?
      </div>

      <div className="space-y-1">
        <AnswerRow label="A. Karnataka" />
        <AnswerRow label="B. Madhya Pradesh" correct />
        <AnswerRow label="C. Kerala" />
      </div>
    </div>
  );
}

function AnswerRow({ label, correct = false }: { label: string; correct?: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-medium ${
        correct
          ? 'bg-brand-secondary/10 text-brand-secondary'
          : 'bg-white text-brand-text-secondary ring-1 ring-brand-border'
      }`}
    >
      {correct && <Check className="h-2.5 w-2.5" />}
      {label}
    </div>
  );
}

// ── Tile: Comics ─────────────────────────────────────────────────────────────

function ComicsTile() {
  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-br from-amber-50 via-white to-rose-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 shadow-soft">
          <span className="text-xs">🎨</span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-brand-accent">
            Comics
          </span>
        </div>
        <div className="text-[9px] font-bold text-brand-text-muted">4 panels</div>
      </div>

      {/* 2×2 panel grid */}
      <div className="grid grid-cols-2 gap-1">
        <div
          className="aspect-square rounded-md"
          style={{ background: 'linear-gradient(135deg, #FF9F43, #FFD166)' }}
        />
        <div
          className="aspect-square rounded-md"
          style={{ background: 'linear-gradient(135deg, #8A5CFF, #5B5FFF)' }}
        />
        <div
          className="aspect-square rounded-md"
          style={{ background: 'linear-gradient(135deg, #20C997, #5B5FFF)' }}
        />
        <div
          className="aspect-square rounded-md"
          style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF9F43)' }}
        />
      </div>

      <div className="flex items-center gap-1 rounded-md bg-white px-2 py-1 shadow-soft">
        <MessageCircle className="h-2.5 w-2.5 text-brand-accent" />
        <span className="truncate text-[9px] font-semibold text-brand-text">
          &ldquo;Not so fast, robot!&rdquo;
        </span>
      </div>
    </div>
  );
}

// ── Tile: Game Studio ────────────────────────────────────────────────────────

function GamesTile() {
  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 shadow-soft">
          <span className="text-xs">🎮</span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-brand-secondary">
            Game Studio
          </span>
        </div>
        <div className="text-[9px] font-bold text-brand-text-muted">Scene 4</div>
      </div>

      <div className="font-display text-[11px] font-bold leading-snug text-brand-text">
        The cave is dark. The growl gets louder.
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          className="rounded-md bg-brand-primary px-1.5 py-1 text-[9px] font-bold text-white shadow-button"
        >
          ⚔ Fight
        </button>
        <button
          type="button"
          className="rounded-md bg-white px-1.5 py-1 text-[9px] font-bold text-brand-text ring-1 ring-brand-border"
        >
          🏃 Run
        </button>
      </div>
    </div>
  );
}

// ── Tile: Kid CEO (flagship, NEW) ────────────────────────────────────────────

function KidCeoTile() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Top gradient band with NEW ribbon */}
      <div
        className="relative px-3 pt-3 pb-2"
        style={{ background: 'linear-gradient(135deg, #5B5FFF, #8A5CFF)' }}
      >
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">👔</span>
            <span className="text-[9px] font-bold uppercase tracking-wide">
              Kid CEO
            </span>
          </div>
          <span className="rounded-full bg-brand-accent px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
            New
          </span>
        </div>
        <div className="mt-2 text-[10px] text-white/85">Lemonade Stand · Week 3</div>
        <div className="numeric mt-0.5 font-display text-lg font-extrabold text-white">
          ₹2,480
          <span className="ml-1 text-[10px] font-semibold text-white/75">revenue</span>
        </div>
      </div>

      {/* Mini chart */}
      <div className="flex-1 bg-white px-3 py-2">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-bold text-brand-text-secondary">This week</span>
          <span className="flex items-center gap-0.5 font-bold text-brand-secondary">
            <BarChart3 className="h-2.5 w-2.5" />
            +18%
          </span>
        </div>
        <div className="mt-1.5 flex h-10 items-end gap-1">
          {[0.35, 0.45, 0.3, 0.6, 0.55, 0.7, 0.85].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-gradient-to-t from-brand-primary to-brand-ai"
              style={{ height: `${h * 100}%`, opacity: 0.5 + h * 0.5 }}
            />
          ))}
        </div>
      </div>

      {/* Decision prompt */}
      <div className="bg-gradient-to-br from-brand-soft to-white px-3 py-2">
        <div className="text-[9px] font-semibold uppercase tracking-wide text-brand-primary">
          Decision · Day 18
        </div>
        <div className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-snug text-brand-text">
          &ldquo;Your biggest customer wants a discount. Agree?&rdquo;
        </div>
      </div>
    </div>
  );
}

// ── Tile: AI X-Ray (wide footer) ─────────────────────────────────────────────

function XRayTile() {
  return (
    <div className="flex h-full items-center gap-4 p-4 sm:p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-ai to-brand-primary text-white">
        <Sparkles className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold text-brand-text">
            AI X-Ray
          </span>
          <span className="rounded-full bg-brand-secondary/10 px-2 py-0.5 text-[9px] font-bold text-brand-secondary">
            +15 AI Points
          </span>
          <span className="hidden text-[10px] text-brand-text-muted sm:inline">
            · Story Studio · Class 5 · 11.4s
          </span>
        </div>
        <div className="mt-1.5 hidden grid-cols-3 gap-2 sm:grid">
          <XRayCell label="Prompt" value="A brave dosa that saved Chennai" />
          <XRayCell label="Model" value="Claude + Replicate SDXL" />
          <XRayCell label="Concept" value="Text-to-image generation" accent />
        </div>
        <div className="mt-1 text-[11px] text-brand-text-muted sm:hidden">
          Claude + SDXL · Text-to-image
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[10px] font-bold text-brand-primary sm:flex">
        See all <ArrowRight className="h-3 w-3" />
      </div>
    </div>
  );
}

function XRayCell({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md bg-brand-background px-2 py-1">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-brand-text-muted">
        {label}
      </div>
      <div
        className={`truncate text-[10px] font-semibold ${
          accent ? 'text-brand-ai' : 'text-brand-text'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
