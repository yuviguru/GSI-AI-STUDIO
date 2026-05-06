'use client';

/**
 * useAudioRecorder — MediaRecorder wrapper for kid voice capture (PERF-001).
 *
 * When a backing track URL is provided, the recorder builds a Web Audio
 * graph that mixes the track with the kid's mic in real time, so the
 * resulting blob contains BOTH the song and the kid's voice (single
 * mixed audio file — what you'd want for a sing-along).
 *
 * Audio graph:
 *
 *   [backingBufferSource] ── AudioContext.destination  (kid hears the song)
 *           │
 *           └──► [recordingMixer (GainNode)] ──► [destinationNode] ──► MediaRecorder
 *                          ▲
 *   [micSource] ──► [micGain] ──► [analyser]   (live amplitude UI)
 *                          │
 *                          └──► (same recordingMixer above)
 *
 * The mic does NOT route to AudioContext.destination — that would cause
 * feedback echo (kid hears their own voice through the air; speakers
 * piping it back is the loop). MediaRecorder is fed the destinationNode's
 * stream, NOT the raw mic stream.
 *
 * Without a backing track, the recorder falls back to mic-only behavior
 * (graph is just mic → destinationNode).
 *
 * Design notes:
 *   - Hard auto-stop at maxDurationSec OR when the backing track ends
 *   - Returns a Blob you can upload directly to a pre-signed PUT URL
 *   - Caller handles the rest (pre-signed URL fetch, upload, finalize)
 *   - All Web Audio nodes + the mic stream are torn down on stop/unmount
 *
 * CORS note: when backingTrackUrl is an https URL (Firebase Storage,
 * R2 CDN, Replicate, etc.), the bucket / CDN MUST set
 * `Access-Control-Allow-Origin` for our origin so `decodeAudioData` can
 * read it. Data URIs are CORS-free. If decode fails, the recorder
 * surfaces a friendly error instead of falling back silently — we want
 * the kid to know the song isn't being captured.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

export interface UseAudioRecorderOptions {
  /** Max recording duration in seconds. Default 90. */
  maxDurationSec?: number;
  /** Bits per second for encoder. Default 96_000 (Opus stereo, music + voice). */
  audioBitsPerSecond?: number;
  /**
   * Optional backing-track URL. When provided, the track is decoded and
   * mixed with the mic input — the resulting blob includes both. The
   * track is also played back through the speakers so the kid can sing
   * along. Must be CORS-accessible to the current origin.
   */
  backingTrackUrl?: string;
  /**
   * Backing-track gain (0..1). Default 0.55. Music tracks are mastered
   * loud; voice sounds tiny next to them. We sit the music well below
   * unity so the kid's voice can sit on top.
   */
  backingTrackGain?: number;
  /**
   * Mic gain (>= 0). Default 1.8. Consumer mics + ambient kid voice
   * tend to come in well below mastered music, so we boost. Combined
   * with the compressor this still won't clip.
   */
  micGain?: number;
}

export interface UseAudioRecorderResult {
  state: RecorderState;
  /** Elapsed seconds since record started — updates ~60x/sec while recording. */
  elapsedSec: number;
  /**
   * Current backing-track playback position in seconds. Equals `elapsedSec`
   * in voice-only mode. Use this to drive things like lyric highlighting
   * that previously read from a separate audio element's currentTime.
   * Updates ~60x/sec while recording.
   */
  playbackTimeSec: number;
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
  /** True while the backing track is loading; lets the UI gate the start button. */
  isPreparing: boolean;

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
  return null;
}

