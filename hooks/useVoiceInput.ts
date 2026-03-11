'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceInputOptions {
  /** Language for speech recognition (default: 'en-IN') */
  lang?: string;
  /** Auto-stop after this many seconds of silence */
  maxSilenceSeconds?: number;
}

interface UseVoiceInputReturn {
  /** Whether the Web Speech API is available */
  isSupported: boolean;
  /** Whether currently recording */
  isRecording: boolean;
  /** Live transcript being built */
  transcript: string;
  /** Any error message */
  error: string | null;
  /** Start voice recording */
  startRecording: () => void;
  /** Stop voice recording */
  stopRecording: () => void;
  /** Clear transcript and error */
  reset: () => void;
}

// Check for SpeechRecognition availability
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SR ?? null;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { lang = 'en-IN', maxSilenceSeconds = 5 } = options;

  const [isSupported] = useState(() => getSpeechRecognition() !== null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, [clearSilenceTimer]);

  const startRecording = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    setError(null);
    setTranscript('');

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      clearSilenceTimer();

      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result[0]) {
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
      }

      setTranscript((finalTranscript + interim).trim());

      // Reset silence timer
      silenceTimerRef.current = setTimeout(() => {
        stopRecording();
      }, maxSilenceSeconds * 1000);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow mic access.');
      } else {
        setError(`Speech error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      clearSilenceTimer();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);

    // Auto-stop after silence
    silenceTimerRef.current = setTimeout(() => {
      stopRecording();
    }, maxSilenceSeconds * 1000);
  }, [lang, maxSilenceSeconds, clearSilenceTimer, stopRecording]);

  const reset = useCallback(() => {
    stopRecording();
    setTranscript('');
    setError(null);
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearSilenceTimer();
    };
  }, [clearSilenceTimer]);

  return {
    isSupported,
    isRecording,
    transcript,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}
