import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { storyInputSchema } from '@/lib/validators';
import { filterInput, filterOutput, filterImagePrompt } from '@/lib/safety/inputFilter';
import { checkRateLimit, trackCreation } from '@/lib/firebase/sessionService';
import { saveCreation } from '@/lib/firebase/creationService';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { generateImage } from '@/lib/ai/replicateClient';
import { STORY_SYSTEM_PROMPT, buildStoryUserPrompt } from '@/lib/ai/prompts/storyPrompt';
import type { AiXrayData, StoryContent } from '@/types';

/** Shape Claude returns for a story */
interface ClaudeStoryResponse {
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

/**
 * POST /api/ai/story
 * Generate an illustrated story using Claude (text) + Replicate (images).
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

    // 5. Generate story text via Claude
    const claudeResponse = await generateJsonWithClaude<ClaudeStoryResponse>({
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

    // 6. Safety-filter Claude output
    const filteredPages = claudeResponse.pages.map((page) => ({
      ...page,
      text: filterOutput(page.text),
      imagePrompt: filterImagePrompt(page.imagePrompt),
    }));

    // 7. Generate illustrations in parallel (batched)
    const imageUrls = await generateImagesParallel(filteredPages, input.style);

    // 8. Build story content
    const storyContent: StoryContent & { title: string; moral: string } = {
      title: claudeResponse.title,
      pages: filteredPages.map((page, i) => ({
        pageNumber: page.pageNumber,
        text: page.text,
        imageUrl: imageUrls[i] ?? PLACEHOLDER_IMAGE,
      })),
      genre: claudeResponse.genre,
      characters: claudeResponse.characters,
      setting: claudeResponse.setting,
      moral: claudeResponse.moral,
    };

    // 9. Build AI X-Ray metadata
    const aiXray: AiXrayData = {
      model: 'claude-sonnet',
      concept: claudeResponse.aiXray.concept,
      explanation: claudeResponse.aiXray.explanation,
      curriculumTag: claudeResponse.aiXray.curriculumTag,
      aiPoints: 10,
    };

    // 10. Save creation to Firestore
    const { id: creationId, shareUrl } = await saveCreation({
      type: 'story',
      title: claudeResponse.title,
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
  style: string
): Promise<string[]> {
  const urls: string[] = new Array(pages.length).fill(PLACEHOLDER_IMAGE);

  for (let i = 0; i < pages.length; i += IMAGE_CONCURRENCY) {
    const batch = pages.slice(i, i + IMAGE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((page) =>
        generateImage({
          prompt: page.imagePrompt,
          style: style as 'watercolor' | 'cartoon' | 'pixel-art' | 'comic',
          width: 768,
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
