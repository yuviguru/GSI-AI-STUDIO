'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Wand2, Eye, Swords } from 'lucide-react';
import { PixieFloatingBubble } from '@/components/mascot/PixieFloatingBubble';
import { resolveHeroCopy } from '@/content/marketing/welcome';

/** Founder-pitch loop — replaces the old "Pick / Describe / Share" steps. */
const LOOP_CHIPS = [
  { icon: Wand2, label: 'Create' },
  { icon: Eye, label: 'Understand' },
  { icon: Swords, label: 'Compete' },
];

export function Hero() {
  const searchParams = useSearchParams();
  const copy = resolveHeroCopy(searchParams?.get('heroVariant'));

  return (
    <section className="relative overflow-hidden bg-white pt-12 pb-20 sm:pt-16 sm:pb-24">
      {/* Background ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(138,92,255,0.35), rgba(91,95,255,0.18) 40%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-screen-xl px-5 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* ─── Text column (mobile: 2nd, lg: 1st, spans 7/12) ─────────── */}
          <div className="order-2 lg:order-1 lg:col-span-7">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto flex w-fit items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand-primary lg:mx-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-6 text-center font-display text-[40px] font-extrabold leading-[1.05] tracking-tight text-brand-text text-balance sm:text-[52px] lg:text-left lg:text-[60px] xl:text-[68px]"
            >
              {copy.headlinePrefix}{' '}
              <span className="text-gradient-primary">{copy.headlineHighlight}</span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mx-auto mt-5 max-w-xl text-center text-body-lg leading-relaxed text-brand-text-secondary lg:mx-0 lg:text-left"
            >
              {copy.subhead}
            </motion.p>

            {/* Dual CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start"
            >
              <Link
                href={copy.primaryCta.href}
                className="group flex h-13 items-center justify-center gap-2 rounded-full bg-brand-primary px-8 py-3.5 text-body-lg font-semibold text-white shadow-button transition-all hover:brightness-110 hover:shadow-button-hover active:scale-[0.98]"
              >
                {copy.primaryCta.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href={copy.secondaryCta.href}
                className="flex h-13 items-center justify-center gap-2 rounded-full border-2 border-brand-border bg-white px-8 py-3.5 text-body-lg font-semibold text-brand-text transition-all hover:border-brand-primary hover:bg-brand-soft"
              >
                {copy.secondaryCta.label}
              </Link>
            </motion.div>

            {/* Trust micro-strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-caption text-brand-text-muted lg:justify-start"
            >
              {copy.trustChips.map((chip, i) => (
                <span key={chip} className="flex items-center gap-1.5">
                  {i === 0 && <Shield className="h-3.5 w-3.5 text-brand-secondary" />}
                  {i > 0 && (
                    <span className="hidden h-1 w-1 rounded-full bg-brand-border sm:block" />
                  )}
                  <span>{chip}</span>
                </span>
              ))}
            </motion.div>

            {/* Loop chip-strip — Create · Understand · Compete (founder's loop) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 flex w-fit flex-wrap items-center gap-x-3 gap-y-2 rounded-full border border-brand-border bg-white px-3 py-2 shadow-soft sm:gap-x-4 sm:px-5 mx-auto lg:mx-0"
            >
              <span className="text-[10px] font-bold uppercase tracking-wide text-brand-text-muted">
                The loop:
              </span>
              {LOOP_CHIPS.map((chip, i) => {
                const Icon = chip.icon;
                return (
                  <div key={chip.label} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                      <Icon className="h-3 w-3 text-brand-primary" />
                    </div>
                    <span className="font-display text-caption font-bold text-brand-text">
                      {chip.label}
                    </span>
                    {i < LOOP_CHIPS.length - 1 && (
                      <span
                        aria-hidden
                        className="hidden h-3 w-px bg-brand-border sm:block"
                      />
                    )}
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* ─── Mascot column (mobile: 1st, lg: 2nd, spans 5/12) ───────── */}
          <div className="order-1 lg:order-2 lg:col-span-5">
            <BrandMascotHero />
          </div>
        </div>
      </div>
    </section>
  );
}

/* Brand mascot hero — preview of Pixie's actual in-app UX, not a marketing demo.
   The hero shows a cycling "mock app screen" (Story Studio canvas, Homework
   panel, AI X-Ray reveal, Beat the AI scoreboard) with PixieFloatingBubble
   overlaid in her real corner position. Each scene cycles every ~6s, with
   Pixie's contextual message changing to match what's on screen. The same
   PixieFloatingBubble component drops into the in-app layouts unchanged. */

