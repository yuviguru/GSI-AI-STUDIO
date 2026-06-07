/**
 * AI provider configuration — declarative list of every provider we know how
 * to talk to, with priority, cost tier, and pricing metadata.
 *
 * The active set is selected by env vars:
 *   LLM_PROVIDERS   = "groq-llama-3.3,claude-sonnet,deepseek-v3"  (priority order)
 *   IMAGE_PROVIDERS = "pixazo,replicate,pollinations"
 *   AUDIO_PROVIDERS = "gemini-lyria"
 *
 * If an env var is omitted, all providers with valid credentials are auto-selected
 * in their declared default priority order.
 */

import type { LlmProvider, ImageProvider, AudioProvider } from '@gsi/ai/ports';
import { makeAnthropicProvider } from '@gsi/ai/adapters/llm/anthropic';
import { makeOpenAiCompatibleProvider } from '@gsi/ai/adapters/llm/openaiCompatible';
import { makePixazoProvider } from '@gsi/ai/adapters/image/pixazo';
import { makePixazoQwenProvider } from '@gsi/ai/adapters/image/pixazoQwen';
import { makeReplicateProvider } from '@gsi/ai/adapters/image/replicate';
import { makePollinationsProvider } from '@gsi/ai/adapters/image/pollinations';
import { makeComfyUiProvider } from '@gsi/ai/adapters/image/comfyui';
import { makeNanoBananaProvider } from '@gsi/ai/adapters/image/nanoBanana';
import { makeGptImageProvider } from '@gsi/ai/adapters/image/gptImage';
import { makeGeminiAudioProvider } from '@gsi/ai/adapters/audio/gemini';

// ── LLM provider catalog ────────────────────────────────────────────

interface LlmCatalogEntry {
  name: string;
  /** Build the provider if env credentials exist; return null otherwise. */
  build: () => LlmProvider | null;
  /** Default priority when env var doesn't pin an order. */
  defaultPriority: number;
}

const LLM_CATALOG: LlmCatalogEntry[] = [
  {
    name: 'groq-llama-3.3',
    defaultPriority: 1,
    build: () => {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return null;
      return makeOpenAiCompatibleProvider({
        name: 'groq-llama-3.3',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey,
        model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
        priority: 1,
        costTier: 'free',
        costPerMTokIn: 0,
        costPerMTokOut: 0,
      });
    },
  },
  {
    name: 'claude-sonnet',
    defaultPriority: 2,
    build: () => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey || !apiKey.startsWith('sk-ant')) return null;
      return makeAnthropicProvider({
        name: 'claude-sonnet',
        apiKey,
        model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
        priority: 2,
        costTier: 'premium',
        costPerMTokIn: 3,
        costPerMTokOut: 15,
      });
    },
  },
  {
    name: 'deepseek-v3',
    defaultPriority: 3,
    build: () => {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) return null;
      return makeOpenAiCompatibleProvider({
        name: 'deepseek-v3',
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey,
        model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
        priority: 3,
        costTier: 'cheap',
        costPerMTokIn: 0.14,
        costPerMTokOut: 0.28,
      });
    },
  },
  {
    name: 'openai-gpt-4o-mini',
    defaultPriority: 4,
    build: () => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return null;
      return makeOpenAiCompatibleProvider({
        name: 'openai-gpt-4o-mini',
        baseUrl: 'https://api.openai.com/v1',
        apiKey,
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        priority: 4,
        costTier: 'standard',
        costPerMTokIn: 0.15,
        costPerMTokOut: 0.6,
      });
    },
  },
  {
    name: 'openrouter',
    defaultPriority: 5,
    build: () => {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) return null;
      return makeOpenAiCompatibleProvider({
        name: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey,
        model: process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct',
        priority: 5,
        costTier: 'cheap',
        costPerMTokIn: 0.5,
        costPerMTokOut: 0.8,
      });
    },
  },
  {
    name: 'ollama-local',
    defaultPriority: 0, // highest priority when present (local = fastest, free)
    build: () => {
      const baseUrl = process.env.OLLAMA_URL;
      if (!baseUrl) return null;
      return makeOpenAiCompatibleProvider({
        name: 'ollama-local',
        baseUrl: `${baseUrl.replace(/\/$/, '')}/v1`,
        apiKey: 'ollama',
        authScheme: 'none',
        supportsJsonMode: false,
        model: process.env.OLLAMA_MODEL ?? 'llama3.3',
        priority: 0,
        costTier: 'free',
        costPerMTokIn: 0,
        costPerMTokOut: 0,
      });
    },
  },
];

