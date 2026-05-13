/**
 * createMusic capability — generates a song (lyrics + audio).
 *
 * Note: this currently still wraps `generateMusic` from the legacy
 * musicClient because the audio adapter layer is in place but the upload
 * pipeline (`uploadBuffer` / `attachAssetToParent`) has Firebase-specific
 * helpers we haven't ported. The architecture is correct — the storage
 * port can swap independently when needed.
 */

import { llmRouter, audioRouter } from '@gsi/ai/router';
import { saveCreation } from '@/lib/repositories/creationRepository';
import { trackCreation } from '@gsi/firebase/sessionService';
import { filterInput, filterOutput } from '@gsi/safety';
import { uploadBuffer, attachAssetToParent } from '@/lib/storage/assetService';
import { MUSIC_SYSTEM_PROMPT, buildMusicUserPrompt } from '@gsi/ai/prompts/musicPrompt';
import { usageTracker } from '@/lib/cost/usageTracker';
import { generateMusic } from '@gsi/ai/musicClient';
import type { AudioGenerateResult, CostTier } from '@gsi/ai/ports';
import type { AiXrayData, MusicContent } from '@gsi/types';

export interface CreateMusicInput {
  sessionId: string;
  mood: string;
  genre: string;
  theme?: string;
  duration?: number;
  instruments?: string[];
  lyricsPrompt?: string;
  ageGroup?: string;
  remixedFromId?: string;
  maxCostTier?: CostTier;
}

export interface CreateMusicResult {
  creationId: string;
  shareUrl: string;
  music: MusicContent & { title: string; waveformData: number[] };
  aiXray: AiXrayData;
  durationMs: number;
}

interface LlmMusicResponse {
  title: string;
  lyrics: string;
  bpm: number;
  styleDescription: string;
  aiXray: { concept: string; explanation: string; curriculumTag: string };
}