interface PixieScene {
  id: string;
  label: string;
  pixieMessage: string;
  /** Mock canvas component rendered as the "app screen" background. */
  Canvas: () => JSX.Element;
}

function BrandMascotHero() {
  const [sceneIdx, setSceneIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSceneIdx((p) => (p + 1) % PIXIE_SCENES.length);
    }, 6200);
    return () => window.clearInterval(id);
  }, []);

  const scene = PIXIE_SCENES[sceneIdx]!;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative mx-auto w-full max-w-md lg:max-w-none"
    >
      {/* Soft halo behind the mock app screen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[48px] opacity-65 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(91,179,255,0.35), rgba(138,92,255,0.18) 50%, transparent 80%)',
        }}
      />

      {/* Mock "app screen" — looks like a real product surface, cycles through 4 contexts */}
      <div className="relative h-[420px] w-full overflow-hidden rounded-[28px] bg-white shadow-elevated ring-1 ring-brand-border/60 sm:h-[440px]">
        {/* Browser-y top bar — gives the "this is the app" cue */}
        <div className="flex items-center gap-1.5 border-b border-brand-border/40 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <AnimatePresence mode="wait">
            <motion.span
              key={`label-${scene.id}`}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.25 }}
              className="ml-2 font-display text-[11px] font-bold text-brand-text-muted"
            >
              gsi.studio / {scene.label}
            </motion.span>
          </AnimatePresence>
          {/* Scene progression dots */}
          <div className="ml-auto flex items-center gap-1">
            {PIXIE_SCENES.map((s, i) => (
              <span
                key={s.id}
                className={`h-1 rounded-full transition-all ${
                  i === sceneIdx ? 'w-3 bg-cyan-500' : 'w-1 bg-brand-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Cycling canvas */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`canvas-${scene.id}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inset-x-0 bottom-0 top-[42px]"
          >
            <scene.Canvas />
          </motion.div>
        </AnimatePresence>

        {/* Pixie — actual in-app pattern, overlaid in the corner */}
        <PixieFloatingBubble message={scene.pixieMessage} avatarSize="lg" />
      </div>

      {/* Caption */}
      <p className="mt-4 text-center text-caption text-brand-text-muted">
        Meet <span className="font-bold text-brand-text">Pixie</span>, your kid&apos;s AI buddy. She lives in every studio. Always there. Never in the way.
      </p>
    </motion.div>
  );
}

/* ─── Mock canvases — each is a stripped-down preview of a real product surface ──── */

function StoryCanvasMock() {
  return (
    <div className="h-full w-full bg-gradient-to-br from-amber-50 via-white to-rose-50 p-4">
      <div className="text-[9px] font-bold uppercase tracking-wide text-amber-700">
        📖 Story Studio
      </div>
      <div className="mt-2 rounded-xl bg-white p-3 shadow-soft ring-1 ring-amber-100">
        <h4 className="font-display text-[15px] font-extrabold text-brand-text">
          The Brave Dosa
        </h4>
        <p className="mt-1 text-[11px] leading-snug text-brand-text-secondary">
          One cloudy morning at Marina Beach, a brave dosa decided to save Chennai from a giant robot…
        </p>
      </div>
      <div className="mt-3 flex h-[140px] items-end overflow-hidden rounded-xl bg-gradient-to-br from-orange-200 via-amber-200 to-rose-200 ring-1 ring-amber-300/50">
        <div className="flex w-full items-end justify-around px-3 pb-2">
          <span className="text-4xl">🥞</span>
          <span className="text-3xl">🌊</span>
          <span className="text-2xl opacity-70">🤖</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px]">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
          Page 1 of 4
        </span>
        <span className="text-brand-text-muted">Drawing the next scene…</span>
      </div>
    </div>
  );
}

function HomeworkCanvasMock() {
  return (
    <div className="h-full w-full bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
      <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-700">
        📚 Homework Helper
      </div>
      <div className="mt-2 rounded-xl bg-white p-4 shadow-soft ring-1 ring-emerald-100">
        <p className="text-[10px] font-semibold text-brand-text-muted">
          Class 5 · Math · Question 3
        </p>
        <h4 className="mt-1 font-display text-3xl font-extrabold text-brand-text">
          27 × 13 = ?
        </h4>
      </div>
      <div className="mt-3 space-y-1.5 rounded-xl bg-white p-3 shadow-soft ring-1 ring-cyan-100">
        <div className="text-[9px] font-bold uppercase tracking-wide text-cyan-700">
          Pixie&apos;s hint trail
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px]">
          <span className="text-emerald-600">✓</span>
          <span className="font-semibold text-brand-text">Step 1: 27 × 10 = 270</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-cyan-50 px-2 py-1.5 text-[11px] ring-1 ring-cyan-200">
          <span className="font-bold text-cyan-700">→</span>
          <span className="font-semibold text-brand-text">Step 2: 27 × 3 = ?</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-brand-background px-2 py-1.5 text-[11px] opacity-50">
          <span className="text-brand-text-muted">·</span>
          <span className="text-brand-text-muted">Step 3: add them up</span>
        </div>
      </div>
    </div>
  );
}