export function useAudioRecorder(
  options: UseAudioRecorderOptions = {},
): UseAudioRecorderResult {
  const maxDurationSec = options.maxDurationSec ?? 90;
  // Higher default than voice-only because we're now mixing music in.
  const audioBitsPerSecond = options.audioBitsPerSecond ?? 96_000;
  const backingTrackUrl = options.backingTrackUrl;
  // Karaoke-style mix: voice sits clearly on top of the song.
  // Music dropped well below unity, mic boosted, compressor smooths peaks.
  const backingTrackGainValue = options.backingTrackGain ?? 0.55;
  const micGainValue = options.micGain ?? 1.8;

  const [state, setState] = useState<RecorderState>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [playbackTimeSec, setPlaybackTimeSec] = useState(0);
  const [liveAmplitude, setLiveAmplitude] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const backingSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const startedAtRef = useRef<number>(0);
  /** AudioContext.currentTime captured the moment the backing source started. */
  const backingStartCtxTimeRef = useRef<number | null>(null);
  const tickHandleRef = useRef<number | null>(null);
  const ampHandleRef = useRef<number | null>(null);
  const autoStopHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cache decoded backing-track buffer per URL — re-decoding is expensive
  // and fetching may hit the network again.
  const decodedBufferRef = useRef<{ url: string; buffer: AudioBuffer } | null>(null);

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
    if (backingSourceRef.current) {
      try {
        backingSourceRef.current.stop();
      } catch {
        // already stopped
      }
      backingSourceRef.current.disconnect();
      backingSourceRef.current = null;
    }
    backingStartCtxTimeRef.current = null;
    if (destinationNodeRef.current) {
      destinationNodeRef.current.disconnect();
      destinationNodeRef.current = null;
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
      // ─── 1. Mic permission ────────────────────────────────────
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // With backing-track mixing:
          //  - echoCancellation OFF: would treat speaker-bleed as echo
          //    and chew into the kid's voice along with the music
          //  - noiseSuppression OFF: too aggressive for kid voice; can
          //    drop quiet vowels and breathy parts
          //  - autoGainControl ON: this is the one we *want* — it boosts
          //    quiet voices toward a target level, which is the main
          //    reason kids' voices were sitting too low in the mix
          echoCancellation: !backingTrackUrl,
          noiseSuppression: !backingTrackUrl,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      // ─── 2. Audio context ─────────────────────────────────────
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error('Web Audio API not supported in this browser.');
      }
      const ctx = new AudioContextCtor();
      audioCtxRef.current = ctx;

      // Some browsers create the context in 'suspended' state until a
      // user gesture resumes it. start() is itself triggered by a click
      // (kid taps Record), which counts — but resume() is a safe net.
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // ─── 3. Build the graph ───────────────────────────────────
      const recordingMixer = ctx.createGain();
      recordingMixer.gain.value = 1.0;

      // Mic side — capture into mixer + analyser (for live amplitude).
      //
      // Chain: mic → compressor → micGain → mixer
      //
      // The compressor smooths volume swings (yelling vs whispering) so
      // the kid's voice sits at a consistent level relative to the
      // backing track. Settings are conservative — gentle 4:1 ratio,
      // medium-soft knee, attack/release tuned for voice (not music).
      const micSource = ctx.createMediaStreamSource(stream);

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -28; // dB — start compressing above this
      compressor.knee.value = 18;       // soft knee for natural vocals
      compressor.ratio.value = 4;       // 4:1 — typical voice setting
      compressor.attack.value = 0.005;  // 5ms — catch transients
      compressor.release.value = 0.1;   // 100ms — let it breathe

      const micGain = ctx.createGain();
      micGain.gain.value = micGainValue;

      micSource.connect(compressor);
      compressor.connect(micGain);
      micGain.connect(recordingMixer);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      micGain.connect(analyser);
      analyserRef.current = analyser;

      // Destination node — what MediaRecorder records.
      const destinationNode = ctx.createMediaStreamDestination();
      recordingMixer.connect(destinationNode);
      destinationNodeRef.current = destinationNode;

      // ─── 4. Backing track (if provided) ───────────────────────
      let backingDurationSec = Infinity;
      if (backingTrackUrl) {
        setIsPreparing(true);
        try {
          // Reuse cached decoded buffer when the URL hasn't changed —
          // saves a decode on retake.
          let buffer: AudioBuffer;
          if (decodedBufferRef.current?.url === backingTrackUrl) {
            buffer = decodedBufferRef.current.buffer;
          } else {
            const res = await fetch(backingTrackUrl, { mode: 'cors' });
            if (!res.ok) {
              throw new Error(`Failed to fetch backing track: ${res.status}`);
            }
            const arrayBuffer = await res.arrayBuffer();
            buffer = await ctx.decodeAudioData(arrayBuffer);
            decodedBufferRef.current = { url: backingTrackUrl, buffer };
          }

          backingDurationSec = buffer.duration;

          const backingSource = ctx.createBufferSource();
          backingSource.buffer = buffer;

          const backingGain = ctx.createGain();
          backingGain.gain.value = backingTrackGainValue;

          backingSource.connect(backingGain);
          // Backing track goes BOTH to the recording mix AND to speakers
          backingGain.connect(recordingMixer);
          backingGain.connect(ctx.destination);

          backingSourceRef.current = backingSource;

          // Auto-stop when the backing track ends (kid finished the song)
          backingSource.onended = () => {
            if (recorderRef.current && recorderRef.current.state === 'recording') {
              recorderRef.current.stop();
            }
          };

          // Start the source at currentTime — we'll start MediaRecorder
          // immediately after the recorder.start() call below. Capture
          // the start moment so the elapsed-time tick can compute
          // playback position accurately.
          backingStartCtxTimeRef.current = ctx.currentTime;
          backingSource.start(0);
        } catch (err) {
          cleanup();
          setIsPreparing(false);
          setState('error');
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes('Failed to fetch') ||
            msg.includes('CORS') ||
            err instanceof DOMException
          ) {
            setError(
              "We couldn't load the song. The audio source may not allow cross-origin reads. " +
              'Ask an adult to check the storage CORS settings.',
            );
          } else {
            setError("Couldn't load the song to sing along to. Try again?");
          }
          return;
        }
        setIsPreparing(false);
      }

      // ─── 5. Wire up MediaRecorder on the mixed stream ─────────
      const chosenMime = pickMimeType();
      const recorder = new MediaRecorder(
        destinationNode.stream,
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

      // ─── 6. Live UI ticks ─────────────────────────────────────
      const ampBuf = new Uint8Array(analyser.frequencyBinCount);
      const tickAmp = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(ampBuf);
        let sumSquares = 0;
        for (let i = 0; i < ampBuf.length; i++) {
          const normalized = ((ampBuf[i] ?? 128) - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / ampBuf.length);
        setLiveAmplitude(Math.min(1, rms * 2));
        ampHandleRef.current = requestAnimationFrame(tickAmp);
      };
      ampHandleRef.current = requestAnimationFrame(tickAmp);

      startedAtRef.current = performance.now();
      const tickElapsed = () => {
        const sec = (performance.now() - startedAtRef.current) / 1000;
        setElapsedSec(sec);

        // playbackTimeSec — when a backing track is playing, prefer the
        // audio clock (drift-free, doesn't pause when the tab does);
        // otherwise track wall time so callers don't have to special-case.
        const ctxNow = audioCtxRef.current?.currentTime;
        const startedAt = backingStartCtxTimeRef.current;
        if (ctxNow !== undefined && startedAt !== null) {
          setPlaybackTimeSec(Math.max(0, ctxNow - startedAt));
        } else {
          setPlaybackTimeSec(sec);
        }

        tickHandleRef.current = requestAnimationFrame(tickElapsed);
      };
      tickHandleRef.current = requestAnimationFrame(tickElapsed);

      // ─── 7. Hard auto-stop ────────────────────────────────────
      const stopAfterMs = Math.min(maxDurationSec, backingDurationSec) * 1000;
      autoStopHandleRef.current = setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      }, stopAfterMs);

      recorder.start(250);
      setState('recording');
    } catch (err) {
      cleanup();
      setIsPreparing(false);
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
  }, [
    audioBitsPerSecond,
    backingTrackGainValue,
    backingTrackUrl,
    blobUrl,
    cleanup,
    isSupported,
    maxDurationSec,
    micGainValue,
    state,
  ]);

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
    setPlaybackTimeSec(0);
    setLiveAmplitude(0);
    setError(null);
    setState('idle');
  }, [blobUrl]);

  return {
    state,
    elapsedSec,
    playbackTimeSec,
    liveAmplitude,
    blob,
    blobUrl,
    mimeType,
    isSupported,
    error,
    isPreparing,
    start,
    stop,
    reset,
  };
}