export async function createMusic(
  input: CreateMusicInput,
): Promise<CreateMusicResult> {
  return usageTracker.withContext(
    { sessionId: input.sessionId, studio: 'music', capability: 'createMusic' },
    async () => {
      const start = Date.now();
      if (input.theme) filterInput(input.theme);
      if (input.lyricsPrompt) filterInput(input.lyricsPrompt);

      // 1. LLM — lyrics + style description.
      const llmResponse = await llmRouter.generateJson<LlmMusicResponse>({
        systemPrompt: MUSIC_SYSTEM_PROMPT,
        userMessage: buildMusicUserPrompt({
          mood: input.mood,
          genre: input.genre,
          theme: input.theme,
          duration: input.duration ?? 30,
          instruments: input.instruments,
          lyricsPrompt: input.lyricsPrompt,
          ageGroup: input.ageGroup ?? '8-12',
        }),
        maxTokens: 2048,
        routing: input.maxCostTier ? { maxCostTier: input.maxCostTier } : undefined,
      });

      const filteredLyrics = filterOutput(llmResponse.lyrics);
      const filteredStyle = filterOutput(llmResponse.styleDescription);

      // 2. Audio — try the router first; fall back to the legacy
      //    generateMusic() chain (Lyria → Replicate → mock) when the
      //    router has no eligible adapter (e.g. deployment with only
      //    REPLICATE_API_TOKEN, or local dev with no audio key at all).
      //    The legacy client has multi-provider fallbacks the audio
      //    adapter layer doesn't currently expose.
      const audioResult = await generateAudioWithFallback({
        prompt: filteredStyle,
        durationSec: input.duration ?? 30,
        mood: input.mood,
        genre: input.genre,
      });

      // 3. Persist audio to assets layer (rehosts so external URLs don't expire).
      let audioAssetId: string | undefined;
      let publicAudioUrl = audioResult.url;
      try {
        const buffer = await audioUrlToBuffer(audioResult.url);
        const { mimeType } = detectAudioFormat(audioResult.url);
        const asset = await uploadBuffer({
          buffer,
          kind: 'audio',
          mimeType,
          sourceType: 'ai_generated',
          parentRefType: 'creation',
          ownerSessionId: input.sessionId,
          durationSec: audioResult.durationSec,
          visibility: 'public',
        });
        audioAssetId = asset.id;
        publicAudioUrl = asset.publicUrl;
      } catch (err) {
        console.warn(
          '[createMusic] Asset persistence failed, using in-memory URL:',
          err instanceof Error ? err.message : err,
        );
      }

      // Music client doesn't return waveform — derive a flat default.
      // The client can recompute from the audio buffer client-side.
      const waveformData = new Array(50).fill(0.5);

      const musicContent: MusicContent & { title: string; waveformData: number[] } = {
        title: llmResponse.title,
        audioAssetId,
        audioUrl: publicAudioUrl,
        duration: audioResult.durationSec,
        lyrics: filteredLyrics,
        bpm: llmResponse.bpm,
        genre: input.genre,
        mood: input.mood,
        instruments: input.instruments ?? [],
        waveformData,
      };

      const aiXray: AiXrayData = {
        model: 'router-selected',
        concept: llmResponse.aiXray.concept,
        explanation: llmResponse.aiXray.explanation,
        curriculumTag: llmResponse.aiXray.curriculumTag,
        aiPoints: 15,
      };

      const isDataUri = publicAudioUrl.startsWith('data:');
      const savableContent: Record<string, unknown> = {
        title: musicContent.title,
        audioAssetId,
        duration: musicContent.duration,
        genre: musicContent.genre,
        mood: musicContent.mood,
        lyrics: musicContent.lyrics,
        instruments: musicContent.instruments,
        bpm: musicContent.bpm,
      };
      if (!isDataUri) savableContent.audioUrl = publicAudioUrl;

      const { id: creationId, shareUrl } = await saveCreation({
        type: 'music',
        title: llmResponse.title,
        prompt: input.theme ?? `${input.mood} ${input.genre}`,
        content: savableContent,
        media: isDataUri
          ? []
          : [{ url: publicAudioUrl, type: 'audio/mpeg', alt: `${llmResponse.title} audio` }],
        aiMetadata: aiXray as unknown as Record<string, unknown>,
        aiConceptsTaught: ['generative_ai', 'text_to_music', 'pattern_recognition_audio'],
        sessionId: input.sessionId,
        remixedFromId: input.remixedFromId,
      });

      if (audioAssetId) {
        await attachAssetToParent(audioAssetId, 'creation', creationId).catch(() => undefined);
      }

      await trackCreation(input.sessionId);

      return {
        creationId,
        shareUrl,
        music: musicContent,
        aiXray,
        durationMs: Date.now() - start,
      };
    },
  );
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Generate music via the audio router, falling back to the legacy
 * generateMusic() chain when no router providers are available.
 *
 * The audio router only registers `gemini-lyria` today (in
 * lib/ai/router/config.ts). Without GEMINI_API_KEY the router throws
 * "no healthy audio provider available", but `generateMusic` still has
 * a working Replicate path AND a built-in mock for dev. We keep using
 * the router when Gemini is present so cost telemetry tags Lyria
 * usage, and fall back transparently otherwise.
 */
async function generateAudioWithFallback(opts: {
  prompt: string;
  durationSec: number;
  mood: string;
  genre: string;
}): Promise<AudioGenerateResult> {
  try {
    return await audioRouter.generate({
      kind: 'music',
      prompt: opts.prompt,
      durationSec: opts.durationSec,
      genre: opts.genre,
    });
  } catch (err) {
    // Router has no eligible provider (or all unhealthy). Fall back to
    // the legacy multi-provider client.
    console.warn(
      '[createMusic] audio router unavailable, falling back to legacy generateMusic:',
      err instanceof Error ? err.message : err,
    );
    const start = Date.now();
    const legacy = await generateMusic({
      styleDescription: opts.prompt,
      duration: opts.durationSec,
      mood: opts.mood,
      genre: opts.genre,
    });
    return {
      url: legacy.audioUrl,
      durationSec: legacy.duration,
      costUsd: 0, // unknown — legacy client doesn't surface cost
      providerName: `legacy-${legacy.provider}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function audioUrlToBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const commaIdx = url.indexOf(',');
    if (commaIdx === -1) throw new Error('Invalid data URI');
    const meta = url.slice(5, commaIdx);
    const payload = url.slice(commaIdx + 1);
    if (meta.includes(';base64')) return Buffer.from(payload, 'base64');
    return Buffer.from(decodeURIComponent(payload), 'utf-8');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function detectAudioFormat(url: string): { mimeType: string } {
  if (url.startsWith('data:')) {
    const m = url.match(/^data:([^;,]+)/);
    if (m && m[1]) return { mimeType: m[1] };
  }
  if (url.endsWith('.mp3')) return { mimeType: 'audio/mpeg' };
  if (url.endsWith('.wav')) return { mimeType: 'audio/wav' };
  if (url.endsWith('.ogg')) return { mimeType: 'audio/ogg' };
  if (url.endsWith('.webm')) return { mimeType: 'audio/webm' };
  return { mimeType: 'audio/mpeg' };
}
