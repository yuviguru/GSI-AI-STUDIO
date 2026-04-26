'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  Play,
  Check,
  Bot,
  Brain,
  BarChart3,
  MessageCircle,
} from 'lucide-react';
import { KokoLottie } from './KokoLottie';

// Count up from 0 to `target` once `triggered` flips true. Subtle easeOutCubic
// so numbers settle gracefully — not a rapid slot-machine clatter.
function useTriggeredCountUp(triggered: boolean, target: number, durationMs = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!triggered) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [triggered, target, durationMs]);
  return value;
}

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
          href="/create/story"
          ariaLabel="Open Story Studio"
        >
          <StoryTile />
        </BentoCell>

        {/* 2 — Music Lab (1×1, waveform) */}
        <BentoCell delay={0.1} href="/create/music" ariaLabel="Open Music Lab">
          <MusicTile />
        </BentoCell>

        {/* 3 — Quiz Maker (1×1, mock question) */}
        <BentoCell delay={0.15} href="/create/quiz" ariaLabel="Open Quiz Maker">
          <QuizTile />
        </BentoCell>

        {/* 4 — Kid CEO (2×2, dashboard feel, NEW badge) */}
        <BentoCell
          className="col-span-2 row-span-2 sm:col-span-1 sm:row-span-2 lg:col-span-1 lg:row-span-2"
          delay={0.2}
          href="/ceo"
          ariaLabel="Open Kid CEO"
        >
          <KidCeoTile />
        </BentoCell>

        {/* 5 — Comics (1×1, panel grid) */}
        <BentoCell delay={0.25} href="/create/comic" ariaLabel="Open Comic Studio">
          <ComicsTile />
        </BentoCell>

        {/* 6 — Games (1×1, adventure choice) */}
        <BentoCell delay={0.3} href="/create/game" ariaLabel="Open Game Studio">
          <GamesTile />
        </BentoCell>

        {/* 7 — Beat the AI (half-width footer) */}
        <BentoCell
          className="col-span-2 row-span-1 sm:col-span-2"
          delay={0.35}
          href="/beat-the-ai"
          ariaLabel="Open Beat the AI"
        >
          <BeatAiTile />
        </BentoCell>

        {/* 8 — MindX Skill Arena (half-width footer) */}
        <BentoCell
          className="col-span-2 row-span-1 sm:col-span-2"
          delay={0.4}
          href="/skill-arena"
          ariaLabel="Open MindX Skill Arena"
        >
          <MindXTile />
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
  href,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  href?: string;
  ariaLabel?: string;
}) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={`group h-full overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover ${className}`}
    >
      {children}
    </motion.div>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className={`block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${className}`}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}

// ── Tile: Story Studio ───────────────────────────────────────────────────────

// ── Story carousel pages ─────────────────────────────────────────────────────
// Images generated by Pollinations and saved as static assets. Replace with
// real kid-made story art when sample creations are curated.

interface StoryPage {
  image: string;
  alt: string;
  text: string;
}

