'use client';

import { useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted, setMuted, playSound } from '@/lib/sounds';

export function MuteToggle() {
  const [muted, setMutedState] = useState(() => isMuted());

  const toggle = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);

    // Play a tap sound as feedback when unmuting
    if (!next) {
      playSound('buttonTap');
    }
  }, [muted]);

  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}
