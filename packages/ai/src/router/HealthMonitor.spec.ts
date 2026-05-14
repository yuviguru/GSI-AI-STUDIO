import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthMonitor } from './HealthMonitor';
import type { HealthStatus } from '@gsi/ai/ports';

describe('HealthMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeProvider(name: string, status: HealthStatus) {
    return {
      name,
      healthCheck: vi.fn().mockResolvedValue(status),
    };
  }

  it('fail-open on cold start: status() returns healthy=true when cache is empty', () => {
    const monitor = new HealthMonitor([
      makeProvider('p1', { healthy: true, checkedAt: Date.now() }),
    ]);
    const status = monitor.status('p1');
    expect(status.healthy).toBe(true);
    expect(status.reason).toMatch(/optimistic/);
  });

  it('fail-open triggers a background refresh', async () => {
    const probe = vi.fn().mockResolvedValue({ healthy: false, checkedAt: Date.now() });
    const monitor = new HealthMonitor([{ name: 'p1', healthCheck: probe }]);
    monitor.status('p1'); // optimistic
    // Wait for the in-flight refresh to settle.
    await vi.runAllTimersAsync();
    expect(probe).toHaveBeenCalled();
  });

  it('returns cached status when fresh', async () => {
    const monitor = new HealthMonitor([
      makeProvider('p1', { healthy: true, checkedAt: Date.now(), latencyMs: 42 }),
    ]);
    await monitor.refresh('p1');
    const status = monitor.status('p1');
    expect(status.healthy).toBe(true);
    expect(status.latencyMs).toBe(42);
    expect(status.reason).toBeUndefined();
  });

  it('marks stale when cache age exceeds staleAfterMs', async () => {
    const monitor = new HealthMonitor(
      [makeProvider('p1', { healthy: true, checkedAt: Date.now() })],
      { staleAfterMs: 100 },
    );
    await monitor.refresh('p1');
    vi.advanceTimersByTime(200);
    const status = monitor.status('p1');
    expect(status.reason).toBe('stale');
  });

  it('markUnhealthyFromError treats 429 as rate-limited', () => {
    const monitor = new HealthMonitor([
      makeProvider('p1', { healthy: true, checkedAt: Date.now() }),
    ]);
    monitor.markHealthy('p1', 50);
    monitor.markUnhealthyFromError('p1', { status: 429 });
    const status = monitor.status('p1');
    expect(status.healthy).toBe(false);
    expect(status.rateLimited).toBe(true);
  });

  it('markUnhealthyFromError treats 401/403 as auth failed', () => {
    const monitor = new HealthMonitor([
      makeProvider('p1', { healthy: true, checkedAt: Date.now() }),
    ]);
    monitor.markUnhealthyFromError('p1', { status: 403 });
    const status = monitor.status('p1');
    expect(status.healthy).toBe(false);
    expect(status.reason).toMatch(/auth failed/);
  });

  it('markUnhealthyFromError treats 5xx as server error', () => {
    const monitor = new HealthMonitor([
      makeProvider('p1', { healthy: true, checkedAt: Date.now() }),
    ]);
    monitor.markUnhealthyFromError('p1', { status: 503 });
    const status = monitor.status('p1');
    expect(status.healthy).toBe(false);
    expect(status.reason).toMatch(/server error/);
  });

  it('markUnhealthyFromError ignores 4xx other than auth/rate-limit', () => {
    const monitor = new HealthMonitor([
      makeProvider('p1', { healthy: true, checkedAt: Date.now() }),
    ]);
    monitor.markHealthy('p1', 50);
    monitor.markUnhealthyFromError('p1', { status: 400 });
    expect(monitor.status('p1').healthy).toBe(true); // bad request is not provider-down
  });
});
