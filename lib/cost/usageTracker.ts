/**
 * Cost telemetry — every router attempt funnels through here. Writes to
 * Firestore `aiUsage` so we can build per-creation, per-provider,
 * per-MAU cost dashboards.
 *
 * Implements `RouterMetricsSink` from `lib/ai/router/LlmRouter`.
 *
 * Writes are fire-and-forget (don't block the request). Errors are swallowed
 * — telemetry must never break a creation flow.
 */

import { backend } from '@/lib/backend';
import type { RouterMetricsSink } from '@/lib/ai/router/LlmRouter';

const COLLECTION = 'aiUsage';

interface UsageDoc {
  providerName: string;
  success: boolean;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  error?: string;
  timestamp: string;
  // Caller-supplied context (filled in by an enriching wrapper).
  sessionId?: string;
  studio?: string;
  capability?: string;
}

export interface UsageContext {
  sessionId?: string;
  studio?: string;
  capability?: string;
}

class FirestoreMetricsSink implements RouterMetricsSink {
  private context: UsageContext = {};

  /**
   * Wrap a function with usage context — every recordAttempt() called
   * inside `fn` is tagged with this context.
   */
  async withContext<T>(ctx: UsageContext, fn: () => Promise<T>): Promise<T> {
    const previous = this.context;
    this.context = { ...previous, ...ctx };
    try {
      return await fn();
    } finally {
      this.context = previous;
    }
  }

  recordAttempt(event: {
    providerName: string;
    success: boolean;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    error?: string;
  }): void {
    const doc: UsageDoc = {
      ...event,
      ...this.context,
      timestamp: new Date().toISOString(),
    };
    // Fire-and-forget. Errors swallowed — telemetry must never break creation.
    backend.data
      .create<UsageDoc>(COLLECTION, null, doc)
      .catch(() => {
        // intentionally suppressed
      });
  }
}

/** Process-wide singleton. */
export const usageTracker = new FirestoreMetricsSink();

interface UsageSummary {
  totalCostUsd: number;
  totalCreations: number;
  costByProvider: Record<string, number>;
  failuresByProvider: Record<string, number>;
}

interface CachedSummary {
  windowDays: number;
  summary: UsageSummary;
  computedAtMs: number;
}

const SUMMARY_TTL_MS = 5 * 60 * 1000;
let cachedSummary: CachedSummary | null = null;

/**
 * Aggregate recent usage for the admin view. Reads up to 1000 events.
 *
 * Cached for 5 minutes per windowDays — at 100K MAU with a busy ops team
 * (1000 admin views/day) this turns 1M Firestore reads into ~290 reads/day
 * (1 read per cache miss × 12 misses/hour × 24 hours).
 */
export async function getUsageSummary(
  windowDays: number = 7,
): Promise<UsageSummary> {
  const now = Date.now();
  if (
    cachedSummary &&
    cachedSummary.windowDays === windowDays &&
    now - cachedSummary.computedAtMs < SUMMARY_TTL_MS
  ) {
    return cachedSummary.summary;
  }

  const cutoff = new Date(now - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const page = await backend.data.query<UsageDoc>(COLLECTION, {
    where: [{ field: 'timestamp', op: 'gte', value: cutoff }],
    orderBy: [{ field: 'timestamp', direction: 'desc' }],
    limit: 1000,
  });

  let totalCostUsd = 0;
  const costByProvider: Record<string, number> = {};
  const failuresByProvider: Record<string, number> = {};

  for (const event of page.items) {
    if (event.success && event.costUsd) {
      totalCostUsd += event.costUsd;
      costByProvider[event.providerName] =
        (costByProvider[event.providerName] ?? 0) + event.costUsd;
    } else if (!event.success) {
      failuresByProvider[event.providerName] =
        (failuresByProvider[event.providerName] ?? 0) + 1;
    }
  }

  const summary: UsageSummary = {
    totalCostUsd,
    totalCreations: page.items.length,
    costByProvider,
    failuresByProvider,
  };
  cachedSummary = { windowDays, summary, computedAtMs: now };
  return summary;
}
