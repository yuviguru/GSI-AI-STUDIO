import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { grammarCheckSchema } from '@/lib/validators';
import { filterInput, filterOutput } from '@gsi/safety';
import { checkRateLimit, trackCreation } from '@/lib/firebase/sessionService';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import {
  BOOK_GRAMMAR_SYSTEM_PROMPT,
  buildGrammarUserPrompt,
} from '@/lib/ai/prompts/bookGrammarPrompt';
import { nanoid } from 'nanoid';
import type { GrammarSuggestion } from '@gsi/types';

interface GroqGrammarResponse {
  suggestions: Array<{
    id?: string;
    type: 'grammar' | 'spelling' | 'punctuation';
    original: string;
    suggested: string;
    explanation: string;
    startIndex: number;
    endIndex: number;
  }>;
}

/**
 * POST /api/ai/grammar-check — Get Groq grammar/spelling/punctuation suggestions.
 *
 * Strict guardrails (in BOOK_GRAMMAR_SYSTEM_PROMPT):
 * - Flags ONLY grammar/spelling/punctuation
 * - NEVER rephrases for style
 * - Preserves the kid's voice
 *
 * Counts toward the AI generation rate limit.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) {
      throw new AppException('UNAUTHORIZED', 'Missing session', 401);
    }

    const body = await request.json();
    const input = grammarCheckSchema.parse(body);

    // Safety-filter the input text
    filterInput(input.text);

    // Rate-limit AI calls (book CRUD doesn't, but AI assists do)
    await checkRateLimit(sessionId);

    const llmResponse = await generateJsonWithGroq<GroqGrammarResponse>({
      systemPrompt: BOOK_GRAMMAR_SYSTEM_PROMPT,
      userMessage: buildGrammarUserPrompt({
        text: input.text,
        ageHint: input.ageHint,
      }),
      maxTokens: 1500,
      temperature: 0.1, // Deterministic — we want consistent grammar checks
    });

    const rawSuggestions = Array.isArray(llmResponse.suggestions) ? llmResponse.suggestions : [];

    // Output-filter every suggested replacement to prevent prompt injection / PII leak
    const suggestions: GrammarSuggestion[] = rawSuggestions
      .filter((s) => {
        // Only keep suggestions where indices are sane
        return (
          typeof s.startIndex === 'number' &&
          typeof s.endIndex === 'number' &&
          s.startIndex >= 0 &&
          s.endIndex > s.startIndex &&
          s.endIndex <= input.text.length &&
          ['grammar', 'spelling', 'punctuation'].includes(s.type)
        );
      })
      .map((s) => ({
        id: s.id ?? nanoid(8),
        type: s.type,
        original: s.original,
        suggested: filterOutput(s.suggested),
        explanation: filterOutput(s.explanation),
        startIndex: s.startIndex,
        endIndex: s.endIndex,
        status: 'pending' as const,
      }));

    await trackCreation(sessionId);

    return apiSuccess({ suggestions });
  } catch (error) {
    return handleApiError(error);
  }
}
