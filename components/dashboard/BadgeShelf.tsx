'use client';

import { useAiPoints } from '@/contexts/AiPointsContext';
import { useModal } from '@/contexts/ModalContext';
import { BADGE_CATALOG } from '@/lib/badges';

export function BadgeShelf() {
  const { badges } = useAiPoints();
  const { openModal } = useModal();
  const earnedSet = new Set(badges);

  const earned = BADGE_CATALOG.filter((b) => earnedSet.has(b.id));
  const locked = BADGE_CATALOG.filter((b) => !earnedSet.has(b.id));
  const display = earned.slice(0, 3);
  const lockedCount = locked.length;

  return (
    <div className="rounded-xl bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700">🏅 My Badges</p>
        <button
          onClick={() => openModal('badgeGallery')}
          className="text-xs font-semibold text-brand-purple hover:underline"
        >
          View all
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {display.length === 0 ? (
          <p className="text-xs text-gray-400">Create something to earn your first badge!</p>
        ) : (
          <>
            {display.map((b) => (
              <div
                key={b.id}
                title={b.name}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/8 text-xl ring-1 ring-brand-purple/20"
              >
                {b.emoji}
              </div>
            ))}
            {lockedCount > 0 && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-sm font-bold text-gray-400 ring-1 ring-gray-100">
                +{lockedCount}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
