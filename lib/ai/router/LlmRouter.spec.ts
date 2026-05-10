import { describe, it, expect, vi } from 'vitest';
import { LlmRouter } from './LlmRouter';
import { HealthMonitor } from './HealthMonitor';
import type { LlmProvider, GenerateResult } from '@/lib/ai/ports';

function makeProvider(opts: {
  name: string;
  priority: number;
  costTier?: 'free' | 'cheap' | 'standard' | 'premium';
  healthy?: boolean;
  generateImpl?: () => Promise<GenerateResult>;
}): LlmProvider {
  return {
    name: opts.name,
    priority: opts.priority,
    costTier: opts.costTier ?? 'free',
    capabilities: ['text', 'json'],
    costPerMTokIn: 0,
    costPerMTokOut: 0,
    generate:
      opts.generateImpl ??
      (async () => ({
        text: 'ok',
        inputTokens: 10,
        outputTokens: 5,
        costUsd: 0,
        providerName: opts.name,
        latencyMs: 1,
      })),
    generateJson: async () => ({}) as never,
    healthCheck: async () => ({ healthy: opts.healthy ?? true, checkedAt: Date.now() }),
  };
}

function makeMonitorWith(providers: LlmProvider[], allHealthy: boolean): HealthMonitor {
  const monitor = new HealthMonitor(providers);
  for (const p of providers) {
    if (allHealthy) monitor.markHealthy(p.name, 1);
    else monitor.markUnhealthy(p.name, { reason: 'down' });
  }
  return monitor;
}

describe('LlmRouter', () => {
  it('picks the highest-priority healthy provider', () => {
    const providers = [
      makeProvider({ name: 'a', priority: 5 }),
      makeProvider({ name: 'b', priority: 1 }),
      makeProvider({ name: 'c', priority: 3 }),
    ];
    const router = new LlmRouter(providers, makeMonitorWith(providers, true));
    expect(router.pick().name).toBe('b');
  });

  it('respects maxCostTier ceiling', () => {
    const providers = [
      makeProvider({ name: 'free', priority: 2, costTier: 'free' }),
      makeProvider({ name: 'premium', priority: 1, costTier: 'premium' }),
    ];
    const router = new LlmRouter(providers, makeMonitorWith(providers, true));
    expect(router.pick({ maxCostTier: 'cheap' }).name).toBe('free');
    expect(router.pick({ maxCostTier: 'premium' }).name).toBe('premium');
  });

  it('skips unhealthy providers', () => {
    const providers = [
      makeProvider({ name: 'broken', priority: 1 }),
      makeProvider({ name: 'ok', priority: 2 }),
    ];
    const monitor = new HealthMonitor(providers);
    monitor.markUnhealthy('broken', { reason: 'down' });
    monitor.markHealthy('ok', 5);
    const router = new LlmRouter(providers, monitor);
    expect(router.pick().name).toBe('ok');
  });

  it('throws when no provider is eligible', () => {
    const providers = [makeProvider({ name: 'a', priority: 1, costTier: 'premium' })];
    const router = new LlmRouter(providers, makeMonitorWith(providers, true));
    expect(() => router.pick({ maxCostTier: 'free' })).toThrow(/no healthy/i);
  });

  it('falls through to next provider on generate failure', async () => {
    const failing = makeProvider({
      name: 'fail',
      priority: 1,
      generateImpl: async () => {
        const err = new Error('boom') as Error & { status?: number };
        err.status = 503;
        throw err;
      },
    });
    const ok = makeProvider({ name: 'ok', priority: 2 });
    const monitor = new HealthMonitor([failing, ok]);
    monitor.markHealthy('fail', 1);
    monitor.markHealthy('ok', 1);

    const router = new LlmRouter([failing, ok], monitor);
    const result = await router.generate({ userMessage: 'hi' });
    expect(result.providerName).toBe('ok');
    // Failing provider should have been marked unhealthy.
    expect(monitor.status('fail').healthy).toBe(false);
  });

  it('records metrics for both successful and failed attempts', async () => {
    const sink = { recordAttempt: vi.fn() };
    const ok = makeProvider({ name: 'ok', priority: 1 });
    const monitor = new HealthMonitor([ok]);
    monitor.markHealthy('ok', 1);
    const router = new LlmRouter([ok], monitor, sink);
    await router.generate({ userMessage: 'hi' });
    expect(sink.recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ providerName: 'ok', success: true }),
    );
  });
});
