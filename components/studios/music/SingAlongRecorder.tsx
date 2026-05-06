'use client';

/**
 * SingAlongRecorder — replaces the stub at MusicPlayer.tsx:276 (PERF-001).
 *
 * Flow:
 *   idle → tap Record → countdown(3..2..1) → recording → tap Stop or auto-stop @ 90s
 *     → preview → tap Retake (back to idle) OR tap Save → uploading → done
 *
 * The recorder owns the backing track during recording (it builds the
 * Web Audio mix in `useAudioRecorder`). The parent should pause its
 * own player while the recorder is mounted/recording — otherwise the
 * track plays from two sources at once.
 */

import { useCallback, useEffect, useState } from 'react';
import { Mic, Square, RotateCcw, Save, Loader2, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchWithSession } from '@/lib/fetchWithSession';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import type {
  AssetUploadUrlRequest,
  AssetUploadUrlResponse,
  AssetFinalizeResponse,
} from '@/types/asset.types';
import type {
  Performance,
  PerformanceVisibility,
} from '@/types/performance.types';

export interface SingAlongRecorderProps {
  /** Parent music creation ID — performances tie back here. */
  parentCreationId: string;
  /** Backing-track URL — mixed with mic into the final recording. */
  backingTrackUrl?: string;
  /** Whether the parent is loaded. Disables recorder until true. */
  isParentReady: boolean;
  /** Called once a performance is created. Caller can route to it / show toast. */
  onCreated?: (performance: Performance) => void;
  /** Close the recorder (e.g. user taps a Cancel ✕). */
  onClose?: () => void;
}

type Stage = 'idle' | 'countdown' | 'recording' | 'preview' | 'uploading' | 'done';

