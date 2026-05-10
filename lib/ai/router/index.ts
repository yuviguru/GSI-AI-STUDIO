/**
 * AI router singletons — one per modality (LLM / image / audio).
 *
 * Application code (capabilities, API routes) imports `llmRouter`,
 * `imageRouter`, and `audioRouter` from here. Health monitor is shared
 * across all three so the background loop probes everything in one tick.
 *
 * Provider list is built lazily so module load doesn't crash in
 * environments without env vars (Next.js build, vitest setup).
 */

import { LlmRouter } from './LlmRouter';
import { ImageRouter } from './ImageRouter';
import { AudioRouter } from './AudioRouter';
import { HealthMonitor } from './HealthMonitor';
import {
  buildLlmProviders,
  buildImageProviders,
  buildAudioProviders,
} from './config';
import { usageTracker } from '@/lib/cost/usageTracker';

export type { GenerateOptions, GenerateResult, Capability } from '@/lib/ai/ports';
export type {
  ImageGenerateOptions,
  ImageGenerateResult,
  ImageStyle,
} from '@/lib/ai/ports';
export type {
  AudioGenerateOptions,
  AudioGenerateResult,
  AudioKind,
} from '@/lib/ai/ports';
export type { CostTier } from '@/lib/ai/ports';

interface Routers {
  llm: LlmRouter;
  image: ImageRouter;
  audio: AudioRouter;
  monitor: HealthMonitor;
}

let _routers: Routers | null = null;

function build(): Routers {
  const llmProviders = buildLlmProviders();
  const imageProviders = buildImageProviders();
  const audioProviders = buildAudioProviders();

  const monitor = new HealthMonitor([
    ...llmProviders,
    ...imageProviders,
    ...audioProviders,
  ]);

  // Start the background refresh loop. unref() inside HealthMonitor.start()
  // means it won't keep the Node process alive.
  monitor.start();

  return {
    llm: new LlmRouter(llmProviders, monitor, usageTracker),
    image: new ImageRouter(imageProviders, monitor, usageTracker),
    audio: new AudioRouter(audioProviders, monitor, usageTracker),
    monitor,
  };
}

function get(): Routers {
  if (!_routers) _routers = build();
  return _routers;
}

export const llmRouter: LlmRouter = new Proxy({} as LlmRouter, {
  get(_, prop) {
    return Reflect.get(get().llm, prop);
  },
});

export const imageRouter: ImageRouter = new Proxy({} as ImageRouter, {
  get(_, prop) {
    return Reflect.get(get().image, prop);
  },
});

export const audioRouter: AudioRouter = new Proxy({} as AudioRouter, {
  get(_, prop) {
    return Reflect.get(get().audio, prop);
  },
});

export const healthMonitor: HealthMonitor = new Proxy({} as HealthMonitor, {
  get(_, prop) {
    return Reflect.get(get().monitor, prop);
  },
});
