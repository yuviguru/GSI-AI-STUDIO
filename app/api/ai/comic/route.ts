import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { comicInputSchema } from '@/lib/validators';
import { filterInput, filterOutput, filterImagePrompt } from '@/lib/safety/inputFilter';
import { checkRateLimit, trackCreation } from '@/lib/firebase/sessionService';
import { saveCreation } from '@/lib/firebase/creationService';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { getImageProvider } from '@/lib/ai/imageProvider';
import {
  COMIC_SYSTEM_PROMPT,
  COMIC_STYLE_PREFIXES,
  buildComicUserPrompt,
} from '@/lib/ai/prompts/comicPrompt';
import type { AiXrayData, ComicContent, ComicDialogue } from '@/types';

/** Shape returned by LLM for a comic */
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

/**
 * POST /api/ai/comic
 * Generate a multi-panel illustrated comic strip using LLM (script) + image generator (panels).
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

    // 4. Check rate limit
    await checkRateLimit(sessionId);

    // 5. Generate comic script via LLM
    const generateJson = shouldUseGroq() ? generateJsonWithGroq : generateJsonWithClaude;
    const llmResponse = await generateJson<LlmComicResponse>({
      systemPrompt: COMIC_SYSTEM_PROMPT,
      userMessage: buildComicUserPrompt({
        premise: input.premise,
        style: input.style,
        panelCount: input.panelCount,
        characters: input.characters,
        ageGroup: input.ageGroup,
      }),
      maxTokens: 4096,
    });

    // 6. Safety-filter all text output
    const filteredPanels = llmResponse.panels.map((panel) => ({
      ...panel,
      dialogue: panel.dialogue.map((d) => ({
        ...d,
        text: filterOutput(d.text),
      })),
      caption: filterOutput(panel.caption),
      imagePrompt: filterImagePrompt(panel.imagePrompt),
    }));

    // 7. Generate panel illustrations in parallel (batched)
    const stylePrefix = COMIC_STYLE_PREFIXES[input.style] ?? COMIC_STYLE_PREFIXES.cartoon!;
    const { imageFunction, providerName } = getImageProvider();
    console.log(`[Comic] Using image provider: ${providerName}`);

    const imageUrls = await generateComicImagesParallel(filteredPanels, stylePrefix, imageFunction);

    // 8. Build comic content
    const modelName = shouldUseGroq() ? 'llama-3.3-70b' : 'claude-sonnet';
    const comicContent: ComicContent = {
      title: llmResponse.title,
      style: input.style,
      panels: filteredPanels.map((panel, i) => ({
        panelNumber: panel.panelNumber,
        imageUrl: imageUrls[i] ?? PLACEHOLDER_IMAGE,
        dialogue: panel.dialogue as ComicDialogue[],
        caption: panel.caption || '',
        imagePrompt: panel.imagePrompt,
      })),
      characters: llmResponse.characters,
      setting: llmResponse.setting,
      synopsis: llmResponse.synopsis,
      totalPanels: filteredPanels.length,
    };

    // 9. Build AI X-Ray metadata
    const aiXray: AiXrayData = {
      model: modelName,
      concept: llmResponse.aiXray.concept || 'multimodal_ai',
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
      aiConceptsTaught: ['multimodal_ai', 'natural_language_generation', 'text_to_image'],
      sessionId,
    });

    // 11. Track creation for rate limiting
    await trackCreation(sessionId);

    return apiSuccess({ comic: comicContent, aiXray, creationId, shareUrl });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Generate comic panel images with concurrency limit */
async function generateComicImagesParallel(
  panels: Array<{ imagePrompt: string }>,
  stylePrefix: string,
  genImage: (opts: {
    prompt: string;
    style: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';
    width: number;
    height: number;
  }) => Promise<string>
): Promise<string[]> {
  const urls: string[] = new Array(panels.length).fill(PLACEHOLDER_IMAGE);

  for (let i = 0; i < panels.length; i += IMAGE_CONCURRENCY) {
    const batch = panels.slice(i, i + IMAGE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((panel) =>
        genImage({
          prompt: `${stylePrefix}, ${panel.imagePrompt}, child-friendly illustration`,
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
