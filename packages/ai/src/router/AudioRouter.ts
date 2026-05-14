/**
 * AudioRouter — same pattern as LlmRouter / ImageRouter, for music + TTS.
 */

import type {
  AudioProvider,
  AudioGenerateOptions,
  AudioGenerateResult,
  AudioKind,
  CostTier,
} from '@gsi/ai/ports';
import { tierAtMost } from '@gsi/ai/ports';
import type { HealthMonitor } from './HealthMonitor';
import type { RouterMetricsSink } from './LlmRouter';

export interface AudioPickHints {
  kind?: AudioKind;
  maxCostTier?: CostTier;
  exclude?: Set<string>;
}

export interface RouterAudioGenerateOptions extends AudioGenerateOptions {
  routing?: AudioPickHints;
  maxAttempts?: number;
}

export class AudioRouter {
  constructor(
    private readonly providers: AudioProvider[],
    private readonly monitor: HealthMonitor,
    private readonly metrics?: RouterMetricsSink,
  ) {}

  pick(hints: AudioPickHints = {}): AudioProvider {
    const excluded = hints.exclude ?? new Set();
    const candidates = this.providers
      .filter((p) => !excluded.has(p.name))
      .filter((p) => !hints.kind || p.supportedKinds.includes(hints.kind))
      .filter((p) => !hints.maxCostTier || tierAtMost(p.costTier, hints.maxCostTier))
      .filter((p) => this.monitor.status(p.name).healthy)
      .sort((a, b) => a.priority - b.priority);

    if (candidates.length === 0) {
      throw new Error(
        `No healthy audio provider available${
          hints.kind ? ` for kind '${hints.kind}'` : ''
        }`,
      );
    }
    return candidates[0]!;
  }

  async generate(opts: RouterAudioGenerateOptions): Promise<AudioGenerateResult> {
    const tried = new Set<string>(opts.routing?.exclude ?? []);
    const maxAttempts = opts.maxAttempts ?? this.providers.length;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let provider: AudioProvider;
      try {
        provider = this.pick({ ...opts.routing, kind: opts.kind, exclude: tried });
      } catch (err) {
        if (attempt === 0) throw err;
        break;
      }
      tried.add(provider.name);

      try {
        const result = await provider.generate(opts);
        this.monitor.markHealthy(provider.name, result.latencyMs);
        this.metrics?.recordAttempt({
          providerName: result.providerName,
          success: true,
          latencyMs: result.latencyMs,
          costUsd: result.costUsd,
        });
        return result;
      } catch (err) {
        lastError = err;
        this.monitor.markUnhealthyFromError(provider.name, err);
        this.metrics?.recordAttempt({
          providerName: provider.name,
          success: false,
          latencyMs: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    throw new Error(
      `All audio providers failed: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }
}
