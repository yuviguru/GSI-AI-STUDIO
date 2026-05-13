'use client';

import Link from 'next/link';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { FOUNDATION_CARDS, cardIsUnlocked, type CardId } from '@/lib/learn/cards';
import { useLearnProgress } from '@/hooks/useLearnProgress';

/**
 * /learn — AI Lab landing. The platform's "fourth pillar" alongside
 * Create / Play / Explore (decision L1). Shows every Foundation card
 * day-1 (decision L2), with unlocked-vs-locked affordance based on
 * client-side visited progress.
 */
export default function LearnLandingPage() {
  const { visited } = useLearnProgress();
  const visitedCount = visited.size;
  const total = FOUNDATION_CARDS.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 px-4 py-12 text-white sm:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-amber-300 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            AI Lab
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Learn how the AI actually works
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-white/90 sm:text-xl">
            Every agent in Kid CEO runs on real AI tools. Here&apos;s what those
            tools actually do, in plain English, with things you can try
            yourself.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {visitedCount} / {total} concepts read
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FOUNDATION_CARDS.map((card) => {
            const unlocked = cardIsUnlocked(card.id, visited);
            const seen = visited.has(card.id);
            return (
              <CardTile key={card.id} id={card.id} seen={seen} unlocked={unlocked} />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CardTile({ id, seen, unlocked }: { id: CardId; seen: boolean; unlocked: boolean }) {
  const card = FOUNDATION_CARDS.find((c) => c.id === id)!;
  const content = (
    <article
      className={`flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition ${
        unlocked ? 'hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md' : 'opacity-70'
      }`}
      aria-labelledby={`card-${card.id}-title`}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <span className="text-3xl" aria-hidden="true">
          {card.emoji}
        </span>
        {seen ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Read
          </span>
        ) : !unlocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Locked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
            New
          </span>
        )}
      </header>
      <h2
        id={`card-${card.id}-title`}
        className="font-display text-lg font-bold text-slate-800"
      >
        {card.name}
      </h2>
      <p className="mt-1 flex-1 text-sm text-slate-600">{card.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {card.cbse.map((c) => (
          <span
            key={c}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
            title={`CBSE ${c}`}
          >
            {c}
          </span>
        ))}
      </div>
      {!unlocked && (
        <p className="mt-3 text-[11px] text-amber-700">
          Read {card.prerequisites.join(', ')} first.
        </p>
      )}
    </article>
  );
  if (!unlocked) return <div>{content}</div>;
  return (
    <Link href={`/learn/${card.id}`} className="block" aria-label={`Open ${card.name}`}>
      {content}
    </Link>
  );
}
