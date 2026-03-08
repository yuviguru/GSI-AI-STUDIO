import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { quizInputSchema } from '@/lib/validators';
import { filterInput, filterOutput } from '@/lib/safety/inputFilter';
import { checkRateLimit, trackCreation } from '@/lib/firebase/sessionService';
import { saveCreation } from '@/lib/firebase/creationService';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { QUIZ_SYSTEM_PROMPT, buildQuizUserPrompt } from '@/lib/ai/prompts/quizPrompt';
import type { AiXrayData, QuizContent } from '@/types';

/** Shape returned by LLM for a quiz */
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
  aiXray: {
    concept: string;
    explanation: string;
    curriculumTag: string;
  };
}

// Auto-detect which LLM to use based on available API keys
function shouldUseGroq(): boolean {
  return !!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-api');
}

/**
 * POST /api/ai/quiz
 * Generate an interactive quiz using LLM.
 * See: docs/api-contracts.md#post-apiaiquiz
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
    const input = quizInputSchema.parse(body);

    // 3. Safety filter
    filterInput(input.topic);

    // 4. Check rate limit
    await checkRateLimit(sessionId);

    // 5. Generate quiz via LLM
    const generateJson = shouldUseGroq() ? generateJsonWithGroq : generateJsonWithClaude;
    const llmResponse = await generateJson<LlmQuizResponse>({
      systemPrompt: QUIZ_SYSTEM_PROMPT,
      userMessage: buildQuizUserPrompt({
        topic: input.topic,
        format: input.format,
        difficulty: input.difficulty,
        questionCount: input.questionCount,
        ageGroup: input.ageGroup,
      }),
      maxTokens: 4096,
    });

    // 6. Safety-filter output
    const filteredQuestions = llmResponse.questions.map((q) => ({
      ...q,
      question: filterOutput(q.question),
      explanation: filterOutput(q.explanation),
      options: q.options.map((opt) => filterOutput(opt)),
      answer: filterOutput(q.answer),
    }));

    // 7. Build quiz content
    const modelName = shouldUseGroq() ? 'llama-3.3-70b' : 'claude-sonnet';
    console.log(`[Quiz] LLM: ${modelName}, Questions: ${filteredQuestions.length}`);

    const quizContent: QuizContent & { title: string } = {
      title: llmResponse.title,
      topic: llmResponse.topic,
      difficulty: llmResponse.difficulty as QuizContent['difficulty'],
      format: llmResponse.format as QuizContent['format'],
      totalQuestions: filteredQuestions.length,
      questions: filteredQuestions,
    };

    // 8. Build AI X-Ray metadata
    const aiXray: AiXrayData = {
      model: modelName,
      concept: llmResponse.aiXray.concept,
      explanation: llmResponse.aiXray.explanation,
      curriculumTag: llmResponse.aiXray.curriculumTag,
      aiPoints: 10,
    };

    // 9. Save creation to Firestore
    const { id: creationId, shareUrl } = await saveCreation({
      type: 'quiz',
      title: llmResponse.title,
      prompt: input.topic,
      content: quizContent as unknown as Record<string, unknown>,
      media: [],
      aiMetadata: aiXray as unknown as Record<string, unknown>,
      aiConceptsTaught: ['natural_language_generation', 'question_generation', 'knowledge_assessment'],
      sessionId,
      remixedFromId: input.remixedFromId,
    });

    // 10. Track creation for rate limiting
    await trackCreation(sessionId);

    return apiSuccess({ quiz: quizContent, aiXray, creationId, shareUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
