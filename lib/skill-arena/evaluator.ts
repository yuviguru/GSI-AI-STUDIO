import type {
  SkillArenaAnswer,
  SkillArenaChallenge,
  SkillArenaChallengeResult,
  SkillArenaChallengeType,
  SkillArenaDifficulty,
  SkillArenaMentorFeedback,
  SkillArenaModule,
  SkillArenaXray,
} from '@gsi/types';
import { MODULE_XRAY_CONCEPTS } from '@gsi/types';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { filterOutput } from '@/lib/safety/inputFilter';

// ─── Module-specific rubrics ──────────────────────────────

const MODULE_RUBRIC: Record<SkillArenaModule, string> = {
  speaking: `For speaking assessment, evaluate:
- Completeness: Did the response cover the topic adequately?
- Expression: Was it engaging and expressive (even as text)?
- Clarity: Is the language clear and well-structured?
- Relevance: Does it directly address the prompt?`,

  listening: `For listening assessment, evaluate:
- Comprehension: Did the student understand the passage correctly?
- Detail: Were key points captured accurately?
- Completeness: For key_points type, were all important details noted?
- Precision: Were answers specific rather than vague?`,

  thinking: `For thinking assessment, evaluate:
- Logic: Is the reasoning sound and well-structured?
- Depth: Does the response consider multiple perspectives or consequences?
- Creativity: Are there original or unexpected insights?
- Explanation: Is the reasoning clearly explained?`,

  reading: `For reading assessment, evaluate:
- Comprehension: Does the student understand the passage?
- Analysis: Can they draw correct inferences beyond surface facts?
- Vocabulary: Do they understand word meanings in context?
- Summarization: Can they distil main ideas concisely?`,
};

const DIFFICULTY_GUIDANCE: Record<SkillArenaDifficulty, string> = {
  easy: 'Be encouraging and generous with scoring. This student is a beginner. Give credit for any genuine effort and correct understanding.',
  medium: 'Score fairly but kindly. Expect reasonable accuracy and some depth. Acknowledge good effort while noting areas for growth.',
  hard: 'Score accurately. Expect strong reasoning, precise answers, and depth. Still be encouraging but hold to higher standards.',
};

// ─── AI Evaluation Types ──────────────────────────────────

interface AiEvaluation {
  challengeResults: Array<{
    challengeId: string;
    score: number;
    feedback: string;
  }>;
  mentorFeedback: {
    strengths: string[];
    growthAreas: string[];
    tips: string[];
    recommendedPractice: string;
    encouragement: string;
  };
  aiXrayExplanation: string;
}

export interface EvaluationResult {
  challengeResults: SkillArenaChallengeResult[];
  score: number;
  mentorFeedback: SkillArenaMentorFeedback;
  aiXray: SkillArenaXray;
}

// ─── MCQ Auto-scoring ─────────────────────────────────────

function isMcqChallenge(challenge: SkillArenaChallenge): boolean {
  return !!challenge.question.correctOption && !!challenge.question.options;
}

function scoreMcq(challenge: SkillArenaChallenge, answer: SkillArenaAnswer): number {
  if (!challenge.question.correctOption) return 0;
  const selected = answer.selectedOption?.trim().toLowerCase();
  const correct = challenge.question.correctOption.trim().toLowerCase();
  return selected === correct ? 20 : 0;
}

// ─── Main evaluator ───────────────────────────────────────

function shouldUseGroq(): boolean {
  return !!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-api');
}

