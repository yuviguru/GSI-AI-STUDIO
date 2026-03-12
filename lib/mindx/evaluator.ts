import type {
  SkillArenaChallenge,
  SkillArenaAnswer,
  SkillArenaChallengeResult,
  SkillArenaChallengeType,
} from '@/types/mindx.types';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { filterOutput } from '@/lib/safety/inputFilter';

const MAX_SCORE = 20;

// ─── MCQ Types (direct comparison) ──────────────────────

const MCQ_TYPES: SkillArenaChallengeType[] = [
  'comprehension',
  'follow_instructions',
  'logic',
  'odd_one_out',
  'analogy',
  'inference',
  'vocabulary',
];

function isMcqType(type: SkillArenaChallengeType): boolean {
  return MCQ_TYPES.includes(type);
}

// ─── MCQ Evaluation ─────────────────────────────────────

function evaluateMcq(
  challenge: SkillArenaChallenge,
  answer: SkillArenaAnswer,
): SkillArenaChallengeResult {
  const correct = challenge.question.correctOption;
  const selected = answer.selectedOption ?? answer.text ?? '';

  const isCorrect = selected.trim().toLowerCase() === correct?.trim().toLowerCase();

  return {
    challengeId: challenge.id,
    score: isCorrect ? MAX_SCORE : 0,
    maxScore: MAX_SCORE,
    feedback: isCorrect
      ? 'Correct! Great job!'
      : `The correct answer was: ${correct}. Keep practicing!`,
  };
}

// ─── AI Evaluation (text/voice responses) ────────────────

interface AiEvalResult {
  score: number;
  feedback: string;
}

const CHALLENGE_RUBRICS: Partial<Record<SkillArenaChallengeType, string>> = {
  read_aloud: 'Evaluate based on: completeness (did they cover the full passage?), accuracy of content. Since this is a text transcript of speech, be generous about minor word changes.',
  describe: 'Evaluate based on: content relevance, coherence of ideas, vocabulary variety, and detail provided.',
  respond: 'Evaluate based on: relevance to the question, depth of thought, expression of ideas, and use of examples.',
  what_if: 'Evaluate based on: quality of reasoning, number of effects identified, logical connections between cause and effect.',
  key_points: 'Evaluate based on: accuracy of the key points, whether they captured the main ideas, and coverage of the passage.',
  summarize: 'Evaluate based on: accuracy of the summary, whether it captures the main ideas in 2 sentences, and conciseness.',
};

async function evaluateWithAi(
  challenge: SkillArenaChallenge,
  answer: SkillArenaAnswer,
): Promise<SkillArenaChallengeResult> {
  const responseText = answer.voiceTranscript || answer.text || '';

  if (!responseText.trim()) {
    return {
      challengeId: challenge.id,
      score: 0,
      maxScore: MAX_SCORE,
      feedback: 'No response was provided. Try answering next time!',
    };
  }

  const rubric = CHALLENGE_RUBRICS[challenge.type] ?? 'Evaluate based on relevance, quality, and completeness.';

  const systemPrompt = `You are a kind, encouraging evaluator for a children's educational assessment (ages 8-17).

Your job is to score a child's response on a scale of 0-${MAX_SCORE} and provide brief, encouraging feedback.

${rubric}

IMPORTANT RULES:
- Be GENEROUS with scoring — reward effort and genuine thinking
- Score range: 0-${MAX_SCORE} (integers only)
- A reasonable attempt should get at least 8-10
- Good responses get 14-17
- Excellent responses get 18-${MAX_SCORE}
- Only give 0-5 for completely off-topic or empty responses
- Feedback must be 1-2 sentences, kid-friendly, positive, and specific
- Always mention something the child did well before suggesting improvement
- NEVER be harsh, sarcastic, or discouraging
- This is a CHILD — frame everything as growth and learning

Respond ONLY with valid JSON: { "score": <number>, "feedback": "<string>" }`;

  const userMessage = `CHALLENGE TYPE: ${challenge.type}
QUESTION: ${challenge.question.text}
${challenge.question.passage ? `PASSAGE/CONTEXT: ${challenge.question.passage}` : ''}
${challenge.question.audioText ? `AUDIO CONTENT: ${challenge.question.audioText}` : ''}

CHILD'S RESPONSE:
${responseText}

Evaluate this response now.`;

  try {
    const result = await generateJsonWithClaude<AiEvalResult>({
      systemPrompt,
      userMessage,
      maxTokens: 256,
      temperature: 0.3,
    });

    const score = Math.max(0, Math.min(MAX_SCORE, Math.round(result.score)));
    const feedback = filterOutput(result.feedback || 'Good effort!');

    return {
      challengeId: challenge.id,
      score,
      maxScore: MAX_SCORE,
      feedback,
    };
  } catch {
    // Fallback: give a decent score for any non-empty response
    const fallbackScore = responseText.length > 20 ? 12 : 8;
    return {
      challengeId: challenge.id,
      score: fallbackScore,
      maxScore: MAX_SCORE,
      feedback: 'Great effort! Keep up the good work.',
    };
  }
}

// ─── Odd One Out (hybrid: MCQ + explanation) ──────────────

async function evaluateOddOneOut(
  challenge: SkillArenaChallenge,
  answer: SkillArenaAnswer,
): Promise<SkillArenaChallengeResult> {
  const selected = answer.selectedOption ?? '';
  const correct = challenge.question.correctOption ?? '';
  const isCorrect = selected.trim().toLowerCase() === correct.trim().toLowerCase();

  // If the kid also provided an explanation, evaluate that too
  const explanation = answer.text ?? '';
  if (isCorrect && explanation.length > 10) {
    // Correct pick + good explanation = full or near-full marks via AI
    return evaluateWithAi(challenge, answer);
  }

  return {
    challengeId: challenge.id,
    score: isCorrect ? 15 : 3,
    maxScore: MAX_SCORE,
    feedback: isCorrect
      ? 'You picked the right one! Try adding an explanation next time for even more points.'
      : `The odd one out was: ${correct}. Think about what makes the others similar.`,
  };
}

// ─── Public API ──────────────────────────────────────────

/** Evaluate a single challenge response */
export async function evaluateChallenge(
  challenge: SkillArenaChallenge,
  answer: SkillArenaAnswer,
): Promise<SkillArenaChallengeResult> {
  // Odd one out is a hybrid type
  if (challenge.type === 'odd_one_out') {
    return evaluateOddOneOut(challenge, answer);
  }

  // MCQ types: direct comparison
  if (isMcqType(challenge.type)) {
    return evaluateMcq(challenge, answer);
  }

  // Text/voice types: AI evaluation
  return evaluateWithAi(challenge, answer);
}

/** Evaluate all challenges in parallel */
export async function evaluateAllChallenges(
  challenges: SkillArenaChallenge[],
  answers: SkillArenaAnswer[],
): Promise<SkillArenaChallengeResult[]> {
  const answerMap = new Map(answers.map((a) => [a.challengeId, a]));

  const results = await Promise.all(
    challenges.map((challenge) => {
      const answer = answerMap.get(challenge.id);
      if (!answer) {
        return Promise.resolve({
          challengeId: challenge.id,
          score: 0,
          maxScore: MAX_SCORE,
          feedback: 'No answer was submitted for this challenge.',
        });
      }
      return evaluateChallenge(challenge, answer);
    }),
  );

  return results;
}
