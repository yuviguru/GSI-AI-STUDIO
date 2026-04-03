'use client';

import Link from 'next/link';
import { Brain } from 'lucide-react';

export function MindXWidget() {
  return (
    <Link href="/skill-arena" className="group block">
      <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100">
            <Brain className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold text-brand-text">MindX Skill Arena</h3>
            <p className="text-[11px] text-brand-text-secondary">Master how you talk to AI</p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-brand-text-muted">
          Sharpen your prompting skills. Speak, listen, think & read better to get the best out of AI.
        </p>

        <div className="mt-auto pt-3">
          <div className="rounded-xl bg-gradient-to-r from-brand-ai to-brand-secondary py-2 text-center text-xs font-bold text-white transition-transform group-hover:scale-[1.02]">
            Level Up
          </div>
        </div>
      </div>
    </Link>
  );
}
