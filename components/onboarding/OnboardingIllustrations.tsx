'use client';

import { motion } from 'framer-motion';
import { Mascot } from '@/components/mascot/Mascot';

const sparkles = [
  { emoji: '🌟', x: -80, y: -60, delay: 0 },
  { emoji: '✨', x: 70, y: -50, delay: 0.3 },
  { emoji: '💫', x: -60, y: 40, delay: 0.6 },
  { emoji: '⭐', x: 80, y: 30, delay: 0.2 },
  { emoji: '🌟', x: -30, y: -80, delay: 0.5 },
  { emoji: '✨', x: 40, y: 60, delay: 0.4 },
];

export function MeetKokoIllustration() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Floating sparkles */}
      {sparkles.map((s, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl"
          style={{ left: `calc(50% + ${s.x}px)`, top: `calc(50% + ${s.y}px)` }}
          animate={{ y: [0, -10, 0], opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        >
          {s.emoji}
        </motion.span>
      ))}

      <Mascot expression="waving" size="lg" bobbing />
    </div>
  );
}

const creationTypes = [
  { emoji: '📖', label: 'Stories', bg: 'bg-violet-100', rotate: -10 },
  { emoji: '🎵', label: 'Music', bg: 'bg-orange-100', rotate: -3 },
  { emoji: '🎮', label: 'Quizzes', bg: 'bg-cyan-100', rotate: 3 },
  { emoji: '🕹️', label: 'Games', bg: 'bg-emerald-100', rotate: 10 },
];

export function CreateThingsIllustration() {
  return (
    <div className="flex items-end justify-center gap-3">
      {creationTypes.map((item, i) => (
        <motion.div
          key={item.label}
          className={`${item.bg} flex flex-col items-center gap-2 rounded-2xl px-5 py-4 shadow-md`}
          initial={{ opacity: 0, y: 20, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: item.rotate }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
            delay: i * 0.15,
          }}
        >
          <span className="text-4xl">{item.emoji}</span>
          <span className="text-sm font-semibold text-gray-700">
            {item.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

const confettiDots = Array.from({ length: 16 }, (_, i) => ({
  x: Math.cos((i / 16) * Math.PI * 2) * 90,
  y: Math.sin((i / 16) * Math.PI * 2) * 90,
  color: ['bg-brand-purple', 'bg-brand-orange', 'bg-brand-cyan', 'bg-pink-400'][
    i % 4
  ],
  delay: i * 0.08,
  size: i % 3 === 0 ? 'h-3 w-3' : 'h-2 w-2',
}));

export function LetsGoIllustration() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Confetti dots */}
      {confettiDots.map((dot, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${dot.color} ${dot.size}`}
          style={{
            left: `calc(50% + ${dot.x}px)`,
            top: `calc(50% + ${dot.y}px)`,
          }}
          animate={{
            scale: [0, 1, 0.8, 1],
            opacity: [0, 1, 0.7, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: dot.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      <Mascot expression="celebrating" size="lg" bobbing />
    </div>
  );
}
