'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MascotAvatar } from './MascotAvatar';

/**
 * PixieFloatingBubble — Pixie's in-app presence: a persistent corner avatar
 * with a contextual speech bubble that emerges when there's something to say.
 *
 * Usage:
 *  - In-app: wrap any studio/dashboard layout. Drives `message` from the
 *    current screen state (idle, output ready, kid stuck, etc.). When idle
 *    leave `message` undefined and only the avatar shows.
 *  - Marketing hero: drop into the mock-screen overlay; cycle `message` per
 *    scene to demonstrate the in-app pattern.
 *
 * The avatar bobs gently on idle. The speech bubble emerges from Pixie with
 * a tail pointing back to her so the kid always knows who's talking.
 */

interface PixieFloatingBubbleProps {
  /** Message Pixie is currently saying. When undefined, only the avatar shows. */
  message?: string;
  /** Optional click handler — opens chat panel in app, or no-op in marketing demo. */
  onTap?: () => void;
  /** Avatar size. 'lg' (~80px) is the in-app default; 'md' for tighter contexts. */
  avatarSize?: 'md' | 'lg' | 'xl';
  /** Override the absolute positioning. Default sticks to bottom-right of parent. */
  className?: string;
}

export function PixieFloatingBubble({
  message,
  onTap,
  avatarSize = 'lg',
  className,
}: PixieFloatingBubbleProps) {
  return (
    <div
      className={
        className ??
        'pointer-events-none absolute bottom-3 right-3 z-20 flex items-end justify-end gap-2 sm:bottom-4 sm:right-4'
      }
    >
      {/* Speech bubble — appears to the left of Pixie, tail pointing right */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.35, type: 'spring', stiffness: 280, damping: 22 }}
            className="pointer-events-auto relative max-w-[200px] rounded-2xl rounded-br-md bg-white px-3 py-2 shadow-card ring-1 ring-brand-border/60 sm:max-w-[230px]"
          >
            <div className="text-[9px] font-bold uppercase tracking-wide text-cyan-700">
              Pixie
            </div>
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-brand-text sm:text-[12px]">
              {message}
            </p>
            {/* Tail — points right toward Pixie */}
            <div
              aria-hidden
              className="absolute -bottom-1.5 right-3 h-3 w-3 rotate-45 bg-white ring-1 ring-brand-border/60"
              style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pixie avatar — always present */}
      <motion.button
        type="button"
        onClick={onTap}
        aria-label="Open chat with Pixie"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-auto relative flex shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-elevated ring-2 ring-cyan-200 transition-shadow hover:ring-cyan-300"
      >
        <MascotAvatar id="pixie" size={avatarSize} />
        {/* Pulsing online indicator */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500 ring-2 ring-white" />
        </span>
      </motion.button>
    </div>
  );
}