/** Evaluate a complete assessment (challenges + answers) */
export async function evaluateAssessment(
  module: SkillArenaModule,
  challenges: SkillArenaChallenge[],
  answers: SkillArenaAnswer[],
  difficulty: SkillArenaDifficulty,
): Promise<EvaluationResult> {
  // Auto-score MCQs, collect open-ended for AI evaluation
  const mcqResults: Map<string, SkillArenaChallengeResult> = new Map();
  const openEndedPairs: Array<{ challenge: SkillArenaChallenge; answer: SkillArenaAnswer }> = [];

  for (const challenge of challenges) {
    const answer = answers.find((a) => a.challengeId === challenge.id);
    if (!answer) continue;

    if (isMcqChallenge(challenge)) {
      const score = scoreMcq(challenge, answer);
      mcqResults.set(challenge.id, {
        challengeId: challenge.id,
        score,
        maxScore: 20,
        feedback: score === 20 ? 'Correct! Well done!' : `The correct answer was: ${challenge.question.correctOption}`,
      });
    } else {
      openEndedPairs.push({ challenge, answer });
    }
  }

  // If all MCQ, skip AI call
  let aiResults: Map<string, SkillArenaChallengeResult> = new Map();
  let mentorFeedback: SkillArenaMentorFeedback;
  let xrayExplanation: string;

  if (openEndedPairs.length === 0) {
    // All MCQ — generate feedback locally
    const totalScore = [...mcqResults.values()].reduce((sum, r) => sum + r.score, 0);
    mentorFeedback = generateLocalFeedback(module, totalScore, challenges);
    xrayExplanation = generateLocalXrayExplanation(module);
  } else {
    // Call AI for open-ended evaluation + overall mentor feedback
    const aiEval = await callAiEvaluation(module, challenges, answers, openEndedPairs, mcqResults, difficulty);
    aiResults = new Map(aiEval.challengeResults.map((r) => [r.challengeId, r]));
    mentorFeedback = aiEval.mentorFeedback;
    xrayExplanation = aiEval.aiXrayExplanation;
  }

  // Merge results in challenge order
  const challengeResults: SkillArenaChallengeResult[] = challenges.map((c) => {
    return mcqResults.get(c.id) ?? aiResults.get(c.id) ?? {
      challengeId: c.id,
      score: 0,
      maxScore: 20,
      feedback: 'No answer provided',
    };
  });

  const totalRaw = challengeResults.reduce((sum, r) => sum + r.score, 0);
  const maxPossible = challengeResults.length * 20;
  // Normalize to 0-100 regardless of number of questions
  const totalScore = maxPossible > 0 ? Math.round((totalRaw / maxPossible) * 100) : 0;

  const xrayConcept = MODULE_XRAY_CONCEPTS[module];

  return {
    challengeResults,
    score: Math.min(100, Math.max(0, totalScore)),
    mentorFeedback,
    aiXray: {
      concept: xrayConcept.concept,
      explanation: filterOutput(xrayExplanation),
      curriculumTag: xrayConcept.curriculumTag,
    },
  };
}

// ─── AI Call ──────────────────────────────────────────────

async function callAiEvaluation(
  module: SkillArenaModule,
  allChallenges: SkillArenaChallenge[],
  allAnswers: SkillArenaAnswer[],
  openEndedPairs: Array<{ challenge: SkillArenaChallenge; answer: SkillArenaAnswer }>,
  mcqResults: Map<string, SkillArenaChallengeResult>,
  difficulty: SkillArenaDifficulty,
): Promise<{ challengeResults: SkillArenaChallengeResult[]; mentorFeedback: SkillArenaMentorFeedback; aiXrayExplanation: string }> {

  const systemPrompt = `You are Koko, a fun and encouraging AI mentor for kids aged 8-17. You are evaluating a ${module} assessment.

${MODULE_RUBRIC[module]}

${DIFFICULTY_GUIDANCE[difficulty]}

SCORING RULES:
- Score each open-ended challenge from 0 to 20 points
- Be generous with kids who show genuine effort
- Give at least 5 points for any meaningful attempt
- Focus on what they got RIGHT, not what they got wrong

MENTOR FEEDBACK RULES:
- strengths: 2-3 specific things the kid did well (be encouraging!)
- growthAreas: 2-3 areas to improve (frame positively as "Next time try...")
- tips: 1-2 actionable, specific practice tips
- recommendedPractice: which challenge type to focus on next (one of: ${getTypesForModule(module).join(', ')})
- encouragement: a warm, kid-friendly motivational message (1-2 sentences)
- aiXrayExplanation: briefly explain how AI evaluates ${module} skills (1-2 sentences, educational)

Respond ONLY with valid JSON matching this schema:
{
  "challengeResults": [
    { "challengeId": "string", "score": 0-20, "feedback": "one line" }
  ],
  "mentorFeedback": {
    "strengths": ["string", "string"],
    "growthAreas": ["string", "string"],
    "tips": ["string"],
    "recommendedPractice": "challenge_type",
    "encouragement": "string"
  },
  "aiXrayExplanation": "string"
}`;

  // Build user message with all challenges for context
  let userMessage = `ASSESSMENT (${module} module, ${difficulty} difficulty):\n\n`;

  // Include MCQ results for context
  for (const [id, result] of mcqResults) {
    const challenge = allChallenges.find((c) => c.id === id)!;
    const answer = allAnswers.find((a) => a.challengeId === id);
    userMessage += `CHALLENGE [${challenge.type}] (MCQ - auto-scored ${result.score}/20):\n`;
    userMessage += `Q: ${challenge.question.text}\n`;
    if (answer?.selectedOption) userMessage += `A: ${answer.selectedOption}\n`;
    userMessage += `Correct: ${challenge.question.correctOption}\n\n`;
  }

  // Include open-ended for AI scoring
  for (const { challenge, answer } of openEndedPairs) {
    userMessage += `CHALLENGE [${challenge.type}] (SCORE THIS - challengeId: ${challenge.id}):\n`;
    userMessage += `Q: ${challenge.question.text}\n`;
    if (challenge.question.passage) userMessage += `Passage: ${challenge.question.passage}\n`;
    const responseText = answer.voiceTranscript || answer.text || '(no answer)';
    userMessage += `Student's answer: ${responseText}\n`;
    userMessage += `Time used: ${answer.timeUsedSeconds}s / ${challenge.question.timeLimit}s limit\n\n`;
  }

  userMessage += `\nScore ONLY the open-ended challenges listed above (with "SCORE THIS"). MCQ challenges are already scored.`;

  const generate = shouldUseGroq() ? generateJsonWithGroq : generateJsonWithClaude;

  const result = await generate<AiEvaluation>({
    systemPrompt,
    userMessage,
    maxTokens: 1024,
    temperature: 0.3,
  });

  // Validate and clamp scores
  const challengeResults: SkillArenaChallengeResult[] = result.challengeResults.map((r) => ({
    challengeId: r.challengeId,
    score: Math.max(0, Math.min(20, Math.round(r.score))),
    maxScore: 20,
    feedback: filterOutput(r.feedback || 'Good effort!'),
  }));

  // Validate mentor feedback
  const mentor: SkillArenaMentorFeedback = {
    strengths: (result.mentorFeedback.strengths || []).slice(0, 3).map(filterOutput),
    growthAreas: (result.mentorFeedback.growthAreas || []).slice(0, 3).map(filterOutput),
    tips: (result.mentorFeedback.tips || []).slice(0, 2).map(filterOutput),
    recommendedPractice: validateChallengeType(module, result.mentorFeedback.recommendedPractice),
    encouragement: filterOutput(result.mentorFeedback.encouragement || 'Keep going, you are doing great!'),
  };

  return {
    challengeResults,
    mentorFeedback: mentor,
    aiXrayExplanation: result.aiXrayExplanation || generateLocalXrayExplanation(module),
  };
}

