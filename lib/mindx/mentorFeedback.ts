import type {
  SkillArenaModule,
  SkillArenaChallengeResult,
  SkillArenaChallengeType,
  SkillArenaMentorFeedback,
  SkillArenaXray,
} from '@/types/mindx.types';
import { MODULE_XRAY_CONCEPTS } from '@/types/mindx.types';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { filterOutput } from '@/lib/safety/inputFilter';

// ─── AI X-Ray explanations ──────────────────────────────

const XRAY_EXPLANATIONS: Record<string, string> = {
  speech_recognition_nlp:
    'AI evaluated your speaking by converting your voice to text (speech recognition) and then analyzing the words for meaning, grammar, and clarity. This is the same technology used by voice assistants like Siri and Google Assistant!',
  audio_processing:
    'AI created audio from text using text-to-speech technology. Then it checked your understanding of the content. This is how audiobooks and navigation apps create spoken directions!',
  logical_reasoning_ai:
    'AI tested your logical thinking — the same kind of reasoning that AI systems use to solve problems! Pattern recognition, deduction, and analogical thinking are at the heart of how AI learns.',
  text_comprehension_nlp:
    'AI evaluated your reading comprehension using Natural Language Processing (NLP). It analyzed whether you understood the main ideas, could make inferences, and grasped vocabulary in context — the same skills AI chatbots use to understand your questions!',
};

/** Generate AI X-Ray for the module */
export function generateXray(module: SkillArenaModule): SkillArenaXray {
  const meta = MODULE_XRAY_CONCEPTS[module];
  return {
    concept: meta.concept,
    explanation: XRAY_EXPLANATIONS[meta.concept] ?? 'AI used advanced algorithms to evaluate your performance.',
    curriculumTag: meta.curriculumTag,
  };
}

// ─── Mentor Feedback Generation ─────────────────────────

interface MentorFeedbackInput {
  module: SkillArenaModule;
  challengeResults: Array<{
    type: SkillArenaChallengeType;
    result: SkillArenaChallengeResult;
  }>;
  score: number;
  band: number;
  bandTitle: string;
}

/** Generate Koko's personalized mentor feedback */
export async function generateMentorFeedback(
  input: MentorFeedbackInput,
): Promise<SkillArenaMentorFeedback> {
  const { module, challengeResults, score, band, bandTitle } = input;

  const challengeSummary = challengeResults
    .map((cr) => `- ${cr.type}: ${cr.result.score}/${cr.result.maxScore} — ${cr.result.feedback}`)
    .join('\n');

  const systemPrompt = `You are Koko, a friendly AI learning mentor for kids (ages 8-17) in India. You are warm, encouraging, and believe every child can improve.

Generate personalized feedback for a child who just completed a "${module}" skill assessment.

IMPORTANT RULES:
- ALWAYS be positive and encouraging — this is a CHILD
- Strengths: Mention 2-3 SPECIFIC things they did well (reference actual challenge scores)
- Growth areas: Frame as opportunities, not weaknesses. Use "Next time, try..." phrasing
- Tips: Give 1-2 concrete, actionable practice tips
- Encouragement: A warm, motivational message (1-2 sentences)
- Recommended practice: Suggest the challenge TYPE they should focus on based on lowest scores
- Keep language simple and age-appropriate
- Use Indian English spellings (colour, favourite, practise)

Respond ONLY with valid JSON matching this schema:
{
  "strengths": ["string", "string"],
  "growthAreas": ["string", "string"],
  "tips": ["string"],
  "recommendedPractice": "challenge_type_string",
  "encouragement": "string"
}`;

  const userMessage = `MODULE: ${module}
OVERALL SCORE: ${score}/100
BAND: ${band} (${bandTitle})

CHALLENGE RESULTS:
${challengeSummary}

Generate Koko's mentoring feedback now.`;

  try {
    const result = await generateJsonWithClaude<SkillArenaMentorFeedback>({
      systemPrompt,
      userMessage,
      maxTokens: 512,
      temperature: 0.6,
    });

    // Safety-filter all text outputs
    result.strengths = result.strengths.map(filterOutput);
    result.growthAreas = result.growthAreas.map(filterOutput);
    result.tips = result.tips.map(filterOutput);
    result.encouragement = filterOutput(result.encouragement);

    return result;
  } catch {
    return generateFallbackFeedback(input);
  }
}

// ─── Fallback Feedback ──────────────────────────────────

function generateFallbackFeedback(input: MentorFeedbackInput): SkillArenaMentorFeedback {
  const { challengeResults, band } = input;

  // Find best and worst challenge types
  const sorted = [...challengeResults].sort(
    (a, b) => b.result.score / b.result.maxScore - a.result.score / a.result.maxScore,
  );
  const bestType = sorted[0]?.type ?? 'comprehension';
  const worstType = sorted[sorted.length - 1]?.type ?? 'comprehension';

  const strengths = [
    `You showed good effort across all challenges!`,
    `Your ${bestType.replace(/_/g, ' ')} skills are developing nicely.`,
  ];

  const growthAreas = [
    `Next time, try spending a bit more time on ${worstType.replace(/_/g, ' ')} questions.`,
    `Practice reading or listening carefully before answering — it makes a big difference!`,
  ];

  const tips = [
    band <= 2
      ? 'Try practising one challenge type each day. Small steps lead to big improvements!'
      : 'Challenge yourself with harder questions to push your skills even further.',
  ];

  const encouragement =
    band >= 4
      ? 'Amazing work! You are becoming a true champion. Keep pushing your limits!'
      : 'Every attempt makes you stronger. Keep practising and you will see great progress!';

  return {
    strengths,
    growthAreas,
    tips,
    recommendedPractice: worstType as SkillArenaChallengeType,
    encouragement,
  };
}
