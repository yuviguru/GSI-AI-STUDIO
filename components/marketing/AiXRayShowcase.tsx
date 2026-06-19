'use client';

import { motion } from 'framer-motion';
import { Sparkles, BookOpen, Brain, Lightbulb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';

interface ConceptProps {
  icon: LucideIcon;
  title: string;
  body: string;
  delay: number;
}

const CONCEPTS: Omit<ConceptProps, 'delay'>[] = [
  {
    icon: BookOpen,
    title: 'AI stops being magic',
    body: "Your kid sees which tool did what — and why a different one would have been wrong. The end of \"AI just does it.\"",
  },
  {
    icon: Brain,
    title: 'They learn to direct it',
    body: "Where the AI guessed, what it picked, what it missed. The exact skill kids will need to lead with AI — not be replaced by it.",
  },
  {
    icon: Lightbulb,
    title: 'Playtime counts as homework',
    body: 'Every X-Ray quietly closes a CBSE concept off the syllabus — so the hours they were going to spend creating anyway, count.',
  },
];

export function AiXRayShowcase() {
  return (
    <section id="x-ray" className="relative overflow-hidden bg-white py-20 sm:py-28">
      {/* Ambient */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(32,201,151,0.20), rgba(91,95,255,0.10) 50%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-screen-xl px-5 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
          {/* Left: copy */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft">
                <MascotAvatar id="pixie" size="md" ariaLabel="Pixie illustrating an X-Ray" />
              </div>
              <p className="text-caption font-semibold uppercase tracking-wide text-brand-secondary">
                The parent&apos;s favourite feature
              </p>
            </div>
            <h2 className="mt-4 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
              Your kid finishes a story — and walks away knowing how AI actually works.
            </h2>
            <p className="mt-4 text-body-lg leading-relaxed text-brand-text-secondary">
              We call it <strong className="font-semibold text-brand-text">AI X-Ray</strong>.
              Thirty seconds at the end of every creation that turns "wow, the AI
              did it" into "this is exactly what the AI did, and here's where I
              could push it harder next time." Mapped to the CBSE concept they
              owe their teacher.
            </p>

            {/* Concept list */}
            <div className="mt-8 space-y-5">
              {CONCEPTS.map((c, i) => {
                const Icon = c.icon;
                return (
                  <motion.div
                    key={c.title}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex gap-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-brand-text">
                        {c.title}
                      </h3>
                      <p
                        className="mt-1 text-caption leading-relaxed text-brand-text-secondary"
                        dangerouslySetInnerHTML={{ __html: c.body }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Curriculum callout */}
            <div className="mt-8 flex items-start gap-3 rounded-2xl bg-brand-soft p-4 ring-1 ring-brand-primary/15">
              <Sparkles className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-primary" />
              <p className="text-caption leading-relaxed text-brand-text">
                <strong className="font-semibold">24 CBSE-aligned concepts</strong>{' '}
                are unlocked progressively as your child creates — from
                &ldquo;What is a prompt?&rdquo; in Class 3 to &ldquo;How do models
                handle bias?&rdquo; in Class 10.
              </p>
            </div>
          </div>

          {/* Right: enlarged X-Ray visual */}
          <div className="relative">
            {/* Background card */}
            <div className="absolute inset-4 rounded-3xl bg-gradient-to-br from-brand-ai/10 via-white to-brand-primary/10" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl bg-white p-6 shadow-elevated ring-1 ring-brand-border/60 sm:p-7"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-ai to-brand-primary text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-base font-bold text-brand-text">
                    AI X-Ray
                  </div>
                  <div className="text-caption text-brand-text-muted">
                    Story Studio · 30 seconds
                  </div>
                </div>
                <div className="ml-auto rounded-full bg-brand-secondary/10 px-3 py-1 text-[11px] font-bold text-brand-secondary">
                  +15 AI Points
                </div>
              </div>

              {/* Prompt */}
              <div className="mt-5 rounded-2xl bg-brand-background p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-text-muted">
                  What you asked for
                </div>
                <p className="mt-1.5 text-body text-brand-text">
                  &ldquo;A brave dosa that saved Chennai from a robot monster&rdquo;
                </p>
              </div>

              {/* Steps */}
              <div className="mt-4 space-y-3">
                <XRayStep
                  num={1}
                  label="Understood the prompt"
                  value="Claude read your story idea, identified the hero (dosa), villain (robot), and setting (Chennai)."
                  delay={0.2}
                />
                <XRayStep
                  num={2}
                  label="Wrote the narrative"
                  value="Generated a 6-page story with a beginning, challenge and resolution — safe for age 8–12."
                  delay={0.35}
                />
                <XRayStep
                  num={3}
                  label="Drew the illustrations"
                  value="Replicate SDXL turned your text into 6 colourful images using a cartoon style preset."
                  delay={0.5}
                  accent
                />
              </div>

              {/* Footer */}
              <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-ai/10 to-brand-primary/10 p-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                    Concept unlocked
                  </div>
                  <div className="mt-0.5 font-display text-sm font-bold text-brand-text">
                    Text-to-Image Generation · Class 5
                  </div>
                </div>
                <div className="numeric text-caption text-brand-text-muted">
                  CBSE AI-3.2
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function XRayStep({
  num,
  label,
  value,
  delay,
  accent = false,
}: {
  num: number;
  label: string;
  value: string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.4, delay }}
      className="flex gap-3 rounded-xl border border-brand-border bg-white p-3"
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${
          accent
            ? 'bg-brand-ai text-white'
            : 'bg-brand-soft text-brand-primary'
        }`}
      >
        {num}
      </div>
      <div className="min-w-0">
        <div className="font-display text-caption font-bold text-brand-text">
          {label}
        </div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-brand-text-secondary">
          {value}
        </div>
      </div>
    </motion.div>
  );
}
