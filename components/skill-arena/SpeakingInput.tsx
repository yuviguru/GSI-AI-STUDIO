'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { TextAnswer } from './TextAnswer';

interface SpeakingInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SpeakingInput({ value, onChange, disabled }: SpeakingInputProps) {
  const { isSupported, isRecording, transcript, error, startRecording, stopRecording, reset } =
    useVoiceInput({ lang: 'en-IN', maxSilenceSeconds: 5 });

  const [useFallback, setUseFallback] = useState(!isSupported);

  // Sync transcript to parent
  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      // Commit transcript to value
      if (transcript.trim()) {
        onChange(transcript.trim());
      }
    } else {
      reset();
      startRecording();
    }
  };

  // When transcript updates, update value too
  if (isRecording && transcript && transcript !== value) {
    onChange(transcript);
  }

  if (useFallback) {
    return (
      <div className="space-y-2">
        <TextAnswer
          value={value}
          onChange={onChange}
          placeholder="Type your spoken response here..."
          disabled={disabled}
        />
        {isSupported && (
          <button
            onClick={() => setUseFallback(false)}
            className="text-xs text-purple-600 hover:underline"
          >
            Switch to voice input
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mic button */}
      <div className="flex flex-col items-center gap-3">
        <motion.button
          onClick={handleToggleRecording}
          disabled={disabled}
          animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
          className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl shadow-lg transition-all ${
            isRecording
              ? 'bg-red-500 text-white'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          } disabled:opacity-50`}
        >
          {isRecording ? '⏹' : '🎤'}
        </motion.button>
        <p className="text-xs text-gray-500">
          {isRecording ? 'Listening... tap to stop' : 'Tap to start speaking'}
        </p>
      </div>

      {/* Live transcript */}
      {(value || isRecording) && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500">What I heard:</p>
          <p className="mt-1 text-sm text-gray-800">
            {value || (isRecording ? 'Listening...' : '')}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={() => setUseFallback(true)}
        className="text-xs text-gray-500 hover:underline"
      >
        Prefer to type instead?
      </button>
    </div>
  );
}
