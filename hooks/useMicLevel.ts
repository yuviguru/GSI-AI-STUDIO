'use client';

/**
 * useMicLevel — standalone mic level monitor (PERF-001).
 *
 * Lighter sibling of useAudioRecorder: only reads the mic and reports
 * RMS amplitude, no MediaRecorder, no encoding, no backing-track mix.
 * Powers the "Test mic" feature on the sing-along recorder so a kid
 * can verify their mic is actually picking up sound before recording.
 *
 * The hook also tracks two derived signals from the amplitude stream:
 *   - voiceDetected: true once we've seen a sustained amplitude spike
 *     above the speech threshold (= mic is definitely picking up voice)
 *   - silenceTooLong: true if amplitude has been below the silence
 *     threshold for ~5s continuously while the meter is running (= mic
 *     is muted or unplugged, or the kid is in a vacuum)
 *
 * Caller decides what to render — this hook just exposes the signals.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type MicLevelState = 'idle' | 'requesting' | 'active' | 'error';

export interface UseMicLevelOptions {
  /**
   * RMS threshold (0..1) above which we count as "voice detected".
   * Raised slightly above background noise floor. Default 0.05.
   */
  voiceThreshold?: number;
  /**
   * RMS threshold (0..1) below which we count as "silence". Default 0.02.
   * Anything between voice and silence is "ambient" — neither flagged.
   */
  silenceThreshold?: number;
  /**
   * Time in ms below silence threshold before silenceTooLong fires.
   * Default 5000 (5s).
   */
  silenceWindowMs?: number;
  /**
   * Time in ms above voice threshold before voiceDetected fires.
   * Default 200 (catches even short utterances like "test").
   */
  voiceWindowMs?: number;
}

export interface UseMicLevelResult {
  state: MicLevelState;
  liveAmplitude: number;
  voiceDetected: boolean;
  silenceTooLong: boolean;
  isSupported: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useMicLevel(options: UseMicLevelOptions = {}): UseMicLevelResult {
  const voiceThreshold = options.voiceThreshold ?? 0.05;
  const silenceThreshold = options.silenceThreshold ?? 0.02;
  const silenceWindowMs = options.silenceWindowMs ?? 5000;
  const voiceWindowMs = options.voiceWindowMs ?? 200;

  const [state, setState] = useState<MicLevelState>('idle');
  const [liveAmplitude, setLiveAmplitude] = useState(0);
  const [voiceDetected, setVoiceDetected] = useState(false);
  const [silenceTooLong, setSilenceTooLong] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  /** performance.now() of the first sample below silence threshold in the current run. */
  const silenceStartedAtRef = useRef<number | null>(null);
  /** performance.now() of the first sample above voice threshold in the current run. */
  const voiceStartedAtRef = useRef<number | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!(window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => undefined);
      ctxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    silenceStartedAtRef.current = null;
    voiceStartedAtRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!isSupported) {
      setState('error');
      setError("Your browser can't access the microphone.");
      return;
    }
    if (state === 'active' || state === 'requesting') return;

    setError(null);
    setVoiceDetected(false);
    setSilenceTooLong(false);
    setLiveAmplitude(0);
    setState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioContextCtor!();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buf);
        let sumSquares = 0;
        for (let i = 0; i < buf.length; i++) {
          const normalized = ((buf[i] ?? 128) - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / buf.length);
        const amp = Math.min(1, rms * 2);
        setLiveAmplitude(amp);

        const now = performance.now();

        // Voice detection: sustained signal above threshold
        if (amp >= voiceThreshold) {
          if (voiceStartedAtRef.current === null) {
            voiceStartedAtRef.current = now;
          } else if (
            now - voiceStartedAtRef.current >= voiceWindowMs &&
            !voiceDetected
          ) {
            setVoiceDetected(true);
          }
        } else {
          voiceStartedAtRef.current = null;
        }

        // Silence detection: continuous absence below silence threshold
        if (amp <= silenceThreshold) {
          if (silenceStartedAtRef.current === null) {
            silenceStartedAtRef.current = now;
          } else if (
            now - silenceStartedAtRef.current >= silenceWindowMs &&
            !silenceTooLong &&
            !voiceDetected
          ) {
            setSilenceTooLong(true);
          }
        } else {
          silenceStartedAtRef.current = null;
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      setState('active');
    } catch (err) {
      cleanup();
      setState('error');
      const name = err instanceof Error ? err.name : 'Error';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError(
          "We need microphone permission to test your mic. Tap the lock icon in your browser to allow.",
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError("We couldn't find a microphone. Plug one in or check your settings.");
      } else {
        setError(err instanceof Error ? err.message : 'Could not access microphone');
      }
    }
  }, [
    cleanup,
    isSupported,
    silenceThreshold,
    silenceTooLong,
    silenceWindowMs,
    state,
    voiceDetected,
    voiceThreshold,
    voiceWindowMs,
  ]);

  const stop = useCallback(() => {
    cleanup();
    setState('idle');
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setLiveAmplitude(0);
    setVoiceDetected(false);
    setSilenceTooLong(false);
    setError(null);
    setState('idle');
  }, [cleanup]);

  return {
    state,
    liveAmplitude,
    voiceDetected,
    silenceTooLong,
    isSupported,
    error,
    start,
    stop,
    reset,
  };
}
