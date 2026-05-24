'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { useResolvedIdentity } from '@/hooks/useResolvedIdentity';
import { playSound } from '@/lib/sounds';

interface HeroStageProps {
  resumeLabel?: string;
  resumeHref?: string;
}

export function HeroStage({ resumeLabel, resumeHref }: HeroStageProps) {
  const router = useRouter();
  // Resolve the user's chosen mascot — auth kid → anonymous onboarding →
  // Pixie default. NEVER hardcoded — the hub must always greet kids with
  // the buddy they picked.
  const { mascotId } = useResolvedIdentity();

  const handleResume = () => {
    if (!resumeHref) return;
    playSound('buttonTap');
    router.push(resumeHref);
  };

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg bg-gradient-to-r from-brand-primary to-brand-ai shadow-glass ring-1 ring-white/10"
      style={{ height: 220 }}
    >
      {/* Soft white glow behind the mascot — reads as a halo on the dark
          gradient instead of the previous primary-tinted glow on white. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[18%] top-1/2 h-[180px] w-[180px] -translate-y-1/2 animate-pulse-glow rounded-full bg-white/25 blur-2xl" />
      </div>

      <div className="relative flex h-full items-center gap-5 px-6">
        {/* Mascot column */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="relative z-10 drop-shadow-2xl">
            <MascotAvatar id={mascotId} size="2xl" animate />
          </div>
          {/* Spinning platform */}
          <div className="relative -mt-2 h-4 w-28">
            <div className="absolute inset-0 animate-platform-spin platform-ring" />
            <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/90 to-white/40" />
          </div>
        </div>

        {/* Content column */}
        <div className="relative z-10 min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="rounded-full bg-white/15 px-2.5 py-0.5 backdrop-blur-sm ring-1 ring-white/20">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                ⚡ Today&apos;s Quest
              </span>
            </div>
            <div className="rounded-full bg-amber-300/30 px-2.5 py-0.5 ring-1 ring-amber-200/40">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-100">
                +50 XP
              </span>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold leading-tight text-white">
            What will you{' '}
            <span className="bg-gradient-to-r from-amber-200 to-pink-200 bg-clip-text text-transparent">
              create
            </span>{' '}
            today?
          </h1>
          <p className="mt-1 text-xs text-white/75">
            Continue where you left off or pick a new studio.
          </p>

          {resumeLabel && resumeHref ? (
            <button
              onClick={handleResume}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 shadow-md ring-1 ring-white/40 transition-transform hover:scale-[1.03] active:scale-[0.97]"
            >
              <span className="text-sm">🎯</span>
              <span className="font-display text-xs font-bold uppercase tracking-wide text-brand-primary">
                Resume: {resumeLabel}
              </span>
              <ArrowRight
                className="h-3.5 w-3.5 text-brand-primary"
                strokeWidth={3}
              />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
