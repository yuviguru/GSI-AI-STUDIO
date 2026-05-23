'use client';

/**
 * Animated background: drifting blob orbs + tiny sparkling stars.
 * Pure CSS, no canvas, no JS particles. Respects prefers-reduced-motion.
 */
const STARS = [
  { top: '15%', left: '40%', size: 6, delay: '0s', color: 'bg-brand-primary/40' },
  { top: '25%', left: '70%', size: 4, delay: '.4s', color: 'bg-brand-ai/40' },
  { top: '55%', left: '15%', size: 6, delay: '.8s', color: 'bg-brand-accent/50' },
  { top: '75%', left: '55%', size: 4, delay: '1.2s', color: 'bg-brand-secondary/40' },
  { top: '20%', left: '85%', size: 6, delay: '1.6s', color: 'bg-brand-ai/40' },
  { top: '45%', left: '92%', size: 4, delay: '2s', color: 'bg-brand-primary/40' },
];

export function GameHubBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Drifting orbs */}
      <div className="animate-drift absolute left-[8%] top-[10%] h-64 w-64 rounded-full bg-brand-primary/10 blur-3xl" />
      <div className="animate-drift2 absolute right-[5%] top-[60%] h-72 w-72 rounded-full bg-brand-accent/10 blur-3xl" />
      <div className="animate-drift absolute right-[30%] top-[30%] h-48 w-48 rounded-full bg-brand-secondary/8 blur-3xl"
           style={{ animationDelay: '6s' }} />

      {/* Sparkling stars */}
      {STARS.map((s, i) => (
        <div
          key={i}
          className={`animate-sparkle absolute rounded-full ${s.color}`}
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}
