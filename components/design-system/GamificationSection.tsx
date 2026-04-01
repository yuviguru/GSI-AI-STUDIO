'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export function GamificationSection() {
  const [progressValue, setProgressValue] = useState(65);

  return (
    <section id="gamification" className="scroll-mt-28">
      <h2 className="text-h2 font-display text-brand-text mb-2">Gamification</h2>
      <p className="text-body-lg text-brand-text-secondary mb-8">
        Gamification is a core system component. Every action gives feedback.
      </p>

      {/* XP Progress Bars */}
      <h3 className="text-h4 font-display text-brand-text mb-4">XP Progress Bars</h3>
      <div className="rounded-xl border border-brand-border bg-white p-6 mb-8">
        <div className="space-y-6">
          {/* Compact */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-body font-medium text-brand-text">Compact (8px)</span>
              <span className="font-mono text-caption text-brand-text-secondary">{progressValue}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressValue}%` }} />
            </div>
          </div>

          {/* Standard */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-body font-medium text-brand-text">Standard (12px)</span>
              <span className="font-mono text-caption text-brand-text-secondary">{progressValue}%</span>
            </div>
            <div className="progress-bar" style={{ height: '12px' }}>
              <div className="progress-bar-fill" style={{ width: `${progressValue}%` }} />
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {[0, 25, 50, 75, 100].map((v) => (
              <button
                key={v}
                onClick={() => setProgressValue(v)}
                className={cn(
                  'text-caption font-medium rounded-full px-3 py-1 transition-colors',
                  progressValue === v
                    ? 'bg-brand-primary text-white'
                    : 'bg-brand-soft text-brand-text-secondary hover:text-brand-primary'
                )}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Level Badges */}
      <h3 className="text-h4 font-display text-brand-text mb-4">Level Badges</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { level: 1, title: 'AI Starter', gradient: 'from-gray-400 to-gray-500' },
          { level: 3, title: 'AI Explorer', gradient: 'from-brand-secondary to-brand-primary' },
          { level: 5, title: 'AI Creator', gradient: 'from-brand-primary to-brand-ai' },
          { level: 10, title: 'AI Master', gradient: 'from-brand-accent to-yellow-400' },
        ].map((badge) => (
          <div
            key={badge.level}
            className="flex flex-col items-center gap-2 rounded-xl border border-brand-border bg-white p-5 transition-all hover:shadow-soft hover:-translate-y-1"
          >
            <div className={cn(
              'h-16 w-16 rounded-full flex items-center justify-center text-white font-mono font-bold text-xl bg-gradient-to-br',
              badge.gradient
            )}>
              {badge.level}
            </div>
            <div className="text-center">
              <p className="font-display text-sm font-semibold text-brand-text">Level {badge.level}</p>
              <p className="text-caption text-brand-text-secondary">{badge.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Achievement Cards */}
      <h3 className="text-h4 font-display text-brand-text mb-4">Achievement Cards</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Unlocked */}
        <div className="rounded-xl border-2 border-[#FFD166] bg-white p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1"
          style={{ boxShadow: '0 10px 25px rgba(255,209,102,0.2)' }}
        >
          <div className="text-4xl mb-3">🎨</div>
          <p className="font-display text-sm font-semibold text-brand-text">First Creation</p>
          <p className="text-caption text-brand-text-secondary mb-2">Made your first AI creation</p>
          <p className="font-mono text-caption font-medium text-brand-accent">+200 XP</p>
          <span className="inline-block mt-2 text-caption font-semibold text-brand-secondary bg-brand-secondary/10 rounded-full px-2 py-0.5">
            Earned ✓
          </span>
        </div>

        {/* Unlocked 2 */}
        <div className="rounded-xl border-2 border-[#FFD166] bg-white p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1"
          style={{ boxShadow: '0 10px 25px rgba(255,209,102,0.2)' }}
        >
          <div className="text-4xl mb-3">🧪</div>
          <p className="font-display text-sm font-semibold text-brand-text">AI Lab Explorer</p>
          <p className="text-caption text-brand-text-secondary mb-2">Completed the AI X-Ray lab</p>
          <p className="font-mono text-caption font-medium text-brand-accent">+500 XP</p>
          <span className="inline-block mt-2 text-caption font-semibold text-brand-secondary bg-brand-secondary/10 rounded-full px-2 py-0.5">
            Earned ✓
          </span>
        </div>

        {/* Locked */}
        <div className="rounded-xl border border-brand-border bg-white p-5 opacity-50 grayscale">
          <div className="text-4xl mb-3">🚀</div>
          <p className="font-display text-sm font-semibold text-brand-text">Remix Master</p>
          <p className="text-caption text-brand-text-secondary mb-2">Remix 10 creations from Explore</p>
          <p className="font-mono text-caption font-medium text-brand-text-muted">+1000 XP</p>
          <span className="inline-block mt-2 text-caption text-brand-text-muted bg-brand-background rounded-full px-2 py-0.5">
            🔒 Locked
          </span>
        </div>
      </div>

      {/* Streak Indicator */}
      <h3 className="text-h4 font-display text-brand-text mb-4">Streak Indicators</h3>
      <div className="flex flex-wrap gap-4">
        {[3, 7, 14, 30].map((days) => (
          <div
            key={days}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 gradient-reward text-white shadow-button"
          >
            <span className="text-lg">🔥</span>
            <span className="font-mono font-bold">{days}</span>
            <span className="text-sm font-medium">Day Streak</span>
          </div>
        ))}
      </div>
    </section>
  );
}
