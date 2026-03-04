'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/create/story', label: 'Story', emoji: '📖' },
  { href: '/create/music', label: 'Music', emoji: '🎵' },
  { href: '/create/quiz', label: 'Quiz', emoji: '🎮' },
  { href: '/explore', label: 'Explore', emoji: '🔍' },
  { href: '/creations', label: 'My Stuff', emoji: '✨' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'border-t border-gray-100 bg-white/90 backdrop-blur-md',
        'safe-area-bottom',
      )}
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + '/');

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5',
                'text-xs font-medium transition-colors',
                isActive ? 'text-brand-purple' : 'text-gray-400',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="bottomnav-indicator"
                  className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-brand-purple"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="text-lg leading-none">{tab.emoji}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
