'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiXrayPopup } from '@/components/learning/AiXrayPopup';
import { ShareButton } from '@/components/shared/ShareButton';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { SingAlongRecorder } from './SingAlongRecorder';
import type { AiXrayData, MusicContent } from '@/types';

type MusicData = MusicContent & { title: string; waveformData: number[] };

interface MusicPlayerProps {
  music: MusicData;
  aiXray: AiXrayData;
  onCreateAnother: () => void;
  creationId?: string;
  readOnly?: boolean;
}

export function MusicPlayer({ music, aiXray, onCreateAnother, creationId, readOnly = false }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(music.duration || 0);
  const [showXray, setShowXray] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSingAlong, setIsSingAlong] = useState(false);

  // Split lyrics into non-empty lines for karaoke-style highlight
  const lyricLines = (music.lyrics ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const perLineDuration =
    lyricLines.length > 0 && audioDuration > 0 ? audioDuration / lyricLines.length : 0;
  const activeLineIndex =
    perLineDuration > 0
      ? Math.min(lyricLines.length - 1, Math.floor(currentTime / perLineDuration))
      : -1;

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);

  // "Audio is currently moving" — true when Howler is playing OR the
  // sing-along recorder is driving playback through its Web Audio mix
  // (Howler is paused in that case but currentTime is still ticking
  // forward via SingAlongRecorder.onPlaybackTime).
  const isAudioActive = isPlaying || (isSingAlong && currentTime > 0);

  // Auto-scroll active lyric line into view while audio is moving
  useEffect(() => {
    if (!isAudioActive || activeLineIndex < 0) return;
    const node = activeLineRef.current;
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIndex, isAudioActive]);

  // Auto-show X-Ray on first creation per session (skip in readOnly mode)
  useEffect(() => {
    if (readOnly) return;
    const key = 'gsi-xray-shown-music';
    if (!sessionStorage.getItem(key)) {
      setShowXray(true);
      sessionStorage.setItem(key, 'true');
    }
  }, [readOnly]);

  const howlRef = useRef<import('howler').Howl | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  // Initialize Howler (client-side only)
  useEffect(() => {
    let howl: import('howler').Howl | null = null;

    if (!music.audioUrl) {
      // Asset persistence may have failed for this creation; mark loaded so
      // the rest of the UI (lyrics, sing-along) renders without spinning.
      setIsLoaded(true);
      return;
    }

    const audioSrc = music.audioUrl;

    (async () => {
      const { Howl } = await import('howler');
      howl = new Howl({
        src: [audioSrc],
        html5: true,
        onload: () => {
          setAudioDuration(howl!.duration());
          setIsLoaded(true);
        },
        onend: () => {
          setIsPlaying(false);
          setCurrentTime(0);
        },
        onloaderror: (_id: number, err: unknown) => {
          console.warn('[MusicPlayer] Load error:', err);
          setIsLoaded(true); // still show UI
        },
      });
      howlRef.current = howl;
    })();

    return () => {
      if (howl) howl.unload();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [music.audioUrl]);

  // Animate progress while playing
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const tick = () => {
      const howl = howlRef.current;
      if (howl && howl.playing()) {
        setCurrentTime(howl.seek() as number);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const { width, height } = rect;
    const data = music.waveformData;
    const barCount = data.length;
    const barWidth = Math.max(2, (width / barCount) * 0.7);
    const barGap = (width - barWidth * barCount) / (barCount - 1);
    const progress = audioDuration > 0 ? currentTime / audioDuration : 0;
    const progressX = progress * width;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + barGap);
      const barHeight = Math.max(4, (data[i] ?? 0) * height * 0.85);
      const y = (height - barHeight) / 2;

      ctx.fillStyle = x + barWidth <= progressX ? '#F97316' : '#e5e7eb';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1.5);
      ctx.fill();
    }
  }, [music.waveformData, currentTime, audioDuration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Resize observer for canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => drawWaveform());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawWaveform]);

  const togglePlay = () => {
    const howl = howlRef.current;
    if (!howl) return;

    if (isPlaying) {
      howl.pause();
      setIsPlaying(false);
    } else {
      howl.play();
      setIsPlaying(true);
    }
  };

  // PERF-001: when the recorder mounts, the SingAlongRecorder owns
  // playback (it builds its own Web Audio mix of backing track + mic).
  // We pause Howler so the song doesn't play from two sources at once.
  useEffect(() => {
    if (!isSingAlong) return;
    const howl = howlRef.current;
    if (howl && howl.playing()) {
      howl.pause();
      setIsPlaying(false);
    }
  }, [isSingAlong]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const howl = howlRef.current;
    if (!canvas || !howl || !audioDuration) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * audioDuration;

    howl.seek(newTime);
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title + metadata */}
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-gray-900">{music.title}</h2>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-brand-orange/10 px-3 py-0.5 text-sm font-medium capitalize text-brand-orange">
            {music.genre}
          </span>
          <span className="rounded-full bg-brand-purple/10 px-3 py-0.5 text-sm font-medium capitalize text-brand-purple">
            {music.mood}
          </span>
          <span className="rounded-full bg-brand-cyan/10 px-3 py-0.5 text-sm font-medium text-brand-cyan">
            {music.bpm} BPM
          </span>
          {music.instruments.map((inst) => (
            <span key={inst} className="rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-600">
              {inst}
            </span>
          ))}
        </div>
      </div>

      {/* Player card */}
      <div className="rounded-2xl border-2 border-gray-100 bg-white p-5 shadow-sm">
        {/* Waveform canvas */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="h-20 w-full cursor-pointer rounded-lg"
        />

        {/* Controls */}
        <div className="mt-4 flex items-center gap-4">
          {/* Play/pause button */}
          <button
            onClick={togglePlay}
            disabled={!isLoaded}
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl text-white transition-all active:scale-95',
              isLoaded
                ? 'bg-brand-orange hover:bg-brand-orange/90'
                : 'cursor-wait bg-gray-300'
            )}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '\u23F8' : '\u25B6'}
          </button>

          {/* Time */}
          <div className="flex-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(audioDuration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sing Along — opens the recorder */}
      {music.lyrics && !readOnly && creationId && !isSingAlong && (
        <button
          onClick={() => setIsSingAlong(true)}
          disabled={!isLoaded}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-2xl border-2 py-3 font-bold transition-all active:scale-95',
            'border-brand-purple bg-brand-purple/5 text-brand-purple hover:bg-brand-purple/10',
            !isLoaded && 'cursor-wait opacity-60',
          )}
        >
          <Music2 className="h-5 w-5" />
          Sing Along
        </button>
      )}

      {/* Sing-along recorder */}
      {music.lyrics && !readOnly && creationId && isSingAlong && (
        <SingAlongRecorder
          parentCreationId={creationId}
          backingTrackUrl={music.audioUrl}
          isParentReady={isLoaded}
          onPlaybackTime={setCurrentTime}
          onClose={() => setIsSingAlong(false)}
        />
      )}

      {/* Lyrics */}
      {lyricLines.length > 0 && (
        <div className="rounded-2xl bg-gray-50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Lyrics</h3>
          <div
            ref={lyricsContainerRef}
            className="max-h-48 space-y-2 overflow-y-auto scroll-smooth px-2 text-base leading-relaxed"
          >
            {lyricLines.map((line, i) => {
              const isActive = i === activeLineIndex && isAudioActive;
              return (
                <p
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  className={cn(
                    'origin-left transition-all duration-300',
                    isActive
                      ? 'text-xl font-bold text-brand-purple'
                      : i < activeLineIndex && isAudioActive
                        ? 'text-gray-400'
                        : 'text-gray-600',
                  )}
                >
                  {line}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <ShareButton
          creationId={creationId ?? ''}
          creationTitle={music.title}
          creationType="music"
          className="flex-1"
        />
        <DownloadButton
          creation={{
            id: creationId ?? '',
            type: 'music',
            title: music.title,
            content: music as MusicContent,
          }}
          variant="full"
          className="flex-1"
        />
        {!readOnly && (
          <button
            onClick={() => setShowXray(true)}
            className={cn(
              'flex-1 rounded-full border-2 border-brand-cyan py-3 text-center font-bold text-brand-cyan',
              'transition-all active:scale-95 hover:bg-brand-cyan/5'
            )}
          >
            AI X-Ray {'\uD83D\uDD0D'}
          </button>
        )}
      </div>

      {!readOnly && (
        <button
          onClick={onCreateAnother}
          className="rounded-full bg-gray-100 py-3 text-center font-bold text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
        >
          Create Another Song
        </button>
      )}

      {!readOnly && (
        <AiXrayPopup isOpen={showXray} onClose={() => setShowXray(false)} aiXray={aiXray} />
      )}
    </div>
  );
}
