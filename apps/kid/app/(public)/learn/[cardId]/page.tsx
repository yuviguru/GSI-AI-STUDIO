'use client';

import { useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { FOUNDATION_CARDS, getCard, type CardId } from '@/lib/learn/cards';
import { useLearnProgress } from '@/hooks/useLearnProgress';
import { FoundationCardEmbed } from '@/components/learn/FoundationCardEmbed';

/**
 * /learn/:cardId — single Foundation card detail page. Plain-English
 * explainer + a "Try it" embed (HF Space iframe, Transformers.js
 * in-browser demo, or explainer-only depending on card.embed).
 *
 * Opening the page marks the card as visited (client-side only per
 * L2) which unlocks any card that prerequisites it.
 */
export default function FoundationCardPage() {
  const params = useParams<{ cardId: string }>();
  const cardId = params?.cardId as CardId;
  const card = getCard(cardId);
  const { visited, markVisited } = useLearnProgress();

  useEffect(() => {
    if (card) markVisited(card.id);
  }, [card, markVisited]);

  if (!card) {
    // Notify the router so the 404 renders; using a side-effect-free
    // call is safe inside a client component per Next.js docs.
    notFound();
  }

  const currentIdx = FOUNDATION_CARDS.findIndex((c) => c.id === card.id);
  const nextCard = FOUNDATION_CARDS.slice(currentIdx + 1).find((c) =>
    c.prerequisites.every((pre) => visited.has(pre) || pre === card.id),
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <article>
          <header className="mb-6 flex items-start gap-4">
            <span className="text-5xl" aria-hidden="true">
              {card.emoji}
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-800 sm:text-4xl">
                {card.name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">{card.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {card.cbse.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                    title={`CBSE strand ${c}`}
                  >
                    {c}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Read
                </span>
              </div>
            </div>
          </header>

          <section
            aria-labelledby="explainer-heading"
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <h2
              id="explainer-heading"
              className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Plain English
            </h2>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed">
              {card.explainer.split('. ').map((sentence, i) => (
                <p key={i}>{sentence.endsWith('.') ? sentence : `${sentence}.`}</p>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="try-it-heading"
            className="mt-5 rounded-3xl bg-white p-5 shadow-sm"
          >
            <h2
              id="try-it-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Try it
            </h2>
            <FoundationCardEmbed embed={card.embed} />
          </section>

          {nextCard ? (
            <Link
              href={`/learn/${nextCard.id}`}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3 text-sm font-display font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Next up: {nextCard.name}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              You&apos;ve read everything for now. More cards land as we publish them.
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
