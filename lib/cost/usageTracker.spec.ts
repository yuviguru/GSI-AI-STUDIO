/**
 * usageTracker concurrency test — proves AsyncLocalStorage isolates
 * context across overlapping async flows. The pre-fix singleton-field
 * implementation would fail this test (event from request A would carry
 * the sessionId from request B if B set its context while A awaited).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn().mockResolvedValue('doc-id');

vi.mock('@/lib/backend', () => ({
  backend: {
    data: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { usageTracker } from './usageTracker';

describe('usageTracker.withContext concurrency', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it('isolates context across overlapping async flows (no cross-talk)', async () => {
    // Flow A and Flow B run concurrently. Each sets its own sessionId,
    // awaits a microtask, then records. Without AsyncLocalStorage, A's
    // recordAttempt would tag with B's sessionId.
    const flowA = usageTracker.withContext({ sessionId: 'A', studio: 'story' }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      usageTracker.recordAttempt({
        providerName: 'p',
        success: true,
        latencyMs: 1,
      });
    });

    const flowB = usageTracker.withContext({ sessionId: 'B', studio: 'quiz' }, async () => {
      await new Promise((r) => setTimeout(r, 1));
      usageTracker.recordAttempt({
        providerName: 'p',
        success: true,
        latencyMs: 1,
      });
    });

    await Promise.all([flowA, flowB]);

    // mockCreate was called twice — once per flow.
    expect(mockCreate).toHaveBeenCalledTimes(2);
    const docs = mockCreate.mock.calls.map((c) => c[2] as { sessionId: string; studio: string });
    const sessionIds = docs.map((d) => d.sessionId).sort();
    const studios = docs.map((d) => d.studio).sort();
    // Both flows recorded with their own context (no cross-talk).
    expect(sessionIds).toEqual(['A', 'B']);
    expect(studios).toEqual(['quiz', 'story']);
  });

  it('nested withContext inherits outer + overrides specific fields', async () => {
    await usageTracker.withContext({ sessionId: 'outer', studio: 'story' }, async () => {
      await usageTracker.withContext({ studio: 'quiz' }, async () => {
        usageTracker.recordAttempt({
          providerName: 'p',
          success: true,
          latencyMs: 1,
        });
      });
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const doc = mockCreate.mock.calls[0]![2] as { sessionId: string; studio: string };
    expect(doc.sessionId).toBe('outer'); // inherited from outer
    expect(doc.studio).toBe('quiz'); // overridden by inner
  });

  it('recordAttempt outside any withContext writes with no context tags', async () => {
    usageTracker.recordAttempt({
      providerName: 'p',
      success: true,
      latencyMs: 1,
    });
    // Drain the fire-and-forget microtask.
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCreate).toHaveBeenCalledOnce();
    const doc = mockCreate.mock.calls[0]![2] as Record<string, unknown>;
    expect(doc.sessionId).toBeUndefined();
    expect(doc.studio).toBeUndefined();
  });
});
