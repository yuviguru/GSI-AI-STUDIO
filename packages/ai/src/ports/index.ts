/**
 * AI provider ports — backend-neutral interfaces.
 *
 * Application code (capabilities, API routes) imports the routers from
 * `@/lib/ai/router`, which use these ports under the hood. Adapters
 * implement the ports and live in `lib/ai/adapters/{llm,image,audio}/*`.
 */

export type {
  CostTier,
  HealthStatus,
  ProviderMeta,
} from './common';
export { COST_TIER_RANK, tierAtMost } from './common';

export type {
  LlmProvider,
  GenerateOptions,
  GenerateResult,
  Capability,
} from './LlmProvider';

export type {
  ImageProvider,
  ImageGenerateOptions,
  ImageGenerateResult,
  ImageStyle,
} from './ImageProvider';

export type {
  AudioProvider,
  AudioGenerateOptions,
  AudioGenerateResult,
  AudioKind,
} from './AudioProvider';
