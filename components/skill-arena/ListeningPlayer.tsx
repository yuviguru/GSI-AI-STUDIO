'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ListeningPlayerProps {
  /** Text to be read via TTS */
  audioText: string;
  /** Optional fallback passage to display */
  passage?: string;
}

function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function ListeningPlayer({ audioText, passage }: ListeningPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [showText, setShowText] = useState(!isTtsSupported());

  const handlePlay = useCallback(() => {
    if (!isTtsSupported()) {
      setShowText(true);
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(audioText);
    utterance.lang = 'en-IN';
    utterance.rate = 0.9; // Slightly slower for kids
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      setPlayCount((c) => c + 1);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setShowText(true);
    };

    window.speechSynthesis.speak(utterance);
  }, [audioText]);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <motion.button
          onClick={isPlaying ? handleStop : handlePlay}
          animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
          className={`flex h-14 w-14 items-center justify-center rounded-full text-xl shadow-md transition-all ${
            isPlaying
              ? 'bg-red-500 text-white'
              : 'bg-cyan-600 text-white hover:bg-cyan-700'
          }`}
        >
          {isPlaying ? '⏹' : '▶'}
        </motion.button>
        <div>
          <p className="text-sm font-medium text-gray-800">
            {isPlaying ? 'Playing...' : 'Tap to listen'}
          </p>
          <p className="text-xs text-gray-500">
            {playCount === 0
              ? 'Listen carefully, you can replay once'
              : playCount >= 2
                ? 'No more replays'
                : `Played ${playCount} time${playCount > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Text fallback when TTS is unavailable or user toggles */}
      {showText && (
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4">
          <p className="mb-1 text-xs font-medium text-cyan-600">Read the passage:</p>
          <p className="text-sm leading-relaxed text-gray-800">{passage ?? audioText}</p>
        </div>
      )}

      {!showText && (
        <button
          onClick={() => setShowText(true)}
          className="text-xs text-gray-500 hover:underline"
        >
          Can&apos;t hear? Show text instead
        </button>
      )}
    </div>
  );
}
