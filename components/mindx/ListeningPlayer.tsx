'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListeningPlayerProps {
  audioText: string;
  onDone: () => void;
}

export function ListeningPlayer({ audioText, onDone }: ListeningPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [replayUsed, setReplayUsed] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const playAudio = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(audioText);
    utterance.lang = 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlaying(true);

    utterance.onend = () => {
      setIsPlaying(false);
      setHasPlayed(true);
      onDone();
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setHasPlayed(true);
      onDone();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [audioText, onDone]);

  const handleReplay = useCallback(() => {
    if (replayUsed) return;
    setReplayUsed(true);
    setHasPlayed(false);
    playAudio();
  }, [replayUsed, playAudio]);

  return (
    <div className="flex flex-col items-center gap-3">
      {!hasPlayed ? (
        <motion.button
          onClick={playAudio}
          disabled={isPlaying}
          className={cn(
            'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors',
            isPlaying
              ? 'bg-sky-200 text-sky-700'
              : 'bg-sky-500 text-white hover:bg-sky-600',
          )}
          animate={isPlaying ? { scale: [1, 1.03, 1] } : {}}
          transition={isPlaying ? { duration: 1.2, repeat: Infinity } : {}}
        >
          <Volume2 className="h-4 w-4" />
          {isPlaying ? 'Playing...' : 'Tap to Listen'}
        </motion.button>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Audio played</span>
          {!replayUsed && (
            <button
              onClick={handleReplay}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50"
            >
              <RotateCcw className="h-3 w-3" />
              Replay once
            </button>
          )}
        </div>
      )}

      {isPlaying && (
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="h-4 w-1 rounded-full bg-sky-400"
              animate={{ scaleY: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
