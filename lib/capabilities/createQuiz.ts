/**
 * createQuiz capability — generates an interactive quiz from a topic.
 */

import { llmRouter } from '@/lib/ai/router';
import { saveCreation } from '@/lib/repositories/creationRepository';
import { trackCreation } from '@/lib/firebase/sessionService';
import { filterInput, filterOutput } from '@/lib/safety/inputFilter';
import { QUIZ_SYSTEM_PROMPT, buildQuizUserPrompt } from '@/lib/ai/prompts/quizPrompt';
import { usageTracker } from '@/lib/cost/usageTracker';
import type { CostTier } from '@/lib/ai/ports';
import type { AiXrayData, QuizContent } from '@gsi/types';

export interface CreateQuizInput {
  sessionId: string;
  topic: string;
  format?: 'trivia' | 'true_false' | 'fill_blank' | 'adventure';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  questionCount?: number;
  ageGroup?: string;
  remixedFromId?: string;
  maxCostTier?: CostTier;
}

export interface CreateQuizResult {
  creationId: string;
  shareUrl: string;
  quiz: QuizContent & { title: string };
  aiXray: AiXrayData;
  durationMs: number;
}

interface LlmQuizResponse {
  title: string;
  topic: string;
  difficulty: string;
  format: string;
  questions: Array<{
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }>;
  aiXray: { concept: string; explanation: string; curriculumTag: string };
}

export async function createQuiz(
  input: CreateQuizInput,
): Promise<CreateQuizResult> {
  return usageTracker.withContext(
    { sessionId: input.sessionId, studio: 'quiz', capability: 'createQuiz' },
    async () => {
      const start = Date.now();
      filterInput(input.topic);

      const llmResponse = await llmRouter.generateJson<LlmQuizResponse>({
        systemPrompt: QUIZ_SYSTEM_PROMPT,
        userMessage: buildQuizUserPrompt({
          topic: input.topic,
          format: input.format ?? 'trivia',
          difficulty: input.difficulty ?? 'beginner',
          questionCount: input.questionCount ?? 10,
          ageGroup: input.ageGroup ?? '8-12',
        }),
        maxTokens: 4096,
        routing: input.maxCostTier ? { maxCostTier: input.maxCostTier } : undefined,
      });

      const safeQuestions = llmResponse.questions.map((q) => ({
        ...q,
        question: filterOutput(q.question),
        explanation: filterOutput(q.explanation),
        options: q.options.map(filterOutput),
        answer: filterOutput(q.answer),
      }));

      const quizContent: QuizContent & { title: string } = {
        title: llmResponse.title,
        topic: llmResponse.topic,
        difficulty: llmResponse.difficulty as QuizContent['difficulty'],
        format: llmResponse.format as QuizContent['format'],
        totalQuestions: safeQuestions.length,
        questions: safeQuestions,
      };

      const aiXray: AiXrayData = {
        model: 'router-selected',
        concept: llmResponse.aiXray.concept,
        explanation: llmResponse.aiXray.explanation,
        curriculumTag: llmResponse.aiXray.curriculumTag,
        aiPoints: 10,
      };

      const { id: creationId, shareUrl } = await saveCreation({
        type: 'quiz',
        title: llmResponse.title,
        prompt: input.topic,
        content: quizContent as unknown as Record<string, unknown>,
        media: [],
        aiMetadata: aiXray as unknown as Record<string, unknown>,
        aiConceptsTaught: [
          'natural_language_generation',
          'question_generation',
          'knowledge_assessment',
        ],
        sessionId: input.sessionId,
        remixedFromId: input.remixedFromId,
      });

      await trackCreation(input.sessionId);

      return {
        creationId,
        shareUrl,
        quiz: quizContent,
        aiXray,
        durationMs: Date.now() - start,
      };
    },
  );
}
