/**
 * createComic capability — generates a multi-panel illustrated comic.
 */

import { llmRouter, imageRouter } from '@gsi/ai/router';
import { saveCreation } from '@/lib/repositories/creationRepository';
import { trackCreation } from '@gsi/firebase/sessionService';
import { filterInput, filterOutput, filterImagePrompt } from '@gsi/safety';
import {
  COMIC_SYSTEM_PROMPT,
  COMIC_STYLE_PREFIXES,
  buildComicUserPrompt,
} from '@gsi/ai/prompts/comicPrompt';
import { usageTracker } from '@/lib/cost/usageTracker';
import { persistImages } from './imageStorage';
import type { CostTier } from '@gsi/ai/ports';
import type { AiXrayData, ComicContent, ComicDialogue } from '@gsi/types';

const IMAGE_CONCURRENCY = 5;
const PLACEHOLDER_IMAGE = '/images/placeholder-story.svg';

export interface CreateComicInput {
  sessionId: string;
  premise: string;
  style: 'manga' | 'cartoon' | 'superhero' | 'indie' | 'chibi';
  panelCount?: number;
  characters?: string[];
  ageGroup?: string;
  remixedFromId?: string;
  maxCostTier?: CostTier;
}

export interface CreateComicResult {
  creationId: string;
  shareUrl: string;
  comic: ComicContent;
  aiXray: AiXrayData;
  durationMs: number;
}

interface LlmComicResponse {
  title: string;
  panels: Array<{
    panelNumber: number;
    dialogue: Array<{ character: string; text: string; position: 'left' | 'right' | 'center' }>;
    caption: string;
    imagePrompt: string;
  }>;
  characters: Array<{ name: string; description: string }>;
  setting: string;
  synopsis: string;
  aiXray: { concept: string; explanation: string; curriculumTag: string };
}

export async function createComic(
  input: CreateComicInput,
): Promise<CreateComicResult> {
  return usageTracker.withContext(
    { sessionId: input.sessionId, studio: 'comic', capability: 'createComic' },
    async () => {
      const start = Date.now();
      filterInput(input.premise);

      const llmResponse = await llmRouter.generateJson<LlmComicResponse>({
        systemPrompt: COMIC_SYSTEM_PROMPT,
        userMessage: buildComicUserPrompt({
          premise: input.premise,
          style: input.style,
          panelCount: input.panelCount ?? 4,
          characters: input.characters,
          ageGroup: input.ageGroup ?? '8-12',
        }),
        maxTokens: 4096,
        routing: input.maxCostTier ? { maxCostTier: input.maxCostTier } : undefined,
      });

      const safePanels = llmResponse.panels.map((p) => ({
        ...p,
        dialogue: p.dialogue.map((d) => ({ ...d, text: filterOutput(d.text) })),
        caption: filterOutput(p.caption),
        imagePrompt: filterImagePrompt(p.imagePrompt),
      }));

      const stylePrefix = COMIC_STYLE_PREFIXES[input.style] ?? COMIC_STYLE_PREFIXES.cartoon!;
      const generatedUrls = await generatePanelsParallel(safePanels, stylePrefix);
      // Persist base64/expiring URLs — comics are the worst offender for
      // Firestore doc bloat (4 panels × 200KB inline = ~800KB/doc).
      const imageUrls = await persistImages(generatedUrls, 'comic', input.sessionId);

      const comicContent: ComicContent = {
        title: llmResponse.title,
        style: input.style,
        panels: safePanels.map((p, i) => ({
          panelNumber: p.panelNumber,
          imageUrl: imageUrls[i] ?? PLACEHOLDER_IMAGE,
          dialogue: p.dialogue as ComicDialogue[],
          caption: p.caption || '',
          imagePrompt: p.imagePrompt,
        })),
        characters: llmResponse.characters,
        setting: llmResponse.setting,
        synopsis: llmResponse.synopsis,
        totalPanels: safePanels.length,
      };

      const aiXray: AiXrayData = {
        model: 'router-selected',
        concept: llmResponse.aiXray.concept || 'multimodal_ai',
        explanation: llmResponse.aiXray.explanation,
        curriculumTag: llmResponse.aiXray.curriculumTag,
        aiPoints: 12,
      };

      const { id: creationId, shareUrl } = await saveCreation({
        type: 'comic',
        title: llmResponse.title,
        prompt: input.premise,
        content: comicContent as unknown as Record<string, unknown>,
        media: imageUrls
          .filter((url) => url !== PLACEHOLDER_IMAGE)
          .map((url) => ({ url, type: 'image/png', alt: 'Comic panel illustration' })),
        thumbnail: imageUrls[0] !== PLACEHOLDER_IMAGE ? imageUrls[0] : undefined,
        aiMetadata: aiXray as unknown as Record<string, unknown>,
        aiConceptsTaught: ['multimodal_ai', 'natural_language_generation', 'text_to_image'],
        sessionId: input.sessionId,
        remixedFromId: input.remixedFromId,
      });

      await trackCreation(input.sessionId);

      return {
        creationId,
        shareUrl,
        comic: comicContent,
        aiXray,
        durationMs: Date.now() - start,
      };
    },
  );
}

async function generatePanelsParallel(
  panels: Array<{ imagePrompt: string }>,
  stylePrefix: string,
): Promise<string[]> {
  const urls: string[] = new Array(panels.length).fill(PLACEHOLDER_IMAGE);
  for (let i = 0; i < panels.length; i += IMAGE_CONCURRENCY) {
    const batch = panels.slice(i, i + IMAGE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((p) =>
        imageRouter.generate({
          prompt: `${stylePrefix} ${p.imagePrompt}`,
          style: 'comic',
          width: 768,
          height: 768,
        }),
      ),
    );
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') urls[i + idx] = r.value.url;
    });
  }
  return urls;
}
