'use client';

import { motion } from 'framer-motion';

interface SideBySideRevealProps {
  kidResponse: string;
  aiResponse: string;
  onJudge: () => void;
  isLoading: boolean;
}

export function SideBySideReveal({ kidResponse, aiResponse, onJudge, isLoading }: SideBySideRevealProps) {
  return (
    <div className="space-y-6">
      <p className="text-center text-sm font-medium text-gray-500">
        Both responses are in! Ready to see how you did?
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
          <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-gray-800">
            {kidResponse}
          </p>
        </motion.div>

        {/* AI's response */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-xl border-2 border-cyan-200 bg-cyan-50/50 p-4"
        >
          <h3 className="mb-2 text-sm font-bold text-cyan-700">AI Response</h3>
          <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-gray-800">
            {aiResponse}
          </p>
        </motion.div>
      </div>

      <motion.button
        onClick={onJudge}
        disabled={isLoading}
        className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-4 text-base font-bold text-white shadow-lg transition-all hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500"
        animate={isLoading ? {} : { scale: [1, 1.02, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        {isLoading ? 'AI is judging...' : 'Let the AI Judge!'}
      </motion.button>
    </div>
  );
}