// ─── Helpers ──────────────────────────────────────────────

function getTypesForModule(module: SkillArenaModule): SkillArenaChallengeType[] {
  const map: Record<SkillArenaModule, SkillArenaChallengeType[]> = {
    speaking: ['read_aloud', 'describe', 'respond'],
    listening: ['comprehension', 'follow_instructions', 'key_points'],
    thinking: ['logic', 'what_if', 'odd_one_out', 'analogy'],
    reading: ['comprehension', 'inference', 'vocabulary', 'summarize'],
  };
  return map[module];
}

function validateChallengeType(module: SkillArenaModule, type: string): SkillArenaChallengeType {
  const valid = getTypesForModule(module);
  if (valid.includes(type as SkillArenaChallengeType)) return type as SkillArenaChallengeType;
  return valid[0]!;
}

function generateLocalFeedback(
  module: SkillArenaModule,
  totalScore: number,
  challenges: SkillArenaChallenge[],
): SkillArenaMentorFeedback {
  const types = getTypesForModule(module);
  const maxPossible = challenges.length * 20;
  const pct = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;
  const encouragements = [
    'Great job completing this assessment! Every attempt makes you stronger!',
    'Well done! Keep practising and you will see amazing improvement!',
    'You are doing wonderfully! Each challenge makes your brain grow!',
  ];

  return {
    strengths: pct >= 60
      ? ['Good accuracy on the questions!', 'You showed strong understanding.']
      : ['Great effort completing the assessment!', 'You gave it a solid try.'],
    growthAreas: pct >= 60
      ? ['Try to read each question even more carefully.']
      : ['Take your time reading each option before answering.', 'Review the topics and try again!'],
    tips: ['Practice a little bit every day — even 10 minutes helps!'],
    recommendedPractice: types[0]!,
    encouragement: encouragements[Math.floor(Math.random() * encouragements.length)]!,
  };
}

function generateLocalXrayExplanation(module: SkillArenaModule): string {
  const explanations: Record<SkillArenaModule, string> = {
    speaking: 'AI uses Natural Language Processing (NLP) to understand speech. It converts your voice to text, then analyses the words for meaning, grammar, and expression.',
    listening: 'AI processes audio by breaking sound waves into patterns. Speech recognition converts spoken words to text, then NLP analyses the meaning and context.',
    thinking: 'AI uses logical reasoning and pattern recognition. It analyses sequences, relationships, and rules to solve problems — similar to how you think through puzzles!',
    reading: 'AI uses text comprehension models to understand passages. It identifies main ideas, relationships between sentences, and word meanings from context.',
  };
  return explanations[module];
}
