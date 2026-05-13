/**
 * createGame capability — generates a branching text-adventure game.
 */

import { llmRouter } from '@gsi/ai/router';
import { saveCreation } from '@/lib/repositories/creationRepository';
import { trackCreation } from '@gsi/firebase/sessionService';
import { filterInput, filterOutput } from '@gsi/safety';
import { GAME_SYSTEM_PROMPT, buildGameUserPrompt } from '@gsi/ai/prompts/gamePrompt';
import { validateSceneGraph } from '@gsi/ai/validateSceneGraph';
import { usageTracker } from '@/lib/cost/usageTracker';
import type { CostTier } from '@gsi/ai/ports';
import type { AiXrayData, GameContent } from '@gsi/types';

export interface CreateGameInput {
  sessionId: string;
  premise: string;
  setting?: string;
  characterName?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  ageGroup?: string;
  remixedFromId?: string;
  maxCostTier?: CostTier;
}

export interface CreateGameResult {
  creationId: string;
  shareUrl: string;
  game: GameContent & { title: string };
  aiXray: AiXrayData;
  durationMs: number;
}

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
  aiXray: { concept: string; explanation: string; curriculumTag: string };
}

export async function createGame(
  input: CreateGameInput,
): Promise<CreateGameResult> {
  return usageTracker.withContext(
    { sessionId: input.sessionId, studio: 'game', capability: 'createGame' },
    async () => {
      const start = Date.now();
      filterInput(input.premise);

      const llmResponse = await llmRouter.generateJson<LlmGameResponse>({
        systemPrompt: GAME_SYSTEM_PROMPT,
        userMessage: buildGameUserPrompt({
          premise: input.premise,
          setting: input.setting,
          characterName: input.characterName,
          difficulty: input.difficulty ?? 'medium',
          ageGroup: input.ageGroup ?? '8-12',
        }),
        maxTokens: 4096,
        routing: input.maxCostTier ? { maxCostTier: input.maxCostTier } : undefined,
      });

      const safeScenes = llmResponse.scenes.map((scene) => {
        const filtered: Record<string, unknown> = {
          id: scene.id,
          title: scene.title,
          text: filterOutput(scene.text),
          choices: scene.choices.map((c) => ({
            text: filterOutput(c.text),
            nextSceneId: c.nextSceneId,
          })),
          isEnding: scene.isEnding,
        };
        if (scene.endingType) filtered.endingType = scene.endingType;
        if (scene.endingMessage) filtered.endingMessage = filterOutput(scene.endingMessage);
        return filtered;
      }) as LlmGameResponse['scenes'];

      const startSceneId = 'scene_1';
      const prunedScenes = validateSceneGraph(safeScenes, startSceneId);

      const gameContent: GameContent & { title: string } = {
        title: llmResponse.title,
        scenes: prunedScenes,
        startSceneId,
        totalScenes: prunedScenes.length,
        totalEndings: prunedScenes.filter((s) => s.isEnding).length,
        setting: llmResponse.setting,
        characterName: llmResponse.characterName || input.characterName || 'You',
      };

      const aiXray: AiXrayData = {
        model: 'router-selected',
        concept: llmResponse.aiXray.concept || 'Decision Trees & Branching Logic',
        explanation: llmResponse.aiXray.explanation,
        curriculumTag: llmResponse.aiXray.curriculumTag,
        aiPoints: 15,
      };

      const { id: creationId, shareUrl } = await saveCreation({
        type: 'game',
        title: llmResponse.title,
        prompt: input.premise,
        content: gameContent as unknown as Record<string, unknown>,
        aiMetadata: aiXray as unknown as Record<string, unknown>,
        aiConceptsTaught: ['decision_trees', 'branching_logic'],
        sessionId: input.sessionId,
        remixedFromId: input.remixedFromId,
      });

      await trackCreation(input.sessionId);

      return {
        creationId,
        shareUrl,
        game: gameContent,
        aiXray,
        durationMs: Date.now() - start,
      };
    },
  );
}
