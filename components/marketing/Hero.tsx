'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Wand2, Eye, Swords } from 'lucide-react';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { getMascot } from '@/lib/mascots/roster';
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

/* Brand mascot — focal hero visual. Pixie + a mini cycling chat demo
   that shows the four ways she helps a kid: spark creativity, give
   homework hints (never answers), explain how AI made things via
   X-Ray, and challenge them in head-to-head Beat the AI. Each scene
   is a 2-message exchange; the demo cycles every ~6s. */

interface ChatMsg {
  from: 'kid' | 'pixie';
  text: string;
}

interface ChatScene {
  id: string;
  label: string;
  badge: string;
  messages: ChatMsg[];
}

const PIXIE_DEMO_SCENES: ChatScene[] = [
  {
    id: 'create',
    label: 'Creative spark',
    badge: '✨',
    messages: [
      { from: 'kid', text: "I'm bored 😩" },
      { from: 'pixie', text: "Let's make a story! Hero — dragon or dosa?" },
    ],
  },
  {
    id: 'homework',
    label: 'Homework — hints, not answers',
    badge: '📚',
    messages: [
      { from: 'kid', text: 'Stuck on 27 × 13' },
      { from: 'pixie', text: 'Try 27 × 10 first. What do you get?' },
    ],
  },
  {
    id: 'xray',
    label: 'AI X-Ray',
    badge: '🔍',
    messages: [
      { from: 'kid', text: 'How did you make my dragon?' },
      { from: 'pixie', text: 'Replicate SDXL turned your prompt into pixels — wanna see how?' },
    ],
  },
  {
    id: 'beat',
    label: 'Beat the AI',
    badge: '⚡',
    messages: [
      { from: 'kid', text: 'Bet I can write better than you' },
      { from: 'pixie', text: 'Maths Monday — pick your champion 🤖' },
    ],
  },
];

function BrandMascotHero() {
  const mascot = getMascot('pixie');
  const [sceneIdx, setSceneIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSceneIdx((p) => (p + 1) % PIXIE_DEMO_SCENES.length);
    }, 5800);
    return () => window.clearInterval(id);
  }, []);

  const scene = PIXIE_DEMO_SCENES[sceneIdx]!;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative mx-auto flex w-full max-w-md flex-col items-center gap-3 lg:max-w-none"
    >
      {/* Soft halo glow behind Pixie */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-2 left-1/2 -z-10 h-[260px] w-[400px] -translate-x-1/2 rounded-full opacity-65 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(91,179,255,0.35), rgba(138,92,255,0.18) 45%, transparent 75%)',
        }}
      />

      {/* Pixie — sits free, with subtle bob */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <MascotAvatar
          id={mascot.id}
          size="2xl"
          ariaLabel={`${mascot.name} — GSI brand mascot`}
        />

        {/* Sparkle accents */}
        <motion.span
          aria-hidden
          animate={{ rotate: [0, 18, -10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-7 top-2 text-2xl"
        >
          ✨
        </motion.span>
        <motion.span
          aria-hidden
          animate={{ rotate: [0, -18, 10, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          className="absolute -right-5 bottom-4 text-xl"
        >
          💬
        </motion.span>
      </motion.div>

      {/* Identity tag — Pixie name + live indicator */}
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500" />
          </span>
          {mascot.name}
        </span>
        <span className="text-[11px] text-brand-text-muted">your kid&apos;s AI buddy</span>
      </div>

      {/* Mini chat demo — cycles through 4 scenarios showing Pixie's 4 roles */}
      <div className="w-full max-w-[340px] rounded-3xl bg-white p-3 shadow-card ring-1 ring-brand-border/60">
        {/* Scene label tab */}
        <div className="flex items-center justify-between border-b border-brand-border/50 pb-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={`label-${sceneIdx}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1.5"
            >
              <span className="text-sm">{scene.badge}</span>
              <span className="font-display text-[11px] font-bold text-brand-text">
                {scene.label}
              </span>
            </motion.div>
          </AnimatePresence>
          {/* Scene dots — show progression */}
          <div className="flex items-center gap-1">
            {PIXIE_DEMO_SCENES.map((s, i) => (
              <span
                key={s.id}
                className={`h-1 rounded-full transition-all ${
                  i === sceneIdx ? 'w-3 bg-cyan-500' : 'w-1 bg-brand-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Chat messages */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`msgs-${sceneIdx}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="mt-2.5 space-y-1.5"
          >
            {scene.messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} delay={i * 0.35} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Caption */}
      <p className="text-center text-caption text-brand-text-muted">
        Meet <span className="font-bold text-brand-text">{mascot.name}</span> — your kid&apos;s AI buddy who sparks ideas, gives hints, explains every prompt, and challenges them.
      </p>
    </motion.div>
  );
}

function ChatBubble({ msg, delay }: { msg: ChatMsg; delay: number }) {
  const isKid = msg.from === 'kid';
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className={`flex ${isKid ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] px-3 py-1.5 text-[12px] leading-snug shadow-soft ${
          isKid
            ? 'rounded-2xl rounded-br-md bg-brand-primary text-white'
            : 'rounded-2xl rounded-bl-md bg-cyan-50 text-brand-text ring-1 ring-cyan-100'
        }`}
      >
        {msg.text}
      </div>
    </motion.div>
  );
}
