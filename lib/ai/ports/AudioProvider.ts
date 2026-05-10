/**
 * AudioProvider port — backend-neutral audio (music + TTS) generation.
 *
 * Today: Gemini (TTS-class). Future: ElevenLabs, Sarvam Bulbul (Indian
 * languages), Azure TTS, Google Cloud TTS.
 */

import type { HealthStatus, ProviderMeta } from './common';

export type AudioKind = 'music' | 'tts' | 'speech-to-music';

export interface AudioGenerateOptions {
  kind: AudioKind;
  /** Text prompt (lyrics/story for music; spoken text for TTS). */
  prompt: string;
  /** Target duration in seconds — providers may not honor exactly. */
  durationSec?: number;
  /** Voice identifier (provider-specific, e.g. 'rachel', 'bulbul-hi-female'). */
  voice?: string;
  /** Language code (BCP-47 e.g. 'en', 'hi', 'ta'). */
  language?: string;
  /** Music-only — genre hint. */
  genre?: string;
  /** Music-only — instruments hint. */
  instruments?: string[];
}

export interface AudioGenerateResult {
  /** Public URL or data URI of the audio file. */
  url: string;
  /** Actual duration in seconds. */
  durationSec: number;
  /** USD cost. */
  costUsd: number;
  providerName: string;
  latencyMs: number;
}

export interface AudioProvider extends ProviderMeta {
  /** Per-second cost for the dominant kind this provider handles. */
  readonly costPerSec: number;
  readonly supportedKinds: AudioKind[];

  generate(opts: AudioGenerateOptions): Promise<AudioGenerateResult>;
  healthCheck(): Promise<HealthStatus>;
}
