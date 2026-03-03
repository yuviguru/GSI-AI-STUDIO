'use client';

import { motion } from 'framer-motion';
import { Mascot } from '@/components/mascot/Mascot';

interface QuizProgressProps {
  progressMessage: string;
  onCancel: () => void;
}

export function QuizProgress({ progressMessage, onCancel }: QuizProgressProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      {/* Mascot — thinking expression */}
      <Mascot expression="thinking" size="md" bobbing />

      {/* Progress message */}
      <motion.p
        key={progressMessage}
        className="text-center font-display text-lg font-semibold text-gray-700"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
      >
        {progressMessage}
      </motion.p>

      {/* Animated dots */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-brand-cyan"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      <p className="text-sm text-gray-400">This usually takes about 10 seconds</p>

      <button
        onClick={onCancel}
        className="mt-2 rounded-full border border-gray-300 px-6 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 active:scale-95"
      >
        Cancel
      </button>
    </div>
  );
}
