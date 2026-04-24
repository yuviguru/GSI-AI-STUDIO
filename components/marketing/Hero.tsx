'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Layers, Share2 } from 'lucide-react';
import { KokoLottie } from './KokoLottie';

const INLINE_STEPS = [
  { num: '01', icon: Layers, label: 'Pick a studio' },
  { num: '02', icon: Sparkles, label: 'Describe an idea' },
  { num: '03', icon: Share2, label: 'Share + learn' },
];

interface Tile {
  emoji: string;
  label: string;
  gradient: string;
  featured?: boolean;
}

// Arranged in two visual rows — top 3 + bottom 3 — around the centerpiece.
const TOP_TILES: Tile[] = [
  { emoji: '📖', label: 'Stories', gradient: 'gradient-story' },
  { emoji: '🧠', label: 'Quiz', gradient: 'gradient-quiz' },
  { emoji: '🎵', label: 'Music', gradient: 'gradient-music' },
];

const BOTTOM_TILES: Tile[] = [
  { emoji: '👔', label: 'Kid CEO', gradient: 'gradient-primary', featured: true },
  { emoji: '🎨', label: 'Comics', gradient: 'gradient-comic' },
  { emoji: '🎮', label: 'Games', gradient: 'gradient-game' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-12 pb-20 sm:pt-16 sm:pb-28">
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
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-brand-primary/20 bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Aligned to CBSE AI &amp; Computational Thinking · 2026-27
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mx-auto max-w-4xl text-center font-display text-[44px] font-extrabold leading-[1.05] tracking-tight text-brand-text text-balance sm:text-[60px] lg:text-[72px]"
        >
          From first story to{' '}
          <span className="text-gradient-primary">first AI engineer.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-center text-body-lg leading-relaxed text-brand-text-secondary sm:text-lg"
        >
          Indian kids build stories, music, quizzes and games with AI — and
          discover how AI actually works while they create. Safe by default.
          Shareable in one tap. Built for ages 8–17.
        </motion.p>

        {/* Dual CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/create/story"
            className="group flex h-13 items-center justify-center gap-2 rounded-full bg-brand-primary px-8 py-3.5 text-body-lg font-semibold text-white shadow-button transition-all hover:brightness-110 hover:shadow-button-hover active:scale-[0.98]"
          >
            Start creating — free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="#schools"
            className="flex h-13 items-center justify-center gap-2 rounded-full border-2 border-brand-border bg-white px-8 py-3.5 text-body-lg font-semibold text-brand-text transition-all hover:border-brand-primary hover:bg-brand-soft"
          >
            For schools
          </Link>
        </motion.div>

        {/* Trust micro-strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-caption text-brand-text-muted"
        >
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-brand-secondary" />
            100% child-safe outputs
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-brand-border sm:block" />
          <span>No credit card · Free forever tier</span>
          <span className="hidden h-1 w-1 rounded-full bg-brand-border sm:block" />
          <span>10 studios · 12 badges · WhatsApp-ready</span>
        </motion.div>

        {/* Inline 3-step how-it-works (replaces the full HowItWorks section) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mx-auto mt-10 flex w-fit max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-3 rounded-full border border-brand-border bg-white px-3 py-2 shadow-soft sm:gap-x-5 sm:px-5"
        >
          {INLINE_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                  <Icon className="h-3.5 w-3.5 text-brand-primary" />
                </div>
                <span className="numeric text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                  {step.num}
                </span>
                <span className="font-display text-caption font-bold text-brand-text">
                  {step.label}
                </span>
                {i < INLINE_STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="hidden h-3 w-px bg-brand-border sm:block"
                  />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Focal visual — X-Ray centerpiece with tiles on a clean grid + Koko to the side */}
        <div className="relative mx-auto mt-16 w-full max-w-5xl">
          {/* Soft radial glow backdrop (no hard card) */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(91,95,255,0.18), rgba(138,92,255,0.10) 45%, transparent 70%)',
            }}
          />

          {/* Main composition grid */}
          <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto] lg:gap-10">
            {/* Left — tiles + centerpiece card */}
            <div className="grid grid-cols-3 gap-4 sm:gap-5">
              {/* Row 1 — top tiles */}
              {TOP_TILES.map((tile, i) => (
                <TileCard key={tile.label} tile={tile} index={i} />
              ))}

              {/* Row 2 — X-Ray centerpiece spans all 3 columns */}
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
                className="col-span-3 rounded-3xl bg-white p-5 shadow-elevated ring-1 ring-brand-border/60 sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-ai to-brand-primary text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-sm font-bold text-brand-text">
                      AI X-Ray
                    </div>
                    <div className="text-[11px] text-brand-text-muted">
                      What just happened?
                    </div>
                  </div>
                  <div className="ml-auto shrink-0 rounded-full bg-brand-secondary/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-secondary">
                    +15 AI Points
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <XRayLine label="Prompt" value="A brave dosa that saved Chennai" />
                  <XRayLine label="Model" value="Claude + Replicate SDXL" />
                  <XRayLine label="Concept" value="Text-to-image generation" accent />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-brand-border pt-3">
                  <span className="text-[11px] font-semibold text-brand-text-secondary">
                    Story Studio · Class 5
                  </span>
                  <span className="numeric text-[11px] text-brand-text-muted">
                    11.4s
                  </span>
                </div>
              </motion.div>

              {/* Row 3 — bottom tiles */}
              {BOTTOM_TILES.map((tile, i) => (
                <TileCard key={tile.label} tile={tile} index={i + 3} />
              ))}
            </div>

            {/* Right — Koko */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
              transition={{
                opacity: { duration: 0.6, delay: 0.6 },
                scale: { duration: 0.6, delay: 0.6 },
                y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.4 },
              }}
              className="relative flex justify-center lg:justify-start"
            >
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-accent/30 via-brand-ai/20 to-transparent blur-2xl"
                />
                <div className="relative rounded-full bg-white p-4 shadow-elevated ring-1 ring-brand-border/60">
                  <KokoLottie expression="waving" size={128} />
                </div>
                {/* Speech tag — pinned cleanly below */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-[11px] font-bold text-brand-text shadow-card ring-1 ring-brand-border/60">
                  <span className="text-brand-primary">Koko</span> · your AI buddy
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function TileCard({ tile, index }: { tile: Tile; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 + index * 0.06, ease: 'easeOut' }}
      className="flex items-center justify-center"
    >
      <div
        className={`${tile.gradient} relative flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-white shadow-card sm:px-5 sm:py-4`}
      >
        <span className="text-xl sm:text-2xl" aria-hidden>
          {tile.emoji}
        </span>
        <span className="font-display text-[13px] font-bold sm:text-sm">
          {tile.label}
        </span>
        {tile.featured && (
          <span className="absolute -top-2 -right-2 rounded-full bg-brand-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-button">
            New
          </span>
        )}
      </div>
    </motion.div>
  );
}

function XRayLine({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-brand-background px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-muted">
        {label}
      </div>
      <div
        className={`mt-0.5 truncate text-[12px] font-semibold ${
          accent ? 'text-brand-ai' : 'text-brand-text'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

