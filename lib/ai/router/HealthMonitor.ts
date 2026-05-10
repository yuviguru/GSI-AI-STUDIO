/**
 * HealthMonitor — caches provider health so the router doesn't probe on
 * every request. Background loop refreshes every 5 min by default; reactive
 * updates from real request outcomes (`markUnhealthyFromError`) keep the
 * cache fresh between probes.
 *
 * Per-request cost: a Map lookup (sub-millisecond, zero network).
 */

import type { HealthStatus } from '@/lib/ai/ports';

export interface MonitoredProvider {
  name: string;
  healthCheck(): Promise<HealthStatus>;
}

export interface HealthMonitorOptions {
  /** How often to refresh in the background. Default: 5 minutes. */
  intervalMs?: number;
  /** After this long without a refresh, treat the cached value as stale. */
  staleAfterMs?: number;
  /** Per-probe timeout before marking unhealthy. */
  probeTimeoutMs?: number;
}

const DEFAULT_OPTS: Required<HealthMonitorOptions> = {
  intervalMs: 5 * 60 * 1000,
  staleAfterMs: 10 * 60 * 1000,
  probeTimeoutMs: 3000,
};

export class HealthMonitor {
  private readonly cache = new Map<string, HealthStatus>();
  private readonly opts: Required<HealthMonitorOptions>;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly providers: MonitoredProvider[],
    opts: HealthMonitorOptions = {},
  ) {
    this.opts = { ...DEFAULT_OPTS, ...opts };
  }

  /** Start the background refresh loop. Idempotent. */
  start(): void {
    if (this.timer) return;
    // Kick off an initial refresh — but don't await it, so module init
    // doesn't block on potentially-slow provider endpoints.
    void this.refreshAll();
    this.timer = setInterval(() => void this.refreshAll(), this.opts.intervalMs);
    // Don't keep the Node process alive just for this timer.
    if (typeof this.timer === 'object' && 'unref' in this.timer) {
      (this.timer as { unref: () => void }).unref();
    }
  }

  /** Stop the background loop. Safe to call when not started. */
  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Get the cached health status for a provider.
   *
   * Fail-open semantics for cold start: in serverless, every cold lambda
   * sees an empty cache. If we returned `healthy: false` here the very
   * first request after a cold start would throw "no healthy providers"
   * before the background probe completes. Instead we OPTIMISTICALLY
   * report healthy on first miss — the reactive `markUnhealthyFromError`
   * path catches real failures via the request itself, and the background
   * loop converges to actual health within one tick.
   *
   * If the entry IS cached but stale, we return the cached value (still
   * usable) and trigger a background refresh.
   */
  status(name: string): HealthStatus {
    const cached = this.cache.get(name);
    if (!cached) {
      // Fire-and-forget probe so we converge quickly. Don't block the request.
      void this.refresh(name);
      return { healthy: true, checkedAt: 0, reason: 'optimistic — not yet probed' };
    }
    const age = Date.now() - cached.checkedAt;
    if (age > this.opts.staleAfterMs) {
      void this.refresh(name);
      return { ...cached, reason: cached.reason ?? 'stale' };
    }
    return cached;
  }

  /** Force an immediate refresh for a single provider. */
  async refresh(name: string): Promise<void> {
    const provider = this.providers.find((p) => p.name === name);
    if (!provider) return;
    try {
      const status = await this.withTimeout(
        provider.healthCheck(),
        this.opts.probeTimeoutMs,
      );
      this.cache.set(name, { ...status, checkedAt: Date.now() });
    } catch (err) {
      this.cache.set(name, {
        healthy: false,
        checkedAt: Date.now(),
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Refresh every provider in parallel. */
  async refreshAll(): Promise<void> {
    await Promise.all(this.providers.map((p) => this.refresh(p.name)));
  }

  /** Mark a provider healthy after a successful real request. */
  markHealthy(name: string, latencyMs: number): void {
    this.cache.set(name, {
      healthy: true,
      checkedAt: Date.now(),
      latencyMs,
    });
  }

  /** Mark a provider unhealthy. Used by the router on real failures. */
  markUnhealthy(
    name: string,
    info: Partial<HealthStatus> = {},
  ): void {
    this.cache.set(name, {
      healthy: false,
      checkedAt: Date.now(),
      ...info,
    });
  }

  /**
   * Categorize an error and update health accordingly.
   *  - 429 / rate-limit → markUnhealthy with rateLimited=true + retryAfter
   *  - 401/403 → markUnhealthy (likely bad key — won't recover without intervention)
   *  - 5xx / network → markUnhealthy (transient)
   *  - other → no health change (probably a bad request, not a provider issue)
   */
  markUnhealthyFromError(name: string, err: unknown): void {
    const status = (err as { status?: number; statusCode?: number }).status
      ?? (err as { statusCode?: number }).statusCode;
    const message = err instanceof Error ? err.message : String(err);

    if (status === 429) {
      const retryAfter = (err as { headers?: Record<string, string> }).headers?.[
        'retry-after'
      ];
      const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : 60_000;
      this.markUnhealthy(name, {
        rateLimited: true,
        retryAfterMs: Date.now() + retryAfterMs,
        reason: 'rate limited',
      });
      return;
    }
    if (status === 401 || status === 403) {
      this.markUnhealthy(name, { reason: `auth failed (${status})` });
      return;
    }
    if (status && status >= 500) {
      this.markUnhealthy(name, { reason: `server error (${status})` });
      return;
    }
    if (!status) {
      // Network error / timeout / DNS — treat as transient unhealthy.
      this.markUnhealthy(name, { reason: message });
      return;
    }
    // 4xx other than auth/rate-limit — probably a bad request, not provider down.
  }

  /** All current cache entries. Useful for /admin/health. */
  snapshot(): Record<string, HealthStatus> {
    const out: Record<string, HealthStatus> = {};
    for (const [name, status] of this.cache.entries()) out[name] = status;
    return out;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }
}
