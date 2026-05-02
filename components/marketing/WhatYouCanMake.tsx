import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { HeroBento } from './HeroBento';

export function WhatYouCanMake() {
  return (
    <section id="studios" className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(91,95,255,0.15), rgba(32,201,151,0.08) 50%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-screen-xl px-5 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            What your child can make
          </p>
          <h2 className="mt-3 font-display text-[32px] font-extrabold leading-tight tracking-tight text-brand-text text-balance sm:text-[44px]">
            Two flagships. Eight studios. One playground.
          </h2>
          <p className="mt-4 text-body-lg leading-relaxed text-brand-text-secondary">
            Hover any tile to see what it does. Tap to try it.
          </p>
        </div>

        {/* Unified bento — flagships at top + studios below, all in one grid */}
        <div id="flagship" className="mt-14">
          <HeroBento />
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-caption text-brand-text-muted">
            More studios every month. App &amp; Chatbot Builder, Video Studio,
            Indian Language Mode — shipping in 2026.
          </p>
          <Link
            href="/explore"
            className="flex items-center gap-1.5 text-caption font-semibold text-brand-primary transition-all hover:gap-2.5"
          >
            See what others made
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
