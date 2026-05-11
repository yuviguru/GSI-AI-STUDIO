/**
 * createStory capability — generates an illustrated story from a premise.
 *
 * Pure orchestration function. No HTTP, no Next.js. Callable from any
 * channel: web route, MCP tool, voice agent, WhatsApp bot, email scheduler,
 * cron job. The web route at app/api/ai/story/route.ts is now a thin
 * adapter on top of this.
 */

import { llmRouter, imageRouter } from '@/lib/ai/router';
import { saveCreation } from '@/lib/repositories/creationRepository';
import { trackCreation } from '@/lib/firebase/sessionService';
import { filterInput, filterOutput, filterImagePrompt } from '@/lib/safety/inputFilter';
import { STORY_SYSTEM_PROMPT, buildStoryUserPrompt } from '@/lib/ai/prompts/storyPrompt';
import { usageTracker } from '@/lib/cost/usageTracker';
import { persistImages } from './imageStorage';
import type { CostTier } from '@/lib/ai/ports';
import type { AiXrayData, StoryContent } from '@/types';

// 5-page stories typically generate 5 images; running them in a single
// Promise.allSettled is fine at pilot scale and saves 5-8s vs sequential
// batches. Revisit when Pixazo rate limits start to bite (~10K MAU).
const IMAGE_CONCURRENCY = 5;
const PLACEHOLDER_IMAGE = '/images/placeholder-story.svg';

export interface CreateStoryInput {
  sessionId: string;
  premise: string;
  characters?: string[];
  setting?: string;
  genre?: string;
  pages?: number;
  ageGroup?: string;
  style?: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';
  language?: 'en' | 'hi' | 'ta' | 'te' | 'kn';
  remixedFromId?: string;
  /** Cost ceiling for the LLM router. Free users → 'cheap'; Pro → 'premium'. */
  maxCostTier?: CostTier;
}

export interface CreateStoryResult {
  creationId: string;
  shareUrl: string;
  story: StoryContent & { title: string; moral: string };
  aiXray: AiXrayData;
  costUsd: number;
  durationMs: number;
}

interface LlmStoryResponse {
  title: string;
  visualStyleGuide?: string;
  characterSheet?: string;
  pages: Array<{ pageNumber: number; text: string; imagePrompt: string }>;
  genre: string;
  characters: string[];
  setting: string;
  moral: string;
  aiXray: { concept: string; explanation: string; curriculumTag: string };
}

export async function createStory(
  input: CreateStoryInput,
): Promise<CreateStoryResult> {
  return usageTracker.withContext(
    { sessionId: input.sessionId, studio: 'story', capability: 'createStory' },
    async () => {
      const start = Date.now();

      // 1. Safety
      filterInput(input.premise);

      // 2. LLM call (router picks Groq → Claude → ...)
      //    No `maxCostTier` default: web callers want the full router
      //    behavior. Setting a default of 'cheap' would exclude Claude
      //    (premium tier), so deployments with only ANTHROPIC_API_KEY would
      //    have NO eligible provider. Channels that need a ceiling (MCP,
      //    WhatsApp bot, free-plan users) pass `maxCostTier` explicitly.
      const llmResponse = await llmRouter.generateJson<LlmStoryResponse>({
        systemPrompt: STORY_SYSTEM_PROMPT,
        userMessage: buildStoryUserPrompt({
          premise: input.premise,
          characters: input.characters,
          setting: input.setting,
          genre: input.genre,
          pages: input.pages ?? 5,
          ageGroup: input.ageGroup ?? '8-12',
        }),
        maxTokens: 4096,
        routing: input.maxCostTier ? { maxCostTier: input.maxCostTier } : undefined,
      });

      // 3. Output safety filter
      const safePages = llmResponse.pages.map((p) => ({
        ...p,
        text: filterOutput(p.text),
        imagePrompt: filterImagePrompt(p.imagePrompt),
      }));

      // 4. Image generation — single seed for visual coherence across pages.
      const seed = Math.floor(Math.random() * 1_000_000);
      const styleGuide = llmResponse.visualStyleGuide?.trim() || '';
      const characterSheet = llmResponse.characterSheet?.trim() || '';
      const promptPrefix = [styleGuide, characterSheet].filter(Boolean).join(' | ');

      const imageStyle = input.style ?? 'cartoon';
      const generatedUrls = await generateImagesParallel(
        safePages.map((p) => ({
          imagePrompt: promptPrefix ? `${promptPrefix} | SCENE: ${p.imagePrompt}` : p.imagePrompt,
        })),
        imageStyle,
        seed,
      );

      // Persist any base64 / expiring URLs to object storage so the Firestore
      // doc stays small and the share link works after Replicate URLs expire.
      const imageUrls = await persistImages(generatedUrls, 'story', input.sessionId);

      // 5. Build story content
      const storyContent: StoryContent & { title: string; moral: string } = {
        title: llmResponse.title,
        pages: safePages.map((p, i) => ({
          pageNumber: p.pageNumber,
          text: p.text,
          imageUrl: imageUrls[i] ?? PLACEHOLDER_IMAGE,
        })),
        genre: llmResponse.genre,
        characters: llmResponse.characters,
        setting: llmResponse.setting,
        moral: llmResponse.moral,
      };

      // 6. AI X-Ray metadata
      const aiXray: AiXrayData = {
        model: 'router-selected', // exact provider names captured in usageTracker
        concept: llmResponse.aiXray.concept,
        explanation: llmResponse.aiXray.explanation,
        curriculumTag: llmResponse.aiXray.curriculumTag,
        aiPoints: 10,
      };

      // 7. Persist
      const { id: creationId, shareUrl } = await saveCreation({
        type: 'story',
        title: llmResponse.title,
        prompt: input.premise,
        content: storyContent as unknown as Record<string, unknown>,
        media: imageUrls
          .filter((url) => url !== PLACEHOLDER_IMAGE)
          .map((url) => ({ url, type: 'image/png', alt: 'Story illustration' })),
        thumbnail: imageUrls[0] !== PLACEHOLDER_IMAGE ? imageUrls[0] : undefined,
        aiMetadata: aiXray as unknown as Record<string, unknown>,
        aiConceptsTaught: ['natural_language_generation', 'text_to_image'],
        sessionId: input.sessionId,
        remixedFromId: input.remixedFromId,
      });

      // 8. Rate-limit accounting (legacy session service — works as-is)
      await trackCreation(input.sessionId);

      return {
        creationId,
        shareUrl,
        story: storyContent,
        aiXray,
        costUsd: 0, // Total computed by router metrics; surfaced via usageTracker.
        durationMs: Date.now() - start,
      };
    },
  );
}

async function generateImagesParallel(
  pages: Array<{ imagePrompt: string }>,
  style: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic',
  seed: number,
): Promise<string[]> {
  const urls: string[] = new Array(pages.length).fill(PLACEHOLDER_IMAGE);

  for (let i = 0; i < pages.length; i += IMAGE_CONCURRENCY) {
    const batch = pages.slice(i, i + IMAGE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((page) =>
        imageRouter.generate({
          prompt: page.imagePrompt,
          style,
          width: 768,
          height: 384,
          seed,
        }),
      ),
    );
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        urls[i + idx] = result.value.url;
      }
    });
  }

  return urls;
}
