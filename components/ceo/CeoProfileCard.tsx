'use client';

import { useState } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';
import { DIMENSION_LABELS, DIMENSIONS, PHASE_LABELS } from '@/lib/ceo/constants';
import { DimensionRadar } from './DimensionRadar';
import type { CeoBusiness, CeoDimensionKey, CeoProfile } from '@/types';

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
