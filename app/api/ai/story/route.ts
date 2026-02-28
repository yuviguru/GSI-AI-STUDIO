import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { storyInputSchema } from '@/lib/validators';
import { filterInput, filterOutput, filterImagePrompt } from '@/lib/safety/inputFilter';
import { checkRateLimit, trackCreation } from '@/lib/firebase/sessionService';
import { saveCreation } from '@/lib/firebase/creationService';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { generateImage } from '@/lib/ai/replicateClient';
import { generateImageFree } from '@/lib/ai/pollinationsClient';
import { generateImageLocal } from '@/lib/ai/comfyuiClient';
import { STORY_SYSTEM_PROMPT, buildStoryUserPrompt } from '@/lib/ai/prompts/storyPrompt';
import type { AiXrayData, StoryContent } from '@/types';

/** Shape returned by LLM for a story */
interface LlmStoryResponse {
  title: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    imagePrompt: string;
  }>;
  genre: string;
  characters: string[];
  setting: string;
  moral: string;
  aiXray: {
    concept: string;
    explanation: string;
    curriculumTag: string;
  };
}

const IMAGE_CONCURRENCY = 3;
const PLACEHOLDER_IMAGE = '/images/placeholder-story.png';

// Auto-detect which providers to use based on available API keys
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
 * POST /api/ai/story
 * Generate an illustrated story using LLM (text) + image generator (illustrations).
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
    const input = storyInputSchema.parse(body);

    // 3. Safety filter
    filterInput(input.premise);

    // 4. Check rate limit
    await checkRateLimit(sessionId);

    // 5. Generate story text via LLM
    const generateJson = shouldUseGroq() ? generateJsonWithGroq : generateJsonWithClaude;
    const llmResponse = await generateJson<LlmStoryResponse>({
      systemPrompt: STORY_SYSTEM_PROMPT,
      userMessage: buildStoryUserPrompt({
        premise: input.premise,
        characters: input.characters,
        setting: input.setting,
        genre: input.genre,
        pages: input.pages,
        ageGroup: input.ageGroup,
      }),
      maxTokens: 4096,
    });

    // 6. Safety-filter output
    const filteredPages = llmResponse.pages.map((page) => ({
      ...page,
      text: filterOutput(page.text),
      imagePrompt: filterImagePrompt(page.imagePrompt),
    }));

    // 7. Generate illustrations in parallel (batched)
    const genImage = shouldUseComfyUI() ? generateImageLocal : shouldUseReplicate() ? generateImage : generateImageFree;
    const imageUrls = await generateImagesParallel(filteredPages, input.style, genImage);

    // 8. Build story content
    const imageProvider = shouldUseComfyUI() ? 'flux-schnell-local' : shouldUseReplicate() ? 'sdxl' : 'pollinations';
    console.log(`[Story] Using image provider: ${imageProvider}`);
    const modelName = shouldUseGroq() ? 'llama-3.3-70b' : 'claude-sonnet';
    const storyContent: StoryContent & { title: string; moral: string } = {
      title: llmResponse.title,
      pages: filteredPages.map((page, i) => ({
        pageNumber: page.pageNumber,
        text: page.text,
        imageUrl: imageUrls[i] ?? PLACEHOLDER_IMAGE,
      })),
      genre: llmResponse.genre,
      characters: llmResponse.characters,
      setting: llmResponse.setting,
      moral: llmResponse.moral,
    };

    // 9. Build AI X-Ray metadata
    const aiXray: AiXrayData = {
      model: modelName,
      concept: llmResponse.aiXray.concept,
      explanation: llmResponse.aiXray.explanation,
      curriculumTag: llmResponse.aiXray.curriculumTag,
      aiPoints: 10,
    };

    // 10. Save creation to Firestore
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
      sessionId,
    });

    // 11. Track creation for rate limiting
    await trackCreation(sessionId);

    return apiSuccess({ story: storyContent, aiXray, creationId, shareUrl });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Generate images in parallel with concurrency limit */
async function generateImagesParallel(
  pages: Array<{ imagePrompt: string }>,
  style: string,
  genImage: (opts: { prompt: string; style: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic'; width: number; height: number }) => Promise<string>
): Promise<string[]> {
  const urls: string[] = new Array(pages.length).fill(PLACEHOLDER_IMAGE);

  for (let i = 0; i < pages.length; i += IMAGE_CONCURRENCY) {
    const batch = pages.slice(i, i + IMAGE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((page) =>
        genImage({
          prompt: page.imagePrompt,
          style: style as 'watercolor' | 'cartoon' | 'pixel-art' | 'comic',
          width: 512,
          height: 384,
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
