'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const STUDIOS = [
  {
    href: '/create/story',
    emoji: '📖',
    title: 'Language Modeling',
    bg: 'from-violet-200 via-purple-100 to-violet-50',
    rating: '4.8',
  },
  {
    href: '/create/quiz',
    emoji: '💡',
    title: 'Computer Science',
    bg: 'from-cyan-200 via-sky-100 to-cyan-50',
    rating: '4.8',
  },
  {
    href: '/create/music',
    emoji: '🎵',
    title: 'AI Fundamentals',
    bg: 'from-orange-200 via-rose-100 to-orange-50',
    rating: '4.8',
  },
];

export function PopularStudiosRow() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-gray-900">Popular courses</h3>
        <button className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base text-gray-400 shadow-card hover:text-gray-600">
          ≡
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {STUDIOS.map((s) => (
          <Link key={s.href} href={s.href} className="group block">
            <motion.div
              className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card"
              whileHover={{ y: -4, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Illustration */}
              <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${s.bg}`}>
                <span className="text-5xl">{s.emoji}</span>
              </div>

              <div className="px-2.5 pb-3 pt-2">
                <p className="font-display text-xs font-bold leading-tight text-gray-900">
                  {s.title}
                </p>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-sm text-amber-400">⭐</span>
                  <span className="font-mono text-xs font-semibold text-gray-500">{s.rating}</span>
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
