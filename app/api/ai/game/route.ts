import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { gameInputSchema } from '@/lib/validators';
import { filterInput, filterOutput } from '@/lib/safety/inputFilter';
import { checkRateLimit, trackCreation } from '@/lib/firebase/sessionService';
import { saveCreation } from '@/lib/firebase/creationService';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { GAME_SYSTEM_PROMPT, buildGameUserPrompt } from '@/lib/ai/prompts/gamePrompt';
import { validateSceneGraph } from '@/lib/ai/validateSceneGraph';
import type { AiXrayData, GameContent } from '@/types';

/** Shape returned by LLM for a game */
interface LlmGameResponse {
  title: string;
  scenes: Array<{
    id: string;
    title: string;
    text: string;
    choices: Array<{ text: string; nextSceneId: string }>;
    isEnding: boolean;
    endingType?: 'success' | 'neutral' | 'try_again';
    endingMessage?: string;
  }>;
  setting: string;
  characterName: string;
  totalScenes: number;
  totalEndings: number;
  aiXray: {
    concept: string;
    explanation: string;
    curriculumTag: string;
  };
}

function shouldUseGroq(): boolean {
  return !!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-api');
}

/**
 * POST /api/ai/game
 * Generate a text adventure game with branching scenes and choices.
 * Text-only generation — no images for MVP.
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
    const input = gameInputSchema.parse(body);

    // 3. Safety filter
    filterInput(input.premise);

    // 4. Check rate limit
    await checkRateLimit(sessionId);

    // 5. Generate game via LLM
    const generateJson = shouldUseGroq() ? generateJsonWithGroq : generateJsonWithClaude;
    const llmResponse = await generateJson<LlmGameResponse>({
      systemPrompt: GAME_SYSTEM_PROMPT,
      userMessage: buildGameUserPrompt({
        premise: input.premise,
        setting: input.setting,
        characterName: input.characterName,
        difficulty: input.difficulty,
        ageGroup: input.ageGroup,
      }),
      maxTokens: 4096,
    });

    // 6. Safety-filter output text in each scene (strip undefined fields for Firestore)
    const filteredScenes = llmResponse.scenes.map((scene) => {
      const filtered: Record<string, unknown> = {
        id: scene.id,
        title: scene.title,
        text: filterOutput(scene.text),
        choices: scene.choices.map((c) => ({ text: filterOutput(c.text), nextSceneId: c.nextSceneId })),
        isEnding: scene.isEnding,
      };
      if (scene.endingType) filtered.endingType = scene.endingType;
      if (scene.endingMessage) filtered.endingMessage = filterOutput(scene.endingMessage);
      return filtered;
    }) as LlmGameResponse['scenes'];

    // 7. Validate scene graph integrity and prune unreachable scenes
    const startSceneId = 'scene_1';
    const prunedScenes = validateSceneGraph(filteredScenes, startSceneId);

    // 8. Build game content (using pruned scenes — only reachable nodes)
    const modelName = shouldUseGroq() ? 'llama-3.3-70b' : 'claude-sonnet';
    const gameContent: GameContent & { title: string } = {
      title: llmResponse.title,
      scenes: prunedScenes,
      startSceneId,
      totalScenes: prunedScenes.length,
      totalEndings: prunedScenes.filter((s) => s.isEnding).length,
      setting: llmResponse.setting,
      characterName: llmResponse.characterName || input.characterName || 'You',
    };

    // 9. Build AI X-Ray metadata
    const aiXray: AiXrayData = {
      model: modelName,
      concept: llmResponse.aiXray.concept || 'Decision Trees & Branching Logic',
      explanation: llmResponse.aiXray.explanation,
      curriculumTag: llmResponse.aiXray.curriculumTag,
      aiPoints: 15,
    };

    // 10. Save creation to Firestore
    const { id: creationId, shareUrl } = await saveCreation({
      type: 'game',
      title: llmResponse.title,
      prompt: input.premise,
      content: gameContent as unknown as Record<string, unknown>,
      aiMetadata: aiXray as unknown as Record<string, unknown>,
      aiConceptsTaught: ['decision_trees', 'branching_logic'],
      sessionId,
    });

    // 11. Track creation for rate limiting
    await trackCreation(sessionId);

    return apiSuccess({ game: gameContent, aiXray, creationId, shareUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
