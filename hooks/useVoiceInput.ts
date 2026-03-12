'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface VoiceInputState {
  isRecording: boolean;
  transcript: string;
  isSupported: boolean;
  permissionDenied: boolean;
  error: string | null;
}

export function useVoiceInput() {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    transcript: '',
    isSupported: false,
    permissionDenied: false,
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check support on mount
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    setState((s) => ({ ...s, isSupported: !!SpeechRecognition }));
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState((s) => ({ ...s, error: 'Speech recognition is not supported in this browser' }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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
      setState((s) => ({
        ...s,
        transcript: (finalTranscript + interim).trim(),
      }));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setState((s) => ({
          ...s,
          isRecording: false,
          permissionDenied: true,
          error: 'Microphone permission was denied. You can type your answer instead.',
        }));
      } else {
        setState((s) => ({
          ...s,
          isRecording: false,
          error: `Speech recognition error: ${event.error}`,
        }));
      }
    };

    recognition.onend = () => {
      setState((s) => ({ ...s, isRecording: false }));
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState((s) => ({
      ...s,
      isRecording: true,
      transcript: '',
      error: null,
    }));
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState((s) => ({ ...s, isRecording: false }));
  }, []);

  const resetTranscript = useCallback(() => {
    setState((s) => ({ ...s, transcript: '', error: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetTranscript,
  };
}
