'use client';

import { useMemo } from 'react';
import { Mascot } from '@/components/mascot/Mascot';
import { useAiPoints } from '@/contexts/AiPointsContext';

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '🌤' };
  return { text: 'Good evening', emoji: '🌙' };
}

function getKokoMessage(totalPoints: number): string {
  if (totalPoints === 0) return "Hi! I'm Koko. Let's create something amazing!";
  if (totalPoints < 50) return 'Great to see you! Ready to create today?';
  if (totalPoints < 200) return "You're on a roll! Let's keep creating!";
  return "You're a true AI creator! What will we make today?";
}

export function DashboardGreeting() {
  const { totalPoints } = useAiPoints();
  const { text, emoji } = useMemo(getGreeting, []);
  const kokoMsg = getKokoMessage(totalPoints);

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-purple/10 via-brand-ai/5 to-transparent p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-purple/70">
            {text} {emoji}
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold leading-tight text-gray-900 sm:text-2xl">
            Explorer!
          </h2>
          <p className="mt-1 max-w-xs text-sm leading-snug text-gray-500">{kokoMsg}</p>
        </div>

        {/* Koko mascot pinned right */}
        <div className="shrink-0 opacity-90">
          <Mascot expression="waving" size="sm" bobbing />
        </div>
      </div>
    </div>
  );
}
