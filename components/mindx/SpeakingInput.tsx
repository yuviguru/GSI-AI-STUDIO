'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface SpeakingInputProps {
  onSubmit: (transcript: string) => void;
  disabled?: boolean;
}

export function SpeakingInput({ onSubmit, disabled }: SpeakingInputProps) {
  const voice = useVoiceInput();
  const [fallbackText, setFallbackText] = useState('');

  // If speech is not supported or permission denied, show text input
  const showTextFallback = !voice.isSupported || voice.permissionDenied;

  // Auto-populate text from transcript
  useEffect(() => {
    if (voice.transcript) {
      setFallbackText(voice.transcript);
    }
  }, [voice.transcript]);

  const handleSubmit = () => {
    const text = voice.transcript || fallbackText;
    if (text.trim()) {
      onSubmit(text.trim());
    }
  };

  return (
    <div className="space-y-3">
      {!showTextFallback && (
        <div className="flex flex-col items-center gap-3">
          <motion.button
            onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
            disabled={disabled}
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full transition-colors',
              voice.isRecording
                ? 'bg-red-500 text-white shadow-lg shadow-red-200'
                : 'bg-rose-100 text-rose-500 hover:bg-rose-200',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            animate={voice.isRecording ? { scale: [1, 1.1, 1] } : {}}
            transition={voice.isRecording ? { duration: 1.5, repeat: Infinity } : {}}
          >
            {voice.isRecording ? (
              <Square className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </motion.button>

          <p className="text-xs text-gray-400">
            {voice.isRecording ? 'Recording... Tap to stop' : 'Tap to start speaking'}
          </p>
        </div>
      )}

      {voice.error && (
        <p className="text-xs text-amber-600">{voice.error}</p>
      )}

      {/* Transcript / text fallback */}
      <div>
        {showTextFallback && (
          <div className="mb-2 flex items-center gap-2 text-xs text-amber-600">
            <MicOff className="h-3.5 w-3.5" />
            <span>
              {voice.permissionDenied
                ? 'Mic permission denied. Type your answer instead.'
                : 'Speech recognition not available. Type your answer.'}
            </span>
          </div>
        )}

        <textarea
          value={showTextFallback ? fallbackText : voice.transcript}
          onChange={(e) => setFallbackText(e.target.value)}
          readOnly={!showTextFallback && !voice.permissionDenied}
          placeholder={
            showTextFallback
              ? 'Type your response here...'
              : 'Your speech will appear here...'
          }
          className={cn(
            'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3',
            'text-sm text-gray-700 placeholder-gray-400',
            'focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-300',
            'min-h-[80px] resize-none',
          )}
          rows={3}
          disabled={disabled}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={disabled || !(voice.transcript || fallbackText).trim()}
        className={cn(
          'w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors',
          'bg-rose-500 hover:bg-rose-600',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        Submit Answer
      </button>
    </div>
  );
}