export function SingAlongRecorder({
  parentCreationId,
  backingTrackUrl,
  isParentReady,
  onCreated,
  onClose,
}: SingAlongRecorderProps) {
  const recorder = useAudioRecorder({ maxDurationSec: 90, backingTrackUrl });
  const [stage, setStage] = useState<Stage>('idle');
  const [countdownNum, setCountdownNum] = useState(3);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<PerformanceVisibility>('private');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync recorder state into stage transitions
  useEffect(() => {
    if (stage === 'recording' && recorder.state === 'stopped') {
      setStage('preview');
    }
    if (recorder.state === 'error' && stage !== 'idle') {
      setStage('idle');
    }
  }, [recorder.state, stage]);

  // Countdown effect
  useEffect(() => {
    if (stage !== 'countdown') return;
    if (countdownNum <= 0) {
      setStage('recording');
      void recorder.start();
      return;
    }
    const t = setTimeout(() => setCountdownNum((n) => n - 1), 800);
    return () => clearTimeout(t);
  }, [stage, countdownNum, recorder]);

  const handleStartRecording = useCallback(() => {
    if (!isParentReady) return;
    if (!recorder.isSupported) {
      setUploadError("Sorry, your browser can't record audio. Try Chrome on a desktop.");
      return;
    }
    setUploadError(null);
    setCountdownNum(3);
    setStage('countdown');
  }, [isParentReady, recorder.isSupported]);

  const handleStopRecording = useCallback(() => {
    recorder.stop();
  }, [recorder]);

  const handleRetake = useCallback(() => {
    recorder.reset();
    setCaption('');
    setStage('idle');
  }, [recorder]);

  const handleSave = useCallback(async () => {
    if (!recorder.blob || !recorder.mimeType) return;
    setStage('uploading');
    setUploadError(null);

    try {
      // 1) Pre-signed upload URL
      const urlReq: AssetUploadUrlRequest = {
        kind: 'audio',
        mimeType: recorder.mimeType,
        sizeBytes: recorder.blob.size,
        durationSec: Math.min(90, Math.round(recorder.elapsedSec)),
        sourceType: 'user_recording',
        parentRefType: 'performance',
      };
      const urlRes = await fetchWithSession('/api/assets/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urlReq),
      });
      const urlBody = await urlRes.json();
      if (!urlRes.ok || !urlBody.success) {
        throw new Error(
          urlBody.error?.message ?? 'Could not start upload. Try again?',
        );
      }
      const upload = urlBody.data as AssetUploadUrlResponse;

      // 2) Direct PUT to the storage provider
      const putRes = await fetch(upload.uploadUrl, {
        method: upload.uploadMethod,
        headers: upload.headers,
        body: recorder.blob,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status}). Please try again.`);
      }

      // 3) Finalize
      const finalizeRes = await fetchWithSession('/api/assets/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: upload.assetId }),
      });
      const finalizeBody = await finalizeRes.json();
      if (!finalizeRes.ok || !finalizeBody.success) {
        throw new Error(
          finalizeBody.error?.message ?? 'Upload finalize failed',
        );
      }
      const finalized = finalizeBody.data as AssetFinalizeResponse;

      // 4) Create the performance
      const perfRes = await fetchWithSession('/api/performances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'sing_along',
          parentCreationId,
          audioAssetId: finalized.asset.id,
          durationSec: Math.min(90, Math.round(recorder.elapsedSec)),
          caption: caption.trim() || undefined,
          visibility,
        }),
      });
      const perfBody = await perfRes.json();
      if (!perfRes.ok || !perfBody.success) {
        throw new Error(
          perfBody.error?.message ?? 'Could not save your sing-along',
        );
      }

      setStage('done');
      onCreated?.(perfBody.data.performance as Performance);
    } catch (err) {
      setStage('preview');
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [
    recorder.blob,
    recorder.mimeType,
    recorder.elapsedSec,
    parentCreationId,
    caption,
    visibility,
    onCreated,
  ]);

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border-2 border-brand-purple/30 bg-brand-purple/5 p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-brand-purple">
          Sing along!
        </h3>
        {onClose && stage !== 'recording' && stage !== 'uploading' && (
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-500 hover:text-gray-800"
            aria-label="Close recorder"
          >
            ✕
          </button>
        )}
      </div>

      {/* Loading state — backing track is being fetched/decoded */}
      {stage === 'recording' && recorder.state !== 'recording' && (
        <div className="mb-4 flex h-20 items-center justify-center gap-2 rounded-xl bg-white px-4 text-brand-purple">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">
            {backingTrackUrl ? 'Loading the song...' : 'Starting...'}
          </span>
        </div>
      )}

      {/* Live waveform — only shown while actually recording */}
      {stage === 'recording' && recorder.state === 'recording' && (
        <div className="mb-4 flex h-20 items-center justify-center gap-1 rounded-xl bg-white px-4">
          {Array.from({ length: 24 }).map((_, i) => {
            const offset = Math.abs((i - 12) / 12);
            const height = Math.max(
              4,
              recorder.liveAmplitude * 64 * (1 - offset * 0.5),
            );
            return (
              <span
                key={i}
                className="block w-1.5 rounded-full bg-brand-orange transition-[height] duration-75"
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>
      )}

      {/* Countdown */}
      {stage === 'countdown' && (
        <div className="flex h-32 items-center justify-center text-7xl font-bold text-brand-purple">
          {countdownNum > 0 ? countdownNum : 'Sing!'}
        </div>
      )}

      {/* Recording controls */}
      {stage === 'idle' && (
        <button
          type="button"
          onClick={handleStartRecording}
          disabled={!isParentReady || !recorder.isSupported}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange py-4 font-bold text-white transition-all active:scale-95',
            (!isParentReady || !recorder.isSupported) && 'cursor-not-allowed opacity-50',
          )}
        >
          <Mic className="h-5 w-5" />
          Record your voice
        </button>
      )}

      {stage === 'recording' && (
        <div className="space-y-3">
          <div className="text-center font-mono text-2xl font-bold text-brand-orange">
            {formatTime(recorder.elapsedSec)} / 1:30
          </div>
          <button
            type="button"
            onClick={handleStopRecording}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand-orange bg-white py-4 font-bold text-brand-orange transition-all active:scale-95"
          >
            <Square className="h-5 w-5 fill-current" />
            Stop
          </button>
          <p className="text-center text-xs text-gray-500">
            We&apos;ll auto-stop at 90 seconds.
          </p>
        </div>
      )}

      {/* Preview */}
      {stage === 'preview' && recorder.blobUrl && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">
              Listen to your sing-along
            </p>
            <audio
              src={recorder.blobUrl}
              controls
              className="w-full"
              preload="metadata"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Add a message <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={280}
              placeholder="My first song!"
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-base focus:border-brand-purple focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Who can see this?</p>
            <div className="flex gap-2">
              {(['private', 'public'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={cn(
                    'flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition-all',
                    visibility === v
                      ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300',
                  )}
                >
                  {v === 'private' ? 'Just me' : 'Everyone'}
                </button>
              ))}
            </div>
            {visibility === 'public' && (
              <p className="mt-2 text-xs text-gray-500">
                Your first few public posts get a quick check by a grown-up before
                showing up in Explore. Usually less than a day! ✨
              </p>
            )}
          </div>

          {uploadError && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {uploadError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRetake}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white py-3 font-bold text-gray-700 transition-all active:scale-95"
            >
              <RotateCcw className="h-5 w-5" />
              Retake
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-brand-purple py-3 font-bold text-white transition-all active:scale-95"
            >
              <Save className="h-5 w-5" />
              Save & Post
            </button>
          </div>
        </div>
      )}

      {stage === 'uploading' && (
        <div className="flex flex-col items-center gap-3 py-8 text-brand-purple">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="font-semibold">Saving your sing-along...</p>
        </div>
      )}

      {stage === 'done' && (
        <div className="flex flex-col items-center gap-3 py-8 text-brand-purple">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-purple/10 text-3xl">
            🎤
          </div>
          <p className="text-center font-bold">Your sing-along is saved!</p>
          <p className="text-center text-sm text-gray-600">
            Find it in <span className="font-semibold">My Creations → Performances</span>
          </p>
        </div>
      )}

      {/* Mic-permission / unsupported error states */}
      {recorder.error && stage === 'idle' && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          <Music2 className="h-4 w-4 shrink-0" />
          <span>{recorder.error}</span>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
