'use client';

import { useState } from 'react';
import { AlertCircle, Copy, Download, Quote, Share2, Sparkles, TrendingUp } from 'lucide-react';
import { DIMENSION_LABELS, DIMENSIONS, PHASE_LABELS } from '@/lib/ceo/constants';
import { DimensionRadar } from './DimensionRadar';
import type {
  CeoAdvisor,
  CeoBusiness,
  CeoDimensionKey,
  CeoDramaticMoment,
  CeoEndingReport,
  CeoProfile,
  CeoRealWorldParallel,
} from '@/types';

interface CeoProfileCardProps {
  business: Pick<
    CeoBusiness,
    'businessName' | 'businessType' | 'currentCash' | 'reputation' | 'morale' | 'phase' | 'totalDecisions'
  >;
  profile: CeoProfile;
  shareUrl?: string;
  canShare?: boolean;
  onTogglePublic?: (isPublic: boolean) => Promise<void>;
  onDownloadPng?: () => void;
}

export function CeoProfileCard({
  business,
  profile,
  shareUrl,
  canShare = false,
  onTogglePublic,
  onDownloadPng,
}: CeoProfileCardProps) {
  const [copying, setCopying] = useState(false);
  const [toggling, setToggling] = useState(false);

  const dominant = findDominant(profile.dimensions);
  const dominantName = dominant ? DIMENSION_LABELS[dominant].name : 'Balanced';
  const isPublic = profile.isPublic;
  const fullShareLink = shareUrl
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/ceo/profile/${shareUrl}`
    : '';

  const ending = profile.ending;

  const handleCopy = async () => {
    if (!fullShareLink) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(fullShareLink);
    } finally {
      setTimeout(() => setCopying(false), 1200);
    }
  };

  const handleToggle = async () => {
    if (!onTogglePublic) return;
    setToggling(true);
    try {
      await onTogglePublic(!isPublic);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-elevated p-6 max-w-2xl mx-auto space-y-6">
      <header className="text-center space-y-1">
        <p className="text-xs uppercase tracking-widest text-indigo-600 font-semibold">Kid CEO Profile</p>
        <h1 className="text-2xl md:text-3xl font-bold font-display">{business.businessName}</h1>
        <div className="inline-flex items-center gap-2 text-sm">
          <span className="capitalize text-slate-600">{business.businessType.replace('_', ' ')}</span>
          <span className="text-slate-300">·</span>
          <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-medium">
            {PHASE_LABELS[business.phase]}
          </span>
        </div>
      </header>

      <div className="flex justify-center">
        <DimensionRadar dimensions={profile.dimensions} size="lg" />
      </div>

      <div className="text-center">
        <p className="text-sm text-slate-600">Your strongest trait</p>
        <p className="text-xl font-bold text-indigo-600">{dominantName}</p>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <Stat label="Decisions" value={String(business.totalDecisions)} />
        <Stat label="Cash" value={`₹${business.currentCash.toLocaleString('en-IN')}`} />
        <Stat label="Rep" value={`${business.reputation}`} />
        <Stat label="Morale" value={`${business.morale}`} />
      </div>

      {ending && <EndingReportSections ending={ending} />}

      {canShare ? (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Share your profile</span>
            <button
              type="button"
              onClick={handleToggle}
              disabled={toggling}
              className={`text-xs font-semibold rounded-full px-3 py-1 min-h-[28px] ${
                isPublic ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isPublic ? 'Public' : 'Private'}
            </button>
          </div>
          {isPublic && shareUrl && (
            <div className="flex flex-col sm:flex-row gap-2 items-stretch">
              <div className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-600 truncate">
                {fullShareLink}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-2 min-h-[40px]"
              >
                <Copy className="h-3.5 w-3.5" />
                {copying ? 'Copied!' : 'Copy'}
              </button>
              {onDownloadPng && (
                <button
                  type="button"
                  onClick={onDownloadPng}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 text-white text-xs font-semibold px-3 py-2 min-h-[40px]"
                >
                  <Download className="h-3.5 w-3.5" />
                  PNG
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <footer className="flex items-center justify-center gap-1 text-xs text-slate-500">
          <Share2 className="h-3 w-3" />
          Shared via GSI AI Studio
        </footer>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}

function findDominant(dims: CeoProfile['dimensions']): CeoDimensionKey | null {
  let best: CeoDimensionKey | null = null;
  let bestScore = -Infinity;
  for (const key of DIMENSIONS) {
    const s = dims[key]?.score ?? 50;
    if (s > bestScore) {
      bestScore = s;
      best = key;
    }
  }
  return best;
}

// ─── Ending report sections ──────────────────────────────────

function EndingReportSections({ ending }: { ending: CeoEndingReport }) {
  return (
    <div className="space-y-6 border-t border-slate-200 pt-6">
      <HowItEndedBlock text={ending.howItEnded} />
      <YourStyleBlock style={ending.style} />
      {ending.advisors.length > 0 && <AdvisorsBlock advisors={ending.advisors} />}
      {ending.dramaticMoments.length > 0 && <BigMomentsBlock moments={ending.dramaticMoments} />}
      {ending.parallels.length > 0 && <ParallelsBlock parallels={ending.parallels} />}
    </div>
  );
}

function HowItEndedBlock({ text }: { text: string }) {
  return (
    <section className="rounded-2xl bg-white/80 p-4 border-l-4 border-indigo-500 shadow-sm">
      <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-semibold mb-2">
        How It Ended
      </p>
      <p className="font-display text-lg font-semibold text-slate-800 leading-snug">{text}</p>
    </section>
  );
}

function YourStyleBlock({
  style,
}: {
  style: CeoEndingReport['style'];
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-bold font-display text-slate-800">Your Style</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/80 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Strengths
          </div>
          <div className="flex flex-wrap gap-2">
            {style.strengths.map((s) => (
              <span
                key={s}
                className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white/80 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
            <TrendingUp className="h-3.5 w-3.5" />
            Growing In
          </div>
          <div className="flex flex-wrap gap-2">
            {style.growthAreas.map((g) => (
              <span
                key={g}
                className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="flex items-start gap-2 text-sm italic text-slate-600">
          <Quote className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
          <span>You tended to: {style.yourTendency}</span>
        </p>
        <p className="flex items-start gap-2 text-sm italic text-slate-600">
          <Quote className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
          <span>You tended to skip: {style.blindSpot}</span>
        </p>
      </div>
    </section>
  );
}

function AdvisorsBlock({ advisors }: { advisors: CeoAdvisor[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold font-display text-slate-800">Advisors</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 -mx-1 px-1 snap-x snap-mandatory md:snap-none">
        {advisors.map((advisor, idx) => (
          <AdvisorCard key={`${advisor.name}-${idx}`} advisor={advisor} />
        ))}
      </div>
    </section>
  );
}

function AdvisorCard({ advisor }: { advisor: CeoAdvisor }) {
  const toneClasses: Record<CeoAdvisor['tone'], string> = {
    warm: 'bg-amber-50 border-amber-200',
    sharp: 'bg-indigo-50 border-indigo-200',
    playful: 'bg-rose-50 border-rose-200',
  };
  const toneIcons: Record<CeoAdvisor['tone'], string> = {
    warm: 'Warm',
    sharp: 'Sharp',
    playful: 'Playful',
  };
  const toneEmoji: Record<CeoAdvisor['tone'], string> = {
    warm: 'sun',
    sharp: 'target',
    playful: 'balloon',
  };
  const emojiMap: Record<string, string> = {
    sun: '\u2600\uFE0F',
    target: '\uD83C\uDFAF',
    balloon: '\uD83C\uDF88',
  };
  return (
    <div
      className={`min-w-[240px] md:min-w-0 snap-start rounded-2xl border p-4 flex-1 space-y-2 ${toneClasses[advisor.tone]}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none" aria-hidden="true">
          {emojiMap[toneEmoji[advisor.tone]]}
        </span>
        <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">
          {toneIcons[advisor.tone]}
        </span>
      </div>
      <h3 className="text-sm font-bold font-display text-slate-800 leading-tight">{advisor.name}</h3>
      <p className="text-xs text-slate-700 leading-relaxed">{advisor.advice}</p>
    </div>
  );
}

function BigMomentsBlock({ moments }: { moments: CeoDramaticMoment[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold font-display text-slate-800">Big Moments</h2>
      <ol className="relative space-y-4 pl-6">
        <span
          aria-hidden="true"
          className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-200"
        />
        {moments.map((moment) => (
          <MomentCard key={moment.eventId} moment={moment} />
        ))}
      </ol>
    </section>
  );
}

function MomentCard({ moment }: { moment: CeoDramaticMoment }) {
  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className="absolute -left-6 top-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white border-2 border-indigo-400"
      >
        <AlertCircle className="h-2.5 w-2.5 text-indigo-500" />
      </span>
      <div className="rounded-2xl bg-white/80 p-4 space-y-2 shadow-sm">
        <h3 className="text-sm font-bold font-display text-slate-800">{moment.headline}</h3>
        <p className="text-xs text-slate-700 leading-relaxed">{moment.whatHappened}</p>
        <p className="text-xs italic text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
          {moment.takeaway}
        </p>
        {(moment.cashDelta !== 0 || moment.reputationDelta !== 0) && (
          <div className="flex flex-wrap gap-3 text-[11px] font-semibold pt-1">
            {moment.cashDelta !== 0 && (
              <span className={moment.cashDelta > 0 ? 'text-emerald-600' : 'text-red-600'}>
                Cash {formatDelta(moment.cashDelta, true)}
              </span>
            )}
            {moment.reputationDelta !== 0 && (
              <span className={moment.reputationDelta > 0 ? 'text-emerald-600' : 'text-red-600'}>
                Rep {formatDelta(moment.reputationDelta, false)}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function formatDelta(value: number, isCash: boolean): string {
  const sign = value > 0 ? '+' : '\u2212';
  const abs = Math.abs(value);
  if (isCash) {
    return `${sign}\u20B9${abs.toLocaleString('en-IN')}`;
  }
  return `${sign}${abs}`;
}

function ParallelsBlock({ parallels }: { parallels: CeoRealWorldParallel[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold font-display text-slate-800">Real-World Parallels</h2>
      <div className="space-y-3">
        {parallels.map((parallel, idx) => (
          <ParallelCard key={`${parallel.archetype}-${idx}`} parallel={parallel} />
        ))}
      </div>
    </section>
  );
}

function ParallelCard({ parallel }: { parallel: CeoRealWorldParallel }) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 space-y-2 shadow-sm">
      <h3 className="text-sm font-bold font-display text-slate-800">{parallel.archetype}</h3>
      <p className="text-xs text-slate-700 leading-relaxed">{parallel.parallel}</p>
      <p className="text-xs italic text-indigo-800 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg px-3 py-2">
        {parallel.takeaway}
      </p>
    </div>
  );
}
