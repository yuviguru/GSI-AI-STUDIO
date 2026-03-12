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
  // Track whether user explicitly stopped vs browser killed the session
  const intentionalStopRef = useRef(false);
  // Accumulated final transcript across restarts
  const finalTranscriptRef = useRef('');

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    intentionalStopRef.current = true;
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
    intentionalStopRef.current = false;
    finalTranscriptRef.current = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function createRecognition(SR: any, existingFinal: string) {
      const recognition = new SR();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      let finalTranscript = existingFinal;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        clearSilenceTimer();

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) {
            if (result.isFinal) {
              finalTranscript += result[0].transcript + ' ';
              finalTranscriptRef.current = finalTranscript;
            } else {
              interim += result[0].transcript;
            }
          }
        }

        setTranscript((finalTranscript + interim).trim());

        // Reset silence timer — stop after silence ONLY once we have some speech
        silenceTimerRef.current = setTimeout(() => {
          intentionalStopRef.current = true;
          if (recognitionRef.current) {
            // Detach handlers to prevent onend auto-restart
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
            recognitionRef.current = null;
          }
          setIsRecording(false);
        }, maxSilenceSeconds * 1000);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        // 'no-speech' and 'aborted' are recoverable — don't kill recording
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Browser will fire onend next — let auto-restart handle it
          return;
        }
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow mic access.');
        } else {
          setError(`Speech error: ${event.error}`);
        }
        intentionalStopRef.current = true;
        setIsRecording(false);
      };

      recognition.onend = () => {
        clearSilenceTimer();
        // Chrome kills continuous recognition periodically (network timeout,
        // silence, or internal limit). Auto-restart unless user explicitly stopped.
        if (!intentionalStopRef.current) {
          try {
            const newRecognition = createRecognition(SR, finalTranscriptRef.current);
            recognitionRef.current = newRecognition;
            newRecognition.start();
          } catch {
            // Can't restart — stop cleanly
            setIsRecording(false);
          }
          return;
        }
        setIsRecording(false);
      };

      return recognition;
    }

    const recognition = createRecognition(SR, '');
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      setError('Could not start voice recording. Please try again.');
      recognitionRef.current = null;
    }

    // No initial silence timer — wait for user to actually speak first.
    // The silence timer only starts after the first onresult event.
  }, [lang, maxSilenceSeconds, clearSilenceTimer]);

  const reset = useCallback(() => {
    stopRecording();
    setTranscript('');
    setError(null);
  }, [stopRecording]);

  // Cleanup on unmount — detach handlers and abort to fully release Chrome's speech service
  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
        recognitionRef.current = null;
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
