'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { BeatTheAiScores } from '@/types/beatTheAi.types';

interface SideBySideRevealProps {
  kidResponse: string;
  aiResponse: string;
  onRate: (kidScores: BeatTheAiScores, aiScores: BeatTheAiScores) => void;
  isLoading: boolean;
}

const CRITERIA = ['creativity', 'funFactor', 'accuracy', 'heart'] as const;
const CRITERIA_LABELS: Record<(typeof CRITERIA)[number], string> = {
  creativity: 'Creativity',
  funFactor: 'Fun Factor',
  accuracy: 'Accuracy',
  heart: 'Heart & Soul',
};

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-gray-600">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={`text-2xl transition-transform hover:scale-110 active:scale-95 ${
              star <= value ? 'text-amber-400' : 'text-gray-200'
            }`}
            aria-label={`${star} star`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

const emptyScores: BeatTheAiScores = { creativity: 0, funFactor: 0, accuracy: 0, heart: 0 };

export function SideBySideReveal({ kidResponse, aiResponse, onRate, isLoading }: SideBySideRevealProps) {
  const [kidScores, setKidScores] = useState<BeatTheAiScores>({ ...emptyScores });
  const [aiScores, setAiScores] = useState<BeatTheAiScores>({ ...emptyScores });

  const allRated = CRITERIA.every((c) => kidScores[c] > 0 && aiScores[c] > 0);

  return (
    <div className="space-y-6">
      <p className="text-center text-sm font-medium text-gray-500">
        Compare both responses and rate them honestly!
      </p>

      {/* Side by side cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Kid's response */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-xl border-2 border-purple-200 bg-purple-50/50 p-4"
        >
          <h3 className="mb-2 text-sm font-bold text-purple-700">Your Response</h3>
          <p className="mb-4 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-gray-800">
            {kidResponse}
          </p>
          <div className="space-y-1.5">
            {CRITERIA.map((c) => (
              <StarRating
                key={`kid-${c}`}
                value={kidScores[c]}
                onChange={(v) => setKidScores((s) => ({ ...s, [c]: v }))}
                label={CRITERIA_LABELS[c]}
              />
            ))}
          </div>
        </motion.div>

        {/* AI's response */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-xl border-2 border-cyan-200 bg-cyan-50/50 p-4"
        >
          <h3 className="mb-2 text-sm font-bold text-cyan-700">AI Response</h3>
          <p className="mb-4 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-gray-800">
            {aiResponse}
          </p>
          <div className="space-y-1.5">
            {CRITERIA.map((c) => (
              <StarRating
                key={`ai-${c}`}
                value={aiScores[c]}
                onChange={(v) => setAiScores((s) => ({ ...s, [c]: v }))}
                label={CRITERIA_LABELS[c]}
              />
            ))}
          </div>
        </motion.div>
      </div>

      <button
        onClick={() => onRate(kidScores, aiScores)}
        disabled={!allRated || isLoading}
        className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
      >
        {isLoading ? 'Calculating Results...' : allRated ? 'See Results!' : 'Rate all criteria first'}
      </button>
    </div>
  );
}