function XRayCanvasMock() {
  return (
    <div className="h-full w-full bg-gradient-to-br from-purple-50 via-white to-cyan-50 p-4">
      <div className="text-[9px] font-bold uppercase tracking-wide text-purple-700">
        🔍 AI X-Ray
      </div>
      <div className="mt-2 flex h-[110px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-purple-300 via-fuchsia-300 to-pink-300 shadow-soft ring-1 ring-purple-200">
        <span className="text-5xl drop-shadow-md">🐉</span>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="rounded-lg bg-white p-2 shadow-soft ring-1 ring-purple-100">
          <div className="text-[8px] font-bold uppercase tracking-wide text-purple-600">
            Your prompt
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-brand-text">
            &ldquo;a fierce dragon with rainbow wings&rdquo;
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg bg-white p-2 shadow-soft ring-1 ring-purple-100">
            <div className="text-[8px] font-bold uppercase tracking-wide text-purple-600">
              Model
            </div>
            <div className="mt-0.5 text-[10px] font-semibold text-brand-text">
              SDXL · text-to-image
            </div>
          </div>
          <div className="rounded-lg bg-white p-2 shadow-soft ring-1 ring-cyan-100">
            <div className="text-[8px] font-bold uppercase tracking-wide text-cyan-700">
              Concept
            </div>
            <div className="mt-0.5 text-[10px] font-semibold text-brand-text">
              How AI paints words
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BeatAiCanvasMock() {
  return (
    <div className="h-full w-full bg-gradient-to-br from-cyan-50 via-white to-purple-50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[9px] font-bold uppercase tracking-wide text-cyan-700">
          ⚡ Beat the AI
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
          Maths Monday
        </span>
      </div>
      <div className="mt-3 rounded-xl bg-white p-3 shadow-soft ring-1 ring-cyan-100">
        <div className="text-[9px] font-semibold uppercase tracking-wide text-brand-text-muted">
          Today&apos;s problem
        </div>
        <div className="mt-1 font-display text-[13px] font-bold text-brand-text">
          &ldquo;Show your working: 27 × 13&rdquo;
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="relative rounded-xl bg-white p-2.5 shadow-soft ring-2 ring-emerald-300">
          <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">
            You
          </div>
          <div className="numeric mt-0.5 font-display text-2xl font-extrabold text-emerald-600">
            92
          </div>
          <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
            Win
          </span>
        </div>
        <div className="rounded-xl bg-white/70 p-2.5 shadow-soft ring-1 ring-brand-border">
          <div className="text-[9px] font-bold uppercase tracking-wide text-brand-text-muted">
            Hard AI 🤖
          </div>
          <div className="numeric mt-0.5 font-display text-2xl font-extrabold text-brand-text-secondary">
            78
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px]">
        <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 font-bold text-brand-primary">
          +50 XP earned
        </span>
      </div>
    </div>
  );
}

const PIXIE_SCENES: PixieScene[] = [
  {
    id: 'story',
    label: 'Story Studio',
    pixieMessage:
      "Bored is the best time to make stuff. Wanna build a story? You pick the hero.",
    Canvas: StoryCanvasMock,
  },
  {
    id: 'homework',
    label: 'Homework Helper',
    pixieMessage:
      "I never give answers, only hints. Try Step 2 next. What's 27 × 3?",
    Canvas: HomeworkCanvasMock,
  },
  {
    id: 'xray',
    label: 'AI X-Ray',
    pixieMessage:
      "I drew your dragon with these words. Tap any tag to see what it changed.",
    Canvas: XRayCanvasMock,
  },
  {
    id: 'beat',
    label: 'Beat the AI',
    pixieMessage:
      "You won this round. Wanna try Hard AI on Truth Tuesday tomorrow?",
    Canvas: BeatAiCanvasMock,
  },
];
