'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Layers, Share2 } from 'lucide-react';
import { HeroBento } from './HeroBento';
import { HERO_STEPS, resolveHeroCopy } from '@/content/marketing/welcome';

const STEP_ICONS = [Layers, Sparkles, Share2];

export function Hero() {
  const searchParams = useSearchParams();
  const copy = resolveHeroCopy(searchParams?.get('heroVariant'));

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
          {copy.eyebrow}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mx-auto max-w-4xl text-center font-display text-[44px] font-extrabold leading-[1.05] tracking-tight text-brand-text text-balance sm:text-[60px] lg:text-[72px]"
        >
          {copy.headlinePrefix}{' '}
          <span className="text-gradient-primary">{copy.headlineHighlight}</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-center text-body-lg leading-relaxed text-brand-text-secondary sm:text-lg"
        >
          {copy.subhead}
        </motion.p>

        {/* Dual CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
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
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-caption text-brand-text-muted"
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

        {/* Inline 3-step how-it-works (replaces the full HowItWorks section) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mx-auto mt-10 flex w-fit max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-3 rounded-full border border-brand-border bg-white px-3 py-2 shadow-soft sm:gap-x-5 sm:px-5"
        >
          {HERO_STEPS.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Sparkles;
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
                {i < HERO_STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="hidden h-3 w-px bg-brand-border sm:block"
                  />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Focal visual — bento grid of mini studio previews */}
        <div className="mt-16">
          <HeroBento />
        </div>
      </div>
    </section>
  );
}
