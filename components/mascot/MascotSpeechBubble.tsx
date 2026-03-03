'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Mascot, type MascotExpression } from './Mascot';

interface MascotSpeechBubbleProps {
  message: string;
  expression?: MascotExpression;
  size?: 'sm' | 'md' | 'lg';
  position?: 'right' | 'top';
  className?: string;
}

export function MascotSpeechBubble({
  message,
  expression = 'happy',
  size = 'md',
  position = 'right',
  className = '',
}: MascotSpeechBubbleProps) {
  const isRight = position === 'right';

  return (
    <div
      className={`flex items-center gap-3 ${
        isRight ? 'flex-col sm:flex-row' : 'flex-col'
      } ${className}`}
    >
      <Mascot expression={expression} size={size} bobbing />

      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative rounded-2xl bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-md"
        >
          {/* Triangle pointer */}
          <div
            className={
              isRight
                ? 'absolute -left-2 top-1/2 hidden h-3 w-3 -translate-y-1/2 rotate-45 bg-white shadow-md sm:block'
                : 'absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white shadow-md'
            }
          />
          <span className="relative z-10">{message}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
