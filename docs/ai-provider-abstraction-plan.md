# AI Provider Abstraction Plan (LLMs + Image + Audio)

**Date**: 2026-05-10
**Status**: Draft for review
**Goal**: Same Ports & Adapters pattern as `backend-abstraction-plan.md`, applied to AI providers. Plug any LLM (Claude / OpenAI / Groq / Ollama / OpenRouter / Together / DeepSeek / …) or any image gen (Pixazo / Replicate / ComfyUI / Pollinations / …) with one adapter file. Pick the right provider per request based on **health, cost, and priority** — without burning tokens on every probe.

---

## TL;DR

1. **Three ports**: `LlmProvider`, `ImageProvider`, `AudioProvider`. Each has `generate()` + `healthCheck()`.
2. **One smart router per port** picks the right adapter at request time, using a cached health status (refreshed in the background, NOT on every request).
3. **Health checks use free non-LLM endpoints** (`GET /v1/models`, `HEAD /`) where possible — zero tokens. Fall back to 1-token probes only for adapters with no free endpoint.
4. **One "OpenAI-compatible" adapter** covers OpenAI + DeepSeek + Together + Fireworks + OpenRouter + Ollama + vLLM + LM Studio + 90% of new LLM providers. You configure base URL + API key + model name; that's it.
5. **Effort**: 3–4 days for foundation + LLM port. ~2 days each for image and audio (they're already 80% there in `lib/ai/imageProvider.ts`).

---

## 1. Why The Same Pattern Works Here

Your `lib/ai/imageProvider.ts:64` already does exactly the right thing for images:

```ts
function getAiGenerator(): { fn: ImageFunction; name: string } {
  if (shouldUseComfyUI()) return { fn: generateImageLocal, name: 'flux-schnell-local' };
  if (isPixazoConfigured()) return { fn: generateWithPixazo, name: 'pixazo-flux-schnell' };
  if (shouldUseReplicate()) return { fn: generateImage, name: 'sdxl' };
  return { fn: generateImageFree, name: 'pollinations' };
}
```

This is a **router with priority + capability detection**, just hardcoded. We need to:
1. Formalize the function signature into a `Provider` interface.
2. Add a `healthCheck()` method.
3. Replace the hardcoded if-chain with a config-driven router.
4. Apply the same to LLMs and audio.

---

## 2. The Ports

### 2.1 `LlmProvider`

```ts
// lib/ai/ports/LlmProvider.ts

export type CostTier = 'free' | 'cheap' | 'standard' | 'premium';
export type Capability = 'text' | 'json' | 'tool-use' | 'vision' | 'long-context';

export interface GenerateOptions {
  systemPrompt?: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  schema?: object; // JSON schema for structured output
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;        // computed; 0 for free providers
  providerName: string;   // e.g. "claude-sonnet-4"
  latencyMs: number;
}

export interface HealthStatus {
  healthy: boolean;
  checkedAt: number;       // epoch ms
  latencyMs?: number;
  reason?: string;         // populated when unhealthy
  rateLimited?: boolean;
  retryAfterMs?: number;
}

export interface LlmProvider {
  readonly name: string;            // "claude-sonnet-4" | "groq-llama-3.3" | ...
  readonly priority: number;        // lower = preferred (1 = best)
  readonly costTier: CostTier;
  readonly capabilities: Capability[];
  readonly costPerMTokIn: number;   // USD
  readonly costPerMTokOut: number;  // USD

  generate(opts: GenerateOptions): Promise<GenerateResult>;
  generateJson<T>(opts: GenerateOptions): Promise<T>;
  healthCheck(): Promise<HealthStatus>;
}
```

### 2.2 `ImageProvider`

```ts
// lib/ai/ports/ImageProvider.ts

export interface ImageGenerateOptions {
  prompt: string;
  style?: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';
  width: number;
  height: number;
  seed?: number;
  negativePrompt?: string;
}

export interface ImageGenerateResult {
  url: string;
  costUsd: number;
  providerName: string;
  latencyMs: number;
}

export interface ImageProvider {
  readonly name: string;
  readonly priority: number;
  readonly costTier: CostTier;
  readonly costPerImage: number;

  generate(opts: ImageGenerateOptions): Promise<ImageGenerateResult>;
  healthCheck(): Promise<HealthStatus>;
}
```

### 2.3 `AudioProvider`

Same shape — `generate()` returns audio URL, `healthCheck()` returns availability.

---

## 3. The Health Check Strategy (Your Key Question)

**Don't probe on every request.** That's slow and wastes budget. Instead:

### 3.1 Background health monitor

```ts
// lib/ai/router/HealthMonitor.ts

export class HealthMonitor {
  private cache = new Map<string, HealthStatus>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private providers: { name: string; healthCheck: () => Promise<HealthStatus> }[],
    private intervalMs: number = 5 * 60 * 1000, // every 5 min
    private staleAfterMs: number = 10 * 60 * 1000, // assume stale after 10 min
  ) {}

  start() {
    this.refreshAll();
    this.timer = setInterval(() => this.refreshAll(), this.intervalMs);
  }

  status(name: string): HealthStatus {
    const cached = this.cache.get(name);
    if (!cached) return { healthy: false, checkedAt: 0, reason: 'not yet probed' };
    if (Date.now() - cached.checkedAt > this.staleAfterMs) {
      // Stale — assume healthy but trigger background refresh
      this.refresh(name);
      return { ...cached, reason: 'stale' };
    }
    return cached;
  }

  async refresh(name: string) {
    const p = this.providers.find((x) => x.name === name);
    if (!p) return;
    try {
      const status = await Promise.race([
        p.healthCheck(),
        timeout(3000, { healthy: false, checkedAt: Date.now(), reason: 'timeout' }),
      ]);
      this.cache.set(name, status);
    } catch (err) {
      this.cache.set(name, { healthy: false, checkedAt: Date.now(), reason: String(err) });
    }
  }

  async refreshAll() {
    await Promise.all(this.providers.map((p) => this.refresh(p.name)));
  }
}
```

**Per request**: just read the cache (zero cost, sub-millisecond). The 5-min refresh runs in the background.

### 3.2 What each provider's `healthCheck()` actually calls

The key insight you raised: **most providers have a free endpoint that returns "yes I exist and your key works" without spending any LLM tokens.**

| Provider | Cheap health-check endpoint | Token cost |
|---|---|---|
| **Anthropic (Claude)** | `GET https://api.anthropic.com/v1/models` | **0 tokens** |
| **OpenAI** | `GET https://api.openai.com/v1/models` | **0 tokens** |
| **Groq** | `GET https://api.groq.com/openai/v1/models` | **0 tokens** |
| **OpenRouter** | `GET https://openrouter.ai/api/v1/models` | **0 tokens** |
| **Together AI** | `GET https://api.together.xyz/v1/models` | **0 tokens** |
| **DeepSeek** | `GET https://api.deepseek.com/v1/models` | **0 tokens** |
| **Ollama (local)** | `GET http://localhost:11434/api/tags` | **0 tokens** |
| **vLLM / LM Studio** | `GET <base>/v1/models` | **0 tokens** |
| **Pixazo** | `GET https://pixazo.com/api/status` (or `HEAD /`) | **0 cost** |
| **Replicate** | `GET https://api.replicate.com/v1/account` | **0 cost** |
| **Pollinations** | `HEAD https://image.pollinations.ai` | **0 cost** |
| **ComfyUI (local)** | `GET http://localhost:8188/system_stats` | **0 cost** |
| **Gemini (audio)** | `GET https://generativelanguage.googleapis.com/v1beta/models` | **0 tokens** |

**Default health-check implementation** for OpenAI-compatible providers (covers 9 of the 13 above):

```ts
async healthCheck(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(3000),
    });
    return {
      healthy: res.ok,
      checkedAt: Date.now(),
      latencyMs: Date.now() - start,
      rateLimited: res.status === 429,
      retryAfterMs: res.headers.get('retry-after')
        ? Number(res.headers.get('retry-after')) * 1000
        : undefined,
      reason: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { healthy: false, checkedAt: Date.now(), reason: String(err) };
  }
}
```

### 3.3 What if a provider has NO free endpoint?

Last resort: **1-token probe**.

```ts
async healthCheck(): Promise<HealthStatus> {
  // 1-token probe — costs ~$0.00001
  const result = await this.generate({ userMessage: 'hi', maxTokens: 1 });
  return { healthy: true, checkedAt: Date.now(), latencyMs: result.latencyMs };
}
```

At 5-min intervals = 288 probes/day = ~$0.003/day. Acceptable, but every provider on our list has a free endpoint, so we shouldn't need this.

### 3.4 Reactive health updates (bonus)

Beyond the 5-min loop, also update health from real request outcomes:

```ts
// In the router's generate() method:
try {
  const result = await provider.generate(opts);
  monitor.markHealthy(provider.name, result.latencyMs);
  return result;
} catch (err) {
  if (isRateLimit(err)) {
    monitor.markUnhealthy(provider.name, { rateLimited: true, retryAfterMs: getRetryAfter(err) });
  } else if (isAuthError(err)) {
    monitor.markUnhealthy(provider.name, { reason: 'auth failed' });
  }
  throw err;
}
```

**This is the killer combo**: you get instant feedback when a provider goes down, and the background loop catches when it comes back. No wasted requests.

---

## 4. The Router (Priority + Health-Aware)

```ts
// lib/ai/router/LlmRouter.ts

export class LlmRouter {
  constructor(
    private providers: LlmProvider[],            // sorted by priority
    private monitor: HealthMonitor,
  ) {}

  /** Pick the highest-priority healthy provider matching capabilities. */
  pick(opts: { capability?: Capability; maxCostTier?: CostTier } = {}): LlmProvider {
    const candidates = this.providers
      .filter((p) => !opts.capability || p.capabilities.includes(opts.capability))
      .filter((p) => !opts.maxCostTier || tierAtMost(p.costTier, opts.maxCostTier))
      .filter((p) => this.monitor.status(p.name).healthy)
      .sort((a, b) => a.priority - b.priority);

    if (!candidates.length) {
      throw new Error('No healthy LLM provider available');
    }
    return candidates[0];
  }

  /** Generate with auto-pick + retry on next-best provider on failure. */
  async generate(opts: GenerateOptions, hint?: { maxCostTier?: CostTier }): Promise<GenerateResult> {
    const tried = new Set<string>();
    let lastErr: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      const provider = this.pickExcluding(tried, hint);
      tried.add(provider.name);
      try {
        return await provider.generate(opts);
      } catch (err) {
        lastErr = err;
        this.monitor.markUnhealthyFromError(provider.name, err);
        // loop tries next provider
      }
    }
    throw new Error(`All LLM providers failed: ${lastErr}`);
  }
}
```

### 4.1 Cost-aware routing

For the kid platform, you want **free providers for free-tier users, paid for Pro**. The `maxCostTier` hint enables that:

```ts
// In a route handler:
const router = getLlmRouter();
const result = await router.generate(
  { systemPrompt: STORY_PROMPT, userMessage: prompt, maxTokens: 4096 },
  { maxCostTier: user.plan === 'free' ? 'cheap' : 'premium' },
);
```

Free users → Groq (free). If Groq is rate-limited, router falls through to Claude (paid). Pro users → Claude first, fall back to Groq if Claude is down.

---

## 5. The "OpenAI-Compatible" Mega-Adapter

The single highest-leverage adapter you can build. **One file** covers OpenAI, DeepSeek, Together, Fireworks, OpenRouter, Ollama, vLLM, LM Studio, and most new LLM providers — because they all expose the same API shape.

```ts
// lib/ai/adapters/openaiCompatible.ts

import OpenAI from 'openai';
import type { LlmProvider, GenerateOptions, GenerateResult, HealthStatus } from '../ports/LlmProvider';

export interface OpenAiCompatibleConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  priority: number;
  costTier: 'free' | 'cheap' | 'standard' | 'premium';
  costPerMTokIn: number;
  costPerMTokOut: number;
  capabilities?: Capability[];
}

export function makeOpenAiCompatibleProvider(cfg: OpenAiCompatibleConfig): LlmProvider {
  const client = new OpenAI({ baseURL: cfg.baseUrl, apiKey: cfg.apiKey });

  return {
    name: cfg.name,
    priority: cfg.priority,
    costTier: cfg.costTier,
    capabilities: cfg.capabilities ?? ['text', 'json'],
    costPerMTokIn: cfg.costPerMTokIn,
    costPerMTokOut: cfg.costPerMTokOut,

    async generate(opts) {
      const start = Date.now();
      const res = await client.chat.completions.create({
        model: cfg.model,
        messages: [
          ...(opts.systemPrompt ? [{ role: 'system' as const, content: opts.systemPrompt }] : []),
          { role: 'user', content: opts.userMessage },
        ],
        max_tokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.7,
        response_format: opts.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      });

      const inputTokens = res.usage?.prompt_tokens ?? 0;
      const outputTokens = res.usage?.completion_tokens ?? 0;
      return {
        text: res.choices[0]?.message?.content ?? '',
        inputTokens,
        outputTokens,
        costUsd:
          (inputTokens / 1_000_000) * cfg.costPerMTokIn +
          (outputTokens / 1_000_000) * cfg.costPerMTokOut,
        providerName: cfg.name,
        latencyMs: Date.now() - start,
      };
    },

    async generateJson(opts) {
      const result = await this.generate({ ...opts, responseFormat: 'json' });
      return JSON.parse(result.text);
    },

    async healthCheck() {
      const start = Date.now();
      try {
        const res = await fetch(`${cfg.baseUrl}/models`, {
          headers: { Authorization: `Bearer ${cfg.apiKey}` },
          signal: AbortSignal.timeout(3000),
        });
        return {
          healthy: res.ok,
          checkedAt: Date.now(),
          latencyMs: Date.now() - start,
          rateLimited: res.status === 429,
        };
      } catch (err) {
        return { healthy: false, checkedAt: Date.now(), reason: String(err) };
      }
    },
  };
}
```

### Configuring providers becomes trivial

```ts
// lib/ai/config.ts

const providers: OpenAiCompatibleConfig[] = [
  {
    name: 'groq-llama-3.3',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY!,
    model: 'llama-3.3-70b-versatile',
    priority: 1,                // try first
    costTier: 'free',
    costPerMTokIn: 0,
    costPerMTokOut: 0,
  },
  {
    name: 'deepseek-v3',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: 'deepseek-chat',
    priority: 2,
    costTier: 'cheap',
    costPerMTokIn: 0.14,
    costPerMTokOut: 0.28,
  },
  {
    name: 'openai-gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
    priority: 3,
    costTier: 'standard',
    costPerMTokIn: 0.15,
    costPerMTokOut: 0.60,
  },
  // ...
];
```

**Anthropic (Claude) needs a separate adapter** because the Messages API isn't OpenAI-compatible — but it's the only outlier. Same `LlmProvider` interface, different implementation file: `lib/ai/adapters/anthropic.ts`.

---

## 6. Image + Audio Routers — Same Pattern

Same `Router + HealthMonitor + adapters` setup for `ImageProvider` and `AudioProvider`. Your existing `lib/ai/imageProvider.ts` becomes `lib/ai/router/ImageRouter.ts`. The current four providers each get a thin adapter file:

```
lib/ai/adapters/images/
  comfyui.ts      ← health: GET http://localhost:8188/system_stats
  pixazo.ts       ← health: GET https://pixazo.com/api/status (PRIMARY)
  replicate.ts    ← health: GET https://api.replicate.com/v1/account
  pollinations.ts ← health: HEAD https://image.pollinations.ai
```

The `getAiGenerator()` function in `lib/ai/imageProvider.ts:64` becomes a 3-liner:

```ts
const router = new ImageRouter([comfyui, pixazo, replicate, pollinations], monitor);
const result = await router.generate({ prompt, style, width, height });
```

---

## 7. Config-Driven Provider Lists

`.env`-based selection so non-developers can change providers without code changes:

```bash
# .env

# LLMs — comma-separated, in priority order
LLM_PROVIDERS=groq-llama-3.3,claude-sonnet-4,deepseek-v3,openai-gpt-4o-mini

# Images — same
IMAGE_PROVIDERS=pixazo,comfyui,replicate,pollinations

# Audio
AUDIO_PROVIDERS=gemini

# Health check interval
AI_HEALTH_CHECK_INTERVAL_MS=300000

# Per-tier cost ceilings (router won't pick above ceiling)
LLM_FREE_USER_MAX_TIER=cheap
LLM_PRO_USER_MAX_TIER=premium
```

The provider config (model name, base URL, prices) stays in code (`lib/ai/config.ts`) since it's structured data that needs type safety. The `.env` just selects which configured providers are active and in what order.

---

## 8. Telemetry (Free Bonus)

Since every provider's `generate()` already returns `costUsd`, `providerName`, `inputTokens`, `outputTokens`, `latencyMs` — log them per request:

```ts
// In your route handler:
const result = await router.generate(opts);
await trackUsage({
  sessionId,
  studio: 'story',
  provider: result.providerName,
  costUsd: result.costUsd,
  latencyMs: result.latencyMs,
});
```

Now you have **per-creation cost data** for the break-even analysis in `docs/infra-cost-and-migration-plan.md`. You'll know exactly when free providers are saturating and you start spending on Claude/OpenAI.

---

## 9. Phased Plan

### Phase 0 — Foundation (1–2 days)
1. Create `lib/ai/ports/{LlmProvider,ImageProvider,AudioProvider,HealthStatus}.ts`.
2. Create `lib/ai/router/HealthMonitor.ts`.
3. Create `lib/ai/router/LlmRouter.ts` + `ImageRouter.ts`.

### Phase 1 — LLM adapters (1–2 days)
1. `lib/ai/adapters/anthropic.ts` (port the existing Claude client behind the new interface).
2. `lib/ai/adapters/openaiCompatible.ts` (the mega-adapter — Groq + OpenAI + DeepSeek + OpenRouter + Ollama all use this).
3. `lib/ai/config.ts` with the provider list.
4. Wire up the router in API routes (`app/api/ai/story/route.ts`, etc.).

### Phase 2 — Image adapters (1 day)
1. Port the four existing image providers to the new interface.
2. Replace `getImageProvider()` with `imageRouter`.

### Phase 3 — Audio adapter (½ day)
1. `lib/ai/adapters/gemini.ts` for Gemini TTS/music.

### Phase 4 — Telemetry (½ day)
1. `lib/cost/usageTracker.ts` writes every generate() result to a `aiUsage` collection.
2. Build a `/admin/usage` page with rolling cost-per-creation, cost-per-MAU.

**Total: ~5 days** to ship the whole thing. Less if you skip telemetry (don't skip telemetry).

---

## 10. Open Questions / Decisions

1. **Should the router try fallback providers automatically, or fail fast?**
   I'd say **fallback for `free` tier (Groq goes down → fall back to next free), fail fast for `premium`** (Claude goes down → tell the user to retry, don't silently spend on a different provider). Configurable per call.

2. **Anthropic (Claude) has prompt caching — do we expose it through the port?**
   Yes — add an optional `cacheControl?: 'ephemeral'` field to `GenerateOptions`. OpenAI-compatible adapters ignore it; Anthropic adapter uses it. Don't normalize away genuine capability differences.

3. **Should we abstract embedding providers too?**
   We don't use embeddings yet, but if we add semantic search ever (e.g. "find similar creations"), yes — same pattern. Defer until needed.

4. **Streaming responses?**
   Currently we don't stream (responses are short JSON). When we add chat or long-form streaming, add a `generateStream()` method that returns an async iterable. Defer until needed.

---

## 11. What I'd Do This Week

Pair this with the backend abstraction plan (`backend-abstraction-plan.md`):

- **Backend abstraction** — 3–5 days, do it now while the codebase is small
- **AI provider abstraction** — 5 days, also do now (largest leverage; you'll be experimenting with providers constantly during pilot)

Both together = ~10 days of focused work. After that, swapping any backend OR any AI provider is one-config-line + one-adapter-file. You'll never have to touch business logic for a provider change again.

---

## 12. Source References

- Current image routing (the model for this design): `lib/ai/imageProvider.ts:64`
- Claude client to port: `lib/ai/claudeClient.ts:30`
- Groq client to port: `lib/ai/groqClient.ts`
- Image clients to port: `lib/ai/{pixazoClient,replicateClient,pollinationsClient,comfyuiClient}.ts`
- Audio (Gemini) to port: `lib/ai/musicClient.ts`
- Companion plan: `docs/backend-abstraction-plan.md`
- Cost context: `docs/infra-cost-and-migration-plan.md`
