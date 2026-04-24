'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Shield } from 'lucide-react';

const FLOATING_TILES = [
  { emoji: '📖', label: 'Stories', gradient: 'gradient-story', rotate: -8, x: '-14%', y: '8%', delay: 0 },
  { emoji: '🎵', label: 'Music', gradient: 'gradient-music', rotate: 6, x: '82%', y: '4%', delay: 0.1 },
  { emoji: '🎮', label: 'Games', gradient: 'gradient-game', rotate: -4, x: '78%', y: '62%', delay: 0.2 },
  { emoji: '🎨', label: 'Comics', gradient: 'gradient-comic', rotate: 9, x: '-10%', y: '58%', delay: 0.3 },
  { emoji: '🧠', label: 'Quiz', gradient: 'gradient-quiz', rotate: -6, x: '42%', y: '-6%', delay: 0.4 },
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

        {/* Floating studio tiles + Koko focal visual */}
        <div className="relative mx-auto mt-16 h-[360px] w-full max-w-4xl sm:h-[420px] lg:h-[460px]">
          {/* Ambient gradient card behind tiles */}
          <div
            aria-hidden
            className="absolute inset-x-[6%] top-6 bottom-6 rounded-[40px] bg-gradient-to-br from-brand-soft via-white to-brand-soft shadow-soft"
          />

          {/* Floating tiles */}
          {FLOATING_TILES.map((tile) => (
            <motion.div
              key={tile.label}
              className="absolute"
              style={{ left: tile.x, top: tile.y }}
              initial={{ opacity: 0, y: 24, rotate: 0 }}
              animate={{
                opacity: 1,
                y: [0, -8, 0],
                rotate: tile.rotate,
              }}
              transition={{
                opacity: { duration: 0.5, delay: 0.3 + tile.delay },
                rotate: { duration: 0.5, delay: 0.3 + tile.delay },
                y: {
                  duration: 3 + tile.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.8 + tile.delay,
                },
              }}
            >
              <div
                className={`${tile.gradient} flex items-center gap-2.5 rounded-2xl px-4 py-3 text-white shadow-card`}
              >
                <span className="text-2xl">{tile.emoji}</span>
                <span className="font-display text-sm font-bold">
                  {tile.label}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Centerpiece: AI X-Ray style card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.35, type: 'spring' }}
            className="absolute left-1/2 top-1/2 w-[82%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-5 shadow-elevated ring-1 ring-brand-border/60"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-ai to-brand-primary text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-sm font-bold text-brand-text">
                  AI X-Ray
                </div>
                <div className="text-[11px] text-brand-text-muted">
                  What just happened?
                </div>
              </div>
              <div className="ml-auto rounded-full bg-brand-secondary/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-secondary">
                +15 AI Points
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <XRayLine label="Prompt" value="A brave dosa that saved Chennai" delay={0.8} />
              <XRayLine label="Model" value="Claude + Replicate SDXL" delay={0.95} />
              <XRayLine label="Concept" value="Text-to-image generation" delay={1.1} accent />
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
        </div>
      </div>
    </section>
  );
}

function XRayLine({
  label,
  value,
  delay,
  accent = false,
}: {
  label: string;
  value: string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center justify-between gap-3 rounded-lg bg-brand-background px-3 py-2"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-text-muted">
        {label}
      </span>
      <span
        className={`truncate text-caption font-semibold ${
          accent ? 'text-brand-ai' : 'text-brand-text'
        }`}
      >
        {value}
      </span>
    </motion.div>
  );
}
