'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Creation, CreationType } from '@/types/creation.types';

interface RemixButtonProps {
  creation: Pick<Creation, 'id' | 'type' | 'prompt'>;
  className?: string;
  variant?: 'full' | 'compact';
}

const STUDIO_LINKS: Record<CreationType, string> = {
  story: '/create/story',
  music: '/create/music',
  quiz: '/create/quiz',
  game: '/create/game',
  comic: '/create/comic',
};

export function RemixButton({ creation, className, variant = 'full' }: RemixButtonProps) {
  const router = useRouter();

  const handleRemix = () => {
    const studioPath = STUDIO_LINKS[creation.type] ?? '/create/story';
    const params = new URLSearchParams({
      remix: creation.id,
      prompt: creation.prompt,
    });
    router.push(`${studioPath}?${params.toString()}`);
  };

  if (variant === 'compact') {
    return (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleRemix();
        }}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple transition-colors hover:bg-brand-purple/20',
          className
        )}
        aria-label="Remix this creation"
        title="Make your own version!"
      >
        <RemixIcon size={14} />
      </motion.button>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleRemix}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-full border-2 border-brand-purple py-3.5 font-display font-bold text-brand-purple transition-colors hover:bg-brand-purple/5 active:bg-brand-purple/10',
        className
      )}
      title="Make your own version!"
    >
      <RemixIcon size={18} />
      Remix This!
    </motion.button>
  );
}

function RemixIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
