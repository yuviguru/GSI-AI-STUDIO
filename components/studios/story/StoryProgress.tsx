'use client';

import { motion } from 'framer-motion';

interface StoryProgressProps {
  progressMessage: string;
  onCancel: () => void;
}

export function StoryProgress({ progressMessage, onCancel }: StoryProgressProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      {/* Animated illustrations */}
      <div className="relative flex items-end gap-2">
        <motion.span
          className="text-6xl"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          📖
        </motion.span>
        <motion.span
          className="text-4xl"
          animate={{ rotate: [0, -15, 15, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✏️
        </motion.span>
      </div>

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
            className="h-2.5 w-2.5 rounded-full bg-brand-purple"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      <p className="text-sm text-gray-400">This usually takes about 15 seconds</p>

      <button
        onClick={onCancel}
        className="mt-2 rounded-full border border-gray-300 px-6 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 active:scale-95"
      >
        Cancel
      </button>
    </div>
  );
}
