import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { comicInputSchema } from '@/lib/validators';
import { filterInput, filterOutput, filterImagePrompt } from '@/lib/safety/inputFilter';
import { checkRateLimit, trackCreation } from '@/lib/firebase/sessionService';
import { saveCreation } from '@/lib/firebase/creationService';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { generateImage } from '@/lib/ai/replicateClient';
import { generateImageFree } from '@/lib/ai/pollinationsClient';
import { generateImageLocal } from '@/lib/ai/comfyuiClient';
import {
  COMIC_SYSTEM_PROMPT,
  COMIC_STYLE_PREFIXES,
  buildComicUserPrompt,
} from '@/lib/ai/prompts/comicPrompt';
import type { AiXrayData, ComicContent } from '@/types';

/** Shape returned by LLM for a comic */
interface LlmComicResponse {
  title: string;
  panels: Array<{
    panelNumber: number;
    description: string;
    caption?: string;
    dialogue: Array<{ character: string; text: string; position: 'left' | 'right' | 'center' }>;
  }>;
  characters: Array<{ name: string; description: string }>;
  setting: string;
  aiXray: {
    concept: string;
    explanation: string;
    curriculumTag: string;
  };
}

const IMAGE_CONCURRENCY = 3;
const PLACEHOLDER_IMAGE = '/images/placeholder-story.png';

function shouldUseGroq(): boolean {
  return !!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-api');
}

function shouldUseComfyUI(): boolean {
  return !!process.env.COMFYUI_URL;
}

function shouldUseReplicate(): boolean {
  return !!process.env.REPLICATE_API_TOKEN && !process.env.REPLICATE_API_TOKEN?.includes('your-token');
}

/**
 * POST /api/ai/comic
 * Generate a multi-panel illustrated comic with dialogue and captions.
 * Auto-selects free providers (Groq + Pollinations) when paid API keys aren't configured.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate session
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    // 2. Parse and validate input
    const body = await request.json();
    const input = comicInputSchema.parse(body);

    // 3. Safety filter
    filterInput(input.premise);
    for (const char of input.characters) {
      filterInput(char.name);
      if (char.description) filterInput(char.description);
    }

    // 4. Check rate limit
    await checkRateLimit(sessionId);

    // 5. Generate comic text via LLM
    const generateJson = shouldUseGroq() ? generateJsonWithGroq : generateJsonWithClaude;
    const llmResponse = await generateJson<LlmComicResponse>({
      systemPrompt: COMIC_SYSTEM_PROMPT,
      userMessage: buildComicUserPrompt({
        premise: input.premise,
        characters: input.characters,
        panelCount: input.panelCount,
        style: input.style,
        ageGroup: input.ageGroup,
      }),
      maxTokens: 4096,
    });

    // 6. Safety-filter output
    const filteredPanels = llmResponse.panels.map((panel) => ({
      ...panel,
      description: filterImagePrompt(panel.description),
      caption: panel.caption ? filterOutput(panel.caption) : undefined,
      dialogue: panel.dialogue.map((d) => ({
        ...d,
        text: filterOutput(d.text),
      })),
    }));

    // 7. Generate panel illustrations in parallel (batched)
    const stylePrefix = COMIC_STYLE_PREFIXES[input.style] ?? COMIC_STYLE_PREFIXES.cartoon;
    const genImage = shouldUseComfyUI() ? generateImageLocal : shouldUseReplicate() ? generateImage : generateImageFree;
    const imageUrls = await generateImagesParallel(filteredPanels, stylePrefix!, genImage);

    // 8. Build comic content
    const imageProvider = shouldUseComfyUI() ? 'flux-schnell-local' : shouldUseReplicate() ? 'sdxl' : 'pollinations';
    console.log(`[Comic] Using image provider: ${imageProvider}`);
    const modelName = shouldUseGroq() ? 'llama-3.3-70b' : 'claude-sonnet';
    const comicContent: ComicContent & { title: string } = {
      title: llmResponse.title,
      panels: filteredPanels.map((panel, i) => ({
        panelNumber: panel.panelNumber,
        imageUrl: imageUrls[i] ?? PLACEHOLDER_IMAGE,
        caption: panel.caption,
        dialogue: panel.dialogue,
        description: panel.description,
      })),
      characters: llmResponse.characters,
      setting: llmResponse.setting,
      style: input.style,
      totalPanels: input.panelCount,
    };

    // 9. Build AI X-Ray metadata
    const aiXray: AiXrayData = {
      model: modelName,
      concept: llmResponse.aiXray.concept,
      explanation: llmResponse.aiXray.explanation,
      curriculumTag: llmResponse.aiXray.curriculumTag,
      aiPoints: 12,
    };

    // 10. Save creation to Firestore
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
      aiConceptsTaught: ['multimodal_generation', 'text_to_image', 'visual_storytelling'],
      sessionId,
      remixedFromId: input.remixedFromId,
    });

    // 11. Track creation for rate limiting
    await trackCreation(sessionId);

    return apiSuccess({ comic: comicContent, aiXray, creationId, shareUrl });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Generate images in parallel with concurrency limit */
async function generateImagesParallel(
  panels: Array<{ description: string }>,
  stylePrefix: string,
  genImage: (opts: { prompt: string; style: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic'; width: number; height: number }) => Promise<string>
): Promise<string[]> {
  const urls: string[] = new Array(panels.length).fill(PLACEHOLDER_IMAGE);

  for (let i = 0; i < panels.length; i += IMAGE_CONCURRENCY) {
    const batch = panels.slice(i, i + IMAGE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((panel) =>
        genImage({
          prompt: `${stylePrefix}, comic panel: ${panel.description}`,
          style: 'comic',
          width: 512,
          height: 512,
        })
      )
    );
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        urls[i + idx] = result.value;
      }
    });
  }

  return urls;
}
