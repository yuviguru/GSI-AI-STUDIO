'use client';

/**
 * useAudioRecorder — MediaRecorder wrapper for kid voice capture (PERF-001).
 *
 * Captures Opus audio (preferred) or whatever the browser supports as a
 * fallback. Reports waveform amplitude in real time so the recorder UI
 * can show visual feedback while the kid sings.
 *
 * Design notes:
 *   - 90s hard cap (auto-stops with `auto_stopped` reason)
 *   - Returns a Blob you can upload directly to a pre-signed PUT URL
 *   - Caller handles the rest (pre-signed URL fetch, upload, finalize)
 *   - Mic stream is fully cleaned up on unmount or stop
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

export interface UseAudioRecorderOptions {
  /** Max recording duration in seconds. Default 90. */
  maxDurationSec?: number;
  /** Bits per second for encoder. Default 32_000 (Opus mono, voice-quality). */
  audioBitsPerSecond?: number;
}

export interface UseAudioRecorderResult {
  state: RecorderState;
  /** Elapsed seconds since record started — updates ~10x/sec while recording. */
  elapsedSec: number;
  /** Live amplitude 0..1 — drive a waveform bar. Falls back to 0 when not recording. */
  liveAmplitude: number;
  /** Final Blob after stop; null while recording or before first stop. */
  blob: Blob | null;
  /** Final blob URL (object URL) for instant preview playback. */
  blobUrl: string | null;
  /** Final MIME type for upload (e.g. 'audio/webm'). */
  mimeType: string | null;
  /** True if MediaRecorder is supported by the browser. */
  isSupported: boolean;
  /** Any captured error (mic denied, MediaRecorder unsupported, etc.). */
  error: string | null;

  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null; // browser will pick default
}

export function useAudioRecorder(
  options: UseAudioRecorderOptions = {},
): UseAudioRecorderResult {
  const maxDurationSec = options.maxDurationSec ?? 90;
  const audioBitsPerSecond = options.audioBitsPerSecond ?? 32_000;

  const [state, setState] = useState<RecorderState>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [liveAmplitude, setLiveAmplitude] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickHandleRef = useRef<number | null>(null);
  const ampHandleRef = useRef<number | null>(null);
  const autoStopHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  const cleanup = useCallback(() => {
    if (tickHandleRef.current !== null) {
      cancelAnimationFrame(tickHandleRef.current);
      tickHandleRef.current = null;
    }
    if (ampHandleRef.current !== null) {
      cancelAnimationFrame(ampHandleRef.current);
      ampHandleRef.current = null;
    }
    if (autoStopHandleRef.current !== null) {
      clearTimeout(autoStopHandleRef.current);
      autoStopHandleRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
    // We deliberately omit blobUrl from deps — we want cleanup *only* on unmount.
    // The blobUrl is also revoked separately in `reset` and on next start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      setState('error');
      setError("Your browser can't record audio. Try Chrome on a desktop.");
      return;
    }
    if (state === 'recording' || state === 'requesting') return;

    setError(null);
    setBlob(null);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
    chunksRef.current = [];
    setState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      // Set up amplitude analysis for the live waveform.
      const AudioContextCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor) {
        const ctx = new AudioContextCtor();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const buffer = new Uint8Array(analyser.frequencyBinCount);
        const tickAmp = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(buffer);
          // RMS amplitude, scaled to 0..1
          let sumSquares = 0;
          for (let i = 0; i < buffer.length; i++) {
            const normalized = ((buffer[i] ?? 128) - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / buffer.length);
          setLiveAmplitude(Math.min(1, rms * 2)); // boost for UI
          ampHandleRef.current = requestAnimationFrame(tickAmp);
        };
        ampHandleRef.current = requestAnimationFrame(tickAmp);
      }

      const chosenMime = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        chosenMime ? { mimeType: chosenMime, audioBitsPerSecond } : { audioBitsPerSecond },
      );
      recorderRef.current = recorder;
      setMimeType(chosenMime ?? recorder.mimeType ?? 'audio/webm');

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const finalMime = chosenMime ?? recorder.mimeType ?? 'audio/webm';
        const finalBlob = new Blob(chunksRef.current, { type: finalMime });
        const url = URL.createObjectURL(finalBlob);
        setBlob(finalBlob);
        setBlobUrl(url);
        setMimeType(finalMime);
        setState('stopped');
        cleanup();
      };
      recorder.onerror = (e) => {
        setError((e as ErrorEvent).message ?? 'Recording failed');
        setState('error');
        cleanup();
      };

      // Tick elapsed time
      startedAtRef.current = performance.now();
      const tickElapsed = () => {
        const sec = (performance.now() - startedAtRef.current) / 1000;
        setElapsedSec(sec);
        tickHandleRef.current = requestAnimationFrame(tickElapsed);
      };
      tickHandleRef.current = requestAnimationFrame(tickElapsed);

      // Hard auto-stop at maxDurationSec
      autoStopHandleRef.current = setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      }, maxDurationSec * 1000);

      recorder.start(250); // emit chunks every 250ms
      setState('recording');
    } catch (err) {
      cleanup();
      setState('error');
      const name = err instanceof Error ? err.name : 'Error';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError("We need microphone permission to record. Tap the lock icon in your browser to allow.");
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError("We couldn't find a microphone. Plug one in or check your settings.");
      } else {
        setError(err instanceof Error ? err.message : 'Could not access microphone');
      }
    }
  }, [audioBitsPerSecond, blobUrl, cleanup, isSupported, maxDurationSec, state]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
    setBlob(null);
    setBlobUrl(null);
    setMimeType(null);
    setElapsedSec(0);
    setLiveAmplitude(0);
    setError(null);
    setState('idle');
  }, [blobUrl]);

  return {
    state,
    elapsedSec,
    liveAmplitude,
    blob,
    blobUrl,
    mimeType,
    isSupported,
    error,
    start,
    stop,
    reset,
  };
}
