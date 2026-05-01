'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Eye, MessageSquare, Cpu, Image as ImageIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeneratedAvatar } from './AvatarBuilderStep';

interface XrayTeachingStepProps {
  avatar: GeneratedAvatar;
  kidName: string;
  mascotName: string;
  onNext: () => void;
  onBack: () => void;
}

interface XrayPanel {
  id: string;
  icon: typeof Eye;
  title: string;
  body: string;
  highlight: string;
}

function buildPanels(avatar: GeneratedAvatar, mascotName: string): XrayPanel[] {
  return [
    {
      id: 'prompt',
      icon: MessageSquare,
      title: 'Your choices became words',
      body: `${mascotName} took your picks (${avatar.traits.hair} hair, ${avatar.traits.vibe} vibe, ${avatar.traits.outfit}) and turned them into a sentence the AI can read. This is called a "prompt".`,
      highlight: avatar.prompt,
    },
    {
      id: 'model',
      icon: Cpu,
      title: 'An AI model read the prompt',
      body: 'The AI is a giant pattern-finder. It has seen millions of cartoon drawings before. It uses what it learned to imagine what you described.',
      highlight: 'CBSE concept: Generative AI · Image Generation',
    },
    {
      id: 'pixels',
      icon: ImageIcon,
      title: 'It painted pixels, one tiny dot at a time',
      body: 'Starting with random noise, the AI cleaned it up step by step until your avatar appeared. No real artist drew this — but it learned from real artists.',
      highlight: '512 × 512 pixels · ~30 seconds of AI thinking',
    },
    {
      id: 'you',
      icon: Sparkles,
      title: 'You’re the boss, the AI is the brush',
      body: 'Different choices = different avatar. The AI never decides for you. The more clearly you describe what you want, the better it draws. This is called "prompt engineering".',
      highlight: 'You just earned 10 AI Points for finishing your first lesson! 🎉',
    },
  ];
}

export function XrayTeachingStep({
  avatar,
  kidName,
  mascotName,
  onNext,
  onBack,
}: XrayTeachingStepProps) {
  const panels = buildPanels(avatar, mascotName);
  const [index, setIndex] = useState(0);
  const panel = panels[index]!;
  const isLast = index === panels.length - 1;

  function next() {
    if (isLast) {
      onNext();
    } else {
      setIndex(index + 1);
    }
  }

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
          Step 4 of 4 · AI X-Ray
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-gray-900">
          How did the AI draw {kidName}?
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Every creation in GSI comes with one of these.
        </p>
      </div>

      {/* Avatar + X-ray scan animation */}
      <div className="mt-4 flex justify-center">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar.imageUrl}
            alt="Your avatar"
            className="h-32 w-32 rounded-3xl object-cover shadow-md"
          />
          <motion.div
            className="absolute inset-0 overflow-hidden rounded-3xl"
            aria-hidden
          >
            <motion.div
              key={index}
              initial={{ y: '-100%' }}
              animate={{ y: '100%' }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
              className="h-full w-full bg-gradient-to-b from-transparent via-emerald-300/40 to-transparent"
            />
          </motion.div>
          <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
            <Eye className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Panel content */}
      <div className="mt-5 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={panel.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <panel.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-bold text-gray-900">
                  {panel.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  {panel.body}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {panel.id === 'prompt'
                  ? 'The actual prompt'
                  : panel.id === 'model'
                    ? 'CBSE link'
                    : panel.id === 'pixels'
                      ? 'Behind the scenes'
                      : 'Reward'}
              </p>
              <p
                className={cn(
                  'mt-1 leading-relaxed',
                  panel.id === 'prompt'
                    ? 'font-mono text-xs text-gray-700'
                    : 'text-sm text-gray-700',
                )}
              >
                {panel.highlight}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="mt-4 flex justify-center gap-1.5">
        {panels.map((p, i) => (
          <motion.div
            key={p.id}
            className={cn(
              'h-1.5 rounded-full transition-colors',
              i === index ? 'bg-emerald-500' : i < index ? 'bg-emerald-300' : 'bg-gray-200',
            )}
            animate={{ width: i === index ? 24 : 8 }}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => (index === 0 ? onBack() : setIndex(index - 1))}
          className="rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={next}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
        >
          {isLast ? 'I’m ready! ✨' : 'Got it'}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