// ── Image provider catalog ─────────────────────────────────────────

interface ImageCatalogEntry {
  name: string;
  build: () => ImageProvider | null;
  defaultPriority: number;
}

const IMAGE_CATALOG: ImageCatalogEntry[] = [
  {
    name: 'comfyui',
    defaultPriority: 0,
    build: () => {
      const baseUrl = process.env.COMFYUI_URL;
      if (!baseUrl) return null;
      return makeComfyUiProvider({ baseUrl, priority: 0 });
    },
  },
  {
    name: 'pixazo',
    defaultPriority: 1,
    build: () => {
      const apiKey = process.env.PIXAZO_API_KEY;
      if (!apiKey || apiKey.includes('REPLACE')) return null;
      return makePixazoProvider({ priority: 1 });
    },
  },
  {
    // Reference-conditioned EDIT model (identity-preserving). Same Pixazo key.
    // Selected only for reference requests — never the txt2img cascade.
    name: 'pixazo-qwen-edit',
    defaultPriority: 2,
    build: () => {
      const apiKey = process.env.PIXAZO_API_KEY;
      if (!apiKey || apiKey.includes('REPLACE')) return null;
      return makePixazoQwenProvider({ priority: 2 });
    },
  },
  {
    name: 'replicate',
    defaultPriority: 3,
    build: () => {
      const apiToken = process.env.REPLICATE_API_TOKEN;
      if (!apiToken || apiToken.includes('your-token')) return null;
      return makeReplicateProvider({ apiToken, priority: 3 });
    },
  },
  {
    name: 'pollinations',
    defaultPriority: 4,
    build: () => makePollinationsProvider({ priority: 4 }),
  },
  {
    // PREMIUM reference-capable (identity-preserving across pages). Last-resort
    // in the txt2img cascade; primary for the Premium book quality tier. Gated.
    name: 'nano-banana',
    defaultPriority: 5,
    build: () => {
      if (!process.env.GEMINI_API_KEY) return null;
      return makeNanoBananaProvider({ priority: 5 });
    },
  },
  {
    name: 'gpt-image',
    defaultPriority: 6,
    build: () => {
      if (!process.env.OPENAI_API_KEY) return null;
      return makeGptImageProvider({ priority: 6 });
    },
  },
];

// ── Audio provider catalog ─────────────────────────────────────────

interface AudioCatalogEntry {
  name: string;
  build: () => AudioProvider | null;
  defaultPriority: number;
}

const AUDIO_CATALOG: AudioCatalogEntry[] = [
  {
    name: 'gemini-lyria',
    defaultPriority: 1,
    build: () => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return null;
      return makeGeminiAudioProvider({ apiKey, priority: 1 });
    },
  },
];

// ── Selection ──────────────────────────────────────────────────────

function selectProviders<P extends { name: string; priority: number }>(
  catalog: Array<{ name: string; build: () => P | null; defaultPriority: number }>,
  envVar: string,
): P[] {
  const envOrder = process.env[envVar]
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (envOrder?.length) {
    // Use env order — provider's priority becomes its position in the list.
    const out: P[] = [];
    envOrder.forEach((name, idx) => {
      const entry = catalog.find((c) => c.name === name);
      if (!entry) {
        console.warn(`[ai/config] Unknown provider in ${envVar}: "${name}"`);
        return;
      }
      const provider = entry.build();
      if (!provider) {
        console.warn(
          `[ai/config] Provider "${name}" listed in ${envVar} but credentials missing — skipping`,
        );
        return;
      }
      // Override the provider's priority with its env position.
      (provider as { priority: number }).priority = idx;
      out.push(provider);
    });
    return out;
  }

  // No env override — auto-select every provider with valid credentials, in default priority order.
  return catalog
    .map((c) => c.build())
    .filter((p): p is P => p !== null)
    .sort((a, b) => a.priority - b.priority);
}

export function buildLlmProviders(): LlmProvider[] {
  return selectProviders(LLM_CATALOG, 'LLM_PROVIDERS');
}

export function buildImageProviders(): ImageProvider[] {
  return selectProviders(IMAGE_CATALOG, 'IMAGE_PROVIDERS');
}

export function buildAudioProviders(): AudioProvider[] {
  return selectProviders(AUDIO_CATALOG, 'AUDIO_PROVIDERS');
}
