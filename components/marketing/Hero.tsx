'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Wand2, Eye, Swords } from 'lucide-react';
import { KokoLottie } from './KokoLottie';
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

          {/* ─── Koko column (mobile: 1st, lg: 2nd, spans 5/12) ─────────── */}
          <div className="order-1 lg:order-2 lg:col-span-5">
            <KokoHero />
          </div>
        </div>
      </div>
    </section>
  );
}

/* Koko mascot — focal visual. Friendly, kid-magnetic, with a speech bubble
   that frames the product as a creative invitation rather than a tool. */
function KokoHero() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative mx-auto flex w-full max-w-sm items-center justify-center lg:max-w-none"
    >
      {/* Soft halo behind Koko */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 mx-auto h-[80%] w-[80%] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(138,92,255,0.30), rgba(91,95,255,0.15) 50%, transparent 75%)',
        }}
      />

      {/* Koko card */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex aspect-square w-[260px] items-center justify-center rounded-[40px] bg-gradient-to-br from-white via-brand-soft/40 to-white shadow-elevated ring-1 ring-brand-border/50 sm:w-[300px] lg:w-[340px]"
      >
        <KokoLottie expression="waving" size={220} />

        {/* Speech bubble — top-right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, type: 'spring', stiffness: 260, damping: 18 }}
          className="absolute -right-3 -top-3 max-w-[180px] rounded-2xl bg-white px-3.5 py-2 shadow-card ring-1 ring-brand-border/60 sm:-right-5 sm:-top-5"
        >
          <div className="text-[9px] font-bold uppercase tracking-wide text-brand-primary">
            Koko
          </div>
          <div className="mt-0.5 font-display text-[12px] font-bold leading-snug text-brand-text">
            What should we make today?
          </div>
          {/* Tail */}
          <div
            aria-hidden
            className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 bg-white ring-1 ring-brand-border/60"
            style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }}
          />
        </motion.div>

        {/* Sparkle decorations */}
        <motion.span
          aria-hidden
          animate={{ rotate: [0, 18, -10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-2 -left-2 text-2xl"
        >
          ✨
        </motion.span>
        <motion.span
          aria-hidden
          animate={{ rotate: [0, -18, 10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          className="absolute -bottom-3 right-4 text-xl"
        >
          🎨
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
