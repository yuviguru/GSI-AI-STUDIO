'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowUp, Minus, Trophy, Sparkles } from 'lucide-react';
import { DIMENSION_LABELS } from '@/lib/ceo/constants';
import { Mascot } from '@/components/mascot/Mascot';
import { playSound } from '@/lib/sounds';
import type { CeoDimensionKey, CeoDimensionScores } from '@/types';

interface DecisionFeedbackProps {
  open: boolean;
  onClose: () => void;
  choiceText: string;
  feedback: string;
  scores: CeoDimensionScores;
  aiPointsEarned: number;
  milestoneResolved?: string | null;
  phaseAdvanced?: boolean;
  businessCompleted?: boolean;
}

export function DecisionFeedback({
  open,
  onClose,
  choiceText,
  feedback,
  scores,
  aiPointsEarned,
  milestoneResolved,
  phaseAdvanced,
  businessCompleted,
}: DecisionFeedbackProps) {
  useEffect(() => {
    if (!open) return undefined;
    playSound('creationComplete');
    if (milestoneResolved || phaseAdvanced || businessCompleted) {
      const t = setTimeout(() => playSound('celebrate'), 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, milestoneResolved, phaseAdvanced, businessCompleted]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-md rounded-3xl bg-white shadow-elevated p-6 space-y-4"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <div className="flex items-start gap-3">
              <Mascot expression={businessCompleted ? 'celebrating' : 'happy'} size="sm" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">You picked</p>
                <p className="text-sm italic text-slate-700">&ldquo;{choiceText}&rdquo;</p>
              </div>
            </div>

            <p className="text-base text-slate-800 leading-relaxed">{feedback}</p>

            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-slate-500">How this shifted your CEO DNA</p>
              {(Object.entries(scores) as [CeoDimensionKey, number][])
                .filter(([, v]) => Math.abs(v) > 0.1)
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .slice(0, 4)
                .map(([key, value]) => (
                  <DimensionRow key={key} dim={key} value={value} />
                ))}
            </div>

            {milestoneResolved && (
              <div className="rounded-xl bg-teal-50 text-teal-800 text-sm px-3 py-2 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Milestone complete: <span className="font-semibold">{milestoneResolved}</span>
              </div>
            )}
            {phaseAdvanced && (
              <div className="rounded-xl bg-indigo-50 text-indigo-800 text-sm px-3 py-2 font-medium">
                🎉 Phase complete — advancing to the next chapter!
              </div>
            )}
            {businessCompleted && (
              <div className="rounded-xl bg-orange-50 text-orange-800 text-sm px-3 py-2 font-medium">
                🏆 Simulation complete! Your CEO Profile is ready.
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> AI Points
              </span>
              <span className="font-bold">+{aiPointsEarned}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-3 hover:opacity-95 transition"
            >
              Got it!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DimensionRow({ dim, value }: { dim: CeoDimensionKey; value: number }) {
  const name = DIMENSION_LABELS[dim].name;
  const Icon = value > 0.1 ? ArrowUp : value < -0.1 ? ArrowDown : Minus;
  const color = value > 0.1 ? 'text-teal-600' : value < -0.1 ? 'text-rose-600' : 'text-slate-500';
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-700">{name}</span>
      <span className={`flex items-center gap-1 font-semibold ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        {value > 0 ? '+' : ''}
        {value.toFixed(1)}
      </span>
    </div>
  );
}
