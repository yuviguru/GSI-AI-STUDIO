/**
 * Gemini audio adapter — wraps the existing Lyria RealTime music client
 * behind the AudioProvider port.
 *
 * Currently supports `kind: 'music'`. TTS support will be added when we
 * integrate Gemini's TTS endpoint (or switch to Sarvam Bulbul for Indian
 * languages).
 */

import { generateMusic } from '@gsi/ai/musicClient';
import type {
  AudioProvider,
  AudioGenerateOptions,
  AudioGenerateResult,
  HealthStatus,
} from '@gsi/ai/ports';

export interface GeminiAudioConfig {
  name?: string;
  apiKey: string;
  priority?: number;
  /** Per-second cost. Lyria RealTime is currently free preview. */
  costPerSec?: number;
}

export function makeGeminiAudioProvider(cfg: GeminiAudioConfig): AudioProvider {
  const name = cfg.name ?? 'gemini-lyria';
  const priority = cfg.priority ?? 1;
  const costPerSec = cfg.costPerSec ?? 0;

  return {
    name,
    priority,
    costTier: costPerSec === 0 ? 'free' : 'cheap',
    costPerSec,
    supportedKinds: ['music'],

    async generate(opts: AudioGenerateOptions): Promise<AudioGenerateResult> {
      if (opts.kind !== 'music') {
        throw new Error(
          `gemini-lyria only supports kind='music', got '${opts.kind}'`,
        );
      }
      const start = Date.now();
      const result = await generateMusic({
        styleDescription: opts.prompt,
        duration: opts.durationSec ?? 30,
        mood: 'happy',
        genre: opts.genre ?? 'pop',
      });
      return {
        url: result.audioUrl,
        durationSec: result.duration,
        costUsd: result.duration * costPerSec,
        providerName: name,
        latencyMs: Date.now() - start,
      };
    },

    async healthCheck(): Promise<HealthStatus> {
      const start = Date.now();
      try {
        const res = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models?key=' + cfg.apiKey,
          {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
          },
        );
        return {
          healthy: res.ok,
          checkedAt: Date.now(),
          latencyMs: Date.now() - start,
          rateLimited: res.status === 429,
          reason: res.ok ? undefined : `HTTP ${res.status}`,
        };
      } catch (err) {
        return {
          healthy: false,
          checkedAt: Date.now(),
          reason: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
