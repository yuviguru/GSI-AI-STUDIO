'use client';

import { useState, useCallback, useEffect } from 'react';
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
  const maxReplays = 2;

  // Chrome loads TTS voices asynchronously — preload them on mount
  useEffect(() => {
    if (!isTtsSupported()) return;
    window.speechSynthesis.getVoices();
    const handleVoicesChanged = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      window.speechSynthesis.cancel();
    };
  }, []);

  const handlePlay = useCallback(() => {
    if (!isTtsSupported()) {
      setShowText(true);
      return;
    }

    if (playCount >= maxReplays) return;

    // Cancel any in-progress speech
    window.speechSynthesis.cancel();

    // Chrome bug: speak() right after cancel() can be silently ignored.
    // A small delay lets Chrome reset its internal state.
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(audioText);
      utterance.lang = 'en-IN';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      // Try to find an English voice (Chrome sometimes picks wrong default)
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => {
        setIsPlaying(false);
        setPlayCount((c) => c + 1);
      };
      utterance.onerror = (e) => {
        // 'interrupted' fires when cancel() is called — not a real error
        if (e.error === 'interrupted') return;
        setIsPlaying(false);
        setShowText(true);
      };

      window.speechSynthesis.speak(utterance);

      // Chrome 14+ second bug: long utterances pause silently.
      // Workaround: periodically resume to keep speech alive.
      const keepAlive = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(keepAlive);
        }
      }, 10000);

      utterance.onend = () => {
        clearInterval(keepAlive);
        setIsPlaying(false);
        setPlayCount((c) => c + 1);
      };
      utterance.onerror = (e) => {
        clearInterval(keepAlive);
        if (e.error === 'interrupted') return;
        setIsPlaying(false);
        setShowText(true);
      };
    }, 50);
  }, [audioText, playCount]);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  const canPlay = playCount < maxReplays;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <motion.button
          onClick={isPlaying ? handleStop : handlePlay}
          disabled={!isPlaying && !canPlay}
          animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
          className={`flex h-14 w-14 items-center justify-center rounded-full text-xl shadow-md transition-all ${
            isPlaying
              ? 'bg-red-500 text-white'
              : canPlay
                ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isPlaying ? '⏹' : '▶'}
        </motion.button>
        <div>
          <p className="text-sm font-medium text-gray-800">
            {isPlaying ? 'Playing...' : canPlay ? 'Tap to listen' : 'Replays used up'}
          </p>
          <p className="text-xs text-gray-500">
            {playCount === 0
              ? 'Listen carefully, you can replay once'
              : playCount >= maxReplays
                ? 'No more replays — answer from memory'
                : `Played ${playCount} time${playCount > 1 ? 's' : ''} — 1 replay left`}
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