const STORY_PAGES: StoryPage[] = [
  {
    image: '/images/hero-story/page-1.jpg',
    alt: 'A dosa superhero with a red cape at Marina Beach',
    text: 'Meet Vada the Dosa — the bravest breakfast in all of Chennai.',
  },
  {
    image: '/images/hero-story/page-2.jpg',
    alt: 'A giant purple robot stomping through Marina Beach',
    text: 'One cloudy morning, a giant robot stomped through Marina Beach.',
  },
  {
    image: '/images/hero-story/page-3.jpg',
    alt: 'A caped hero leaping toward a giant robot with lightning',
    text: '&ldquo;Not on my watch!&rdquo; shouted Vada, leaping into action.',
  },
  {
    image: '/images/hero-story/page-4.jpg',
    alt: 'Chennai sunset with people cheering a fallen robot',
    text: 'Chennai cheered as the robot wobbled — then tumbled into the sea.',
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
      <div className="relative flex-1 overflow-hidden bg-brand-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            {/* Sample story image */}
            <Image
              src={current.image}
              alt={current.alt}
              fill
              sizes="(max-width: 640px) 50vw, 280px"
              className="object-cover"
              priority={page === 0}
            />

            {/* Gradient scrim for text legibility */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/40 to-transparent"
            />

            {/* Overlay content */}
            <div className="relative flex h-full flex-col justify-between p-3">
              {/* Top row — STORY chip + page counter */}
              <div className="flex items-start justify-between">
                <div className="rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-primary shadow-soft">
                  Story
                </div>
                <div className="numeric rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold text-white/95 backdrop-blur-sm">
                  Page {page + 1} / {STORY_PAGES.length}
                </div>
              </div>

              {/* Page text at the bottom */}
              <p
                className="mt-auto font-display text-[12px] font-bold leading-[1.3] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
                dangerouslySetInnerHTML={{ __html: current.text }}
              />
            </div>
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

interface QuizSample {
  question: string;
  options: { label: string; correct?: boolean }[];
}

const QUIZ_SAMPLES: QuizSample[] = [
  {
    question: 'Which Indian state has the most tigers?',
    options: [
      { label: 'A. Karnataka' },
      { label: 'B. Madhya Pradesh', correct: true },
      { label: 'C. Kerala' },
    ],
  },
  {
    question: 'Which planet has the most moons?',
    options: [
      { label: 'A. Jupiter' },
      { label: 'B. Saturn', correct: true },
      { label: 'C. Neptune' },
    ],
  },
  {
    question: 'Which is the longest river in India?',
    options: [
      { label: 'A. Yamuna' },
      { label: 'B. Brahmaputra' },
      { label: 'C. Ganga', correct: true },
    ],
  },
];

function QuizTile() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((p) => (p + 1) % QUIZ_SAMPLES.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, []);

  const current = QUIZ_SAMPLES[idx]!;

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-indigo-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 shadow-soft">
          <span className="text-xs">🧠</span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-brand-secondary">
            Quiz Maker
          </span>
        </div>
        <div className="numeric text-[9px] font-bold text-brand-text-muted">
          Q{idx + 1}/{QUIZ_SAMPLES.length}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex flex-1 flex-col justify-between gap-1.5 pt-1.5"
        >
          <div className="font-display text-[11px] font-bold leading-snug text-brand-text">
            {current.question}
          </div>

          <div className="space-y-1">
            {current.options.map((o, i) => (
              <motion.div
                key={`${idx}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.08 }}
              >
                <AnswerRow label={o.label} correct={o.correct} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
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

// Images generated by Pollinations — comic-book panels with ink + halftone.
const COMIC_PANELS = [
  { src: '/images/hero-comic/panel-1.jpg', alt: 'Kid with lightbulb idea' },
  { src: '/images/hero-comic/panel-2.jpg', alt: 'Robot villain appears' },
  { src: '/images/hero-comic/panel-3.jpg', alt: 'Kid hero confronts the robot' },
  { src: '/images/hero-comic/panel-4.jpg', alt: 'Kids celebrating victory' },
];

function ComicsTile() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <div
      ref={ref}
      className="flex h-full min-h-0 flex-col gap-1.5 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-2.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 shadow-soft">
          <span className="text-xs">🎨</span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-brand-accent">
            Comics
          </span>
        </div>
        <div className="text-[9px] font-bold text-brand-text-muted">4 panels</div>
      </div>

      {/* 2×2 panel grid — panels pop in sequence on scroll-into-view */}
      <div className="grid flex-1 grid-cols-2 gap-1">
        {COMIC_PANELS.map((panel, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.78 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{
              duration: 0.45,
              delay: 0.15 + i * 0.18,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative overflow-hidden rounded-md ring-1 ring-black/20"
          >
            <Image
              src={panel.src}
              alt={panel.alt}
              fill
              sizes="(max-width: 640px) 20vw, 80px"
              className="object-cover"
            />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: 1.05 }}
        className="flex items-center gap-1 rounded-md bg-white px-2 py-1 shadow-soft"
      >
        <MessageCircle className="h-2.5 w-2.5 text-brand-accent" />
        <span className="truncate text-[9px] font-semibold text-brand-text">
          &ldquo;Not so fast, robot!&rdquo;
        </span>
      </motion.div>
    </div>
  );
}

// ── Tile: Game Studio ────────────────────────────────────────────────────────

interface GameScene {
  scene: number;
  prompt: string;
  primary: string;
  secondary: string;
}

const GAME_SCENES: GameScene[] = [
  { scene: 4, prompt: 'The cave is dark. The growl gets louder.', primary: '⚔ Fight', secondary: '🏃 Run' },
  { scene: 5, prompt: 'A locked door blocks your path forward.', primary: '🗝 Pick lock', secondary: '🔍 Find key' },
  { scene: 6, prompt: 'The dragon offers a curious deal.', primary: '🤝 Accept', secondary: '🚫 Refuse' },
];

function GamesTile() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((p) => (p + 1) % GAME_SCENES.length);
    }, 4800);
    return () => window.clearInterval(id);
  }, []);

  const current = GAME_SCENES[idx]!;

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 shadow-soft">
          <span className="text-xs">🎮</span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-brand-secondary">
            Game Studio
          </span>
        </div>
        <div className="numeric text-[9px] font-bold text-brand-text-muted">
          Scene {current.scene}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex flex-1 flex-col justify-between gap-2 pt-2"
        >
          <div className="font-display text-[11px] font-bold leading-snug text-brand-text">
            {current.prompt}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="rounded-md bg-brand-primary px-1.5 py-1 text-[9px] font-bold text-white shadow-button"
            >
              {current.primary}
            </button>
            <button
              type="button"
              className="rounded-md bg-white px-1.5 py-1 text-[9px] font-bold text-brand-text ring-1 ring-brand-border"
            >
              {current.secondary}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Tile: Kid CEO (flagship, NEW) ────────────────────────────────────────────

const KID_CEO_BARS = [0.35, 0.45, 0.3, 0.6, 0.55, 0.7, 0.85];

function KidCeoTile() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const revenue = useTriggeredCountUp(inView, 2480, 1500);

  return (
    <div ref={ref} className="relative flex h-full flex-col overflow-hidden">
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
          ₹{Math.round(revenue).toLocaleString('en-IN')}
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
          {KID_CEO_BARS.map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 origin-bottom rounded-sm bg-gradient-to-t from-brand-primary to-brand-ai"
              style={{ height: `${h * 100}%`, opacity: 0.5 + h * 0.5 }}
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{
                duration: 0.55,
                delay: 0.25 + i * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
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

// ── Tile: Beat the AI (half-width footer) ────────────────────────────────────

function BeatAiTile() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const kidScore = useTriggeredCountUp(inView, 92, 1300);
  const aiScore = useTriggeredCountUp(inView, 78, 1300);

  return (
    <div
      ref={ref}
      className="flex h-full flex-col justify-between bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 shadow-soft">
          <Bot className="h-3 w-3 text-purple-600" />
          <span className="text-[9px] font-bold uppercase tracking-wide text-purple-600">
            Beat the AI
          </span>
        </div>
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
          Maths Monday
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Kid side */}
        <div className="flex flex-1 items-center gap-1.5 rounded-md bg-white px-2 py-1.5 ring-1 ring-brand-secondary/30">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-brand-secondary to-emerald-400 text-[10px] font-bold text-white">
            A
          </div>
          <div className="min-w-0">
            <div className="text-[8px] font-semibold uppercase tracking-wide text-brand-text-muted">
              You
            </div>
            <div className="numeric text-[11px] font-extrabold text-brand-secondary">
              {Math.round(kidScore)}
            </div>
          </div>
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{
              duration: 0.5,
              delay: 1.35,
              type: 'spring',
              stiffness: 320,
              damping: 16,
            }}
            className="ml-auto rounded-full bg-brand-secondary/10 px-1 py-0.5 text-[8px] font-bold uppercase text-brand-secondary"
          >
            Win
          </motion.span>
        </div>

        <span className="text-[9px] font-bold text-brand-text-muted">vs</span>

        {/* AI side */}
        <div className="flex flex-1 items-center gap-1.5 rounded-md bg-white/60 px-2 py-1.5 ring-1 ring-brand-border">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
            <Bot className="h-2.5 w-2.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[8px] font-semibold uppercase tracking-wide text-brand-text-muted">
              Hard AI
            </div>
            <div className="numeric text-[11px] font-extrabold text-brand-text-secondary">
              {Math.round(aiScore)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className="truncate font-semibold text-brand-text">
          &ldquo;Show your working: 27 × 13&rdquo;
        </span>
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 1.55 }}
          className="ml-2 shrink-0 rounded-full bg-brand-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-brand-primary"
        >
          +50 XP
        </motion.span>
      </div>
    </div>
  );
}

// ── Tile: MindX Skill Arena (half-width footer) ──────────────────────────────

const MINDX_SKILLS = [
  { label: 'Speak', value: 0.82, color: 'from-cyan-500 to-blue-500' },
  { label: 'Listen', value: 0.65, color: 'from-emerald-500 to-teal-500' },
  { label: 'Think', value: 0.74, color: 'from-purple-500 to-indigo-500' },
  { label: 'Read', value: 0.58, color: 'from-amber-500 to-orange-500' },
];

function MindXTile() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div
      ref={ref}
      className="flex h-full flex-col justify-between bg-gradient-to-br from-cyan-50 via-white to-purple-50 p-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 shadow-soft">
          <Brain className="h-3 w-3 text-cyan-600" />
          <span className="text-[9px] font-bold uppercase tracking-wide text-cyan-600">
            MindX Arena
          </span>
        </div>
        <span className="rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
          Explorer
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {MINDX_SKILLS.map((skill, i) => (
          <MindXSkillBar
            key={skill.label}
            skill={skill}
            triggered={inView}
            delay={0.2 + i * 0.12}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className="truncate font-semibold text-brand-text">
          Next: Achiever band
        </span>
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.95, type: 'spring', stiffness: 280, damping: 18 }}
          className="ml-2 shrink-0 rounded-full bg-cyan-100 px-1.5 py-0.5 text-[9px] font-bold text-cyan-700"
        >
          Day 12 streak
        </motion.span>
      </div>
    </div>
  );
}

function MindXSkillBar({
  skill,
  triggered,
  delay,
}: {
  skill: (typeof MINDX_SKILLS)[number];
  triggered: boolean;
  delay: number;
}) {
  const [counting, setCounting] = useState(false);
  useEffect(() => {
    if (!triggered) return;
    const t = window.setTimeout(() => setCounting(true), delay * 1000);
    return () => window.clearTimeout(t);
  }, [triggered, delay]);
  const value = useTriggeredCountUp(counting, skill.value * 100, 900);

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-9 shrink-0 text-[9px] font-bold uppercase tracking-wide text-brand-text-secondary">
        {skill.label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-border/40">
        <motion.div
          className={`h-full origin-left rounded-full bg-gradient-to-r ${skill.color}`}
          style={{ width: `${skill.value * 100}%` }}
          initial={{ scaleX: 0 }}
          animate={triggered ? { scaleX: 1 } : {}}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="numeric w-6 shrink-0 text-right text-[9px] font-bold text-brand-text">
        {Math.round(value)}
      </span>
    </div>
  );
}
