import type {
  BeatTheAiCategory,
  BeatTheAiFeedback,
  BeatTheAiPrompt,
  BeatTheAiScores,
} from '@gsi/types';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { filterOutput } from '@gsi/safety';

// ─── Category-specific rubric guidance ───────────────────────

const CATEGORY_RUBRIC: Record<BeatTheAiCategory, string> = {
  story_sprint: `For stories, judge:
- creativity: Originality of plot, characters, and setting
- funFactor: How engaging and entertaining the story is
- accuracy: Story structure (beginning, middle, end) and coherence
- heart: Emotional depth, personal voice, and cultural references`,

  rhyme_time: `For poems, judge:
- creativity: Original imagery and word choices
- funFactor: How enjoyable and musical it sounds
- accuracy: Rhyme quality and rhythm/meter
- heart: Emotional depth and personal feeling`,

  fact_or_bluff: `For facts/bluffs, judge:
- creativity: How surprising and original the claim is
- funFactor: How entertaining and intriguing it is to read
- accuracy: If a real fact — is it actually true? If a bluff — is it convincingly written?
- heart: How engaging the writing style is, use of interesting details`,

  comeback_king: `For comebacks, judge:
- creativity: Originality and cleverness of the response
- funFactor: How funny and witty the comeback is
- accuracy: Relevance to what the friend said
- heart: Personal flair, friendliness, and personality shown`,

  explain_it: `For explanations, judge:
- creativity: Use of clever analogies and comparisons
- funFactor: How fun and engaging the explanation is
- accuracy: Scientific/factual correctness of the explanation
- heart: How much care is shown in making it truly understandable`,

  debate_champ: `For debates, judge:
- creativity: Originality of arguments and examples used
- funFactor: How persuasive and engaging the argument is
- accuracy: Logical soundness and use of supporting evidence
- heart: Passion, conviction, and personal connection shown`,

  math_wizard: `For math challenges, judge:
- creativity: Originality of approach and problem-solving strategy
- funFactor: How clearly and engagingly the reasoning is presented
- accuracy: Mathematical correctness of calculations and logic
- heart: Clarity of explanation and effort shown in working`,

  science_detective: `For science hypotheses, judge:
- creativity: Originality of the hypothesis and thinking
- funFactor: How interesting and thought-provoking the response is
- accuracy: Scientific plausibility and use of real scientific principles
- heart: Curiosity shown and depth of scientific thinking`,

  code_cracker: `For puzzles/riddles, judge:
- creativity: Elegance and cleverness of the solution approach
- funFactor: How satisfying and clear the solution presentation is
- accuracy: Correctness of the answer
- heart: Quality of the explanation and logical reasoning shown`,
};

// ─── Judge Response Schema ───────────────────────────────────

interface JudgeResponse {
  kidScores: BeatTheAiScores;
  aiScores: BeatTheAiScores;
  feedback: BeatTheAiFeedback;
}

function shouldUseGroq(): boolean {
  return !!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-api');
}

/** Have AI judge both the kid's and AI's responses, returning scores and constructive feedback */
export async function judgeResponses(
  prompt: BeatTheAiPrompt,
  kidResponse: string,
  aiResponse: string,
  category: BeatTheAiCategory,
): Promise<JudgeResponse> {
  const systemPrompt = `You are a fun, encouraging judge for a kids' creative challenge (ages 8-17). You are kind but honest.

Your job is to rate BOTH a kid's response and an AI's response to the same creative prompt, then give helpful feedback.

${CATEGORY_RUBRIC[category]}

IMPORTANT JUDGING RULES:
- Rate each criterion from 1 to 5 (integers only)
- Give credit GENEROUSLY to the kid — if they show genuine effort, creativity, or a personal touch, rate them fairly but kindly
- Kids have personal experiences, emotions, and cultural knowledge that AI cannot match — value these highly
- The kid is learning and growing — focus on what they did WELL, not what they got wrong
- Be honest about the AI's strengths too, but remember this is meant to encourage kids

For feedback:
- kidFeedback: 2-3 encouraging sentences about what the kid did well. Be specific about their strengths.
- aiFeedback: 1 brief sentence noting what the AI did (factual, not boastful)
- tip: One short, specific, actionable tip the kid can try next time to improve

Respond ONLY with valid JSON matching this exact schema:
{
  "kidScores": { "creativity": 1-5, "funFactor": 1-5, "accuracy": 1-5, "heart": 1-5 },
  "aiScores": { "creativity": 1-5, "funFactor": 1-5, "accuracy": 1-5, "heart": 1-5 },
  "feedback": {
    "kidFeedback": "string",
    "aiFeedback": "string",
    "tip": "string"
  }
}`;

  const userMessage = `PROMPT: ${prompt.text}

KID'S RESPONSE:
${kidResponse}

AI'S RESPONSE:
${aiResponse}

Judge both responses now.`;

  const generate = shouldUseGroq() ? generateJsonWithGroq : generateJsonWithClaude;

  const result = await generate<JudgeResponse>({
    systemPrompt,
    userMessage,
    maxTokens: 512,
    temperature: 0.3, // Low temperature for consistent judging
  });

  // Validate score ranges
  validateScores(result.kidScores);
  validateScores(result.aiScores);

  // Safety-filter the feedback text
  result.feedback.kidFeedback = filterOutput(result.feedback.kidFeedback);
  result.feedback.aiFeedback = filterOutput(result.feedback.aiFeedback);
  result.feedback.tip = filterOutput(result.feedback.tip);

  return result;
}

function validateScores(scores: BeatTheAiScores): void {
  const keys: (keyof BeatTheAiScores)[] = ['creativity', 'funFactor', 'accuracy', 'heart'];
  for (const key of keys) {
    const val = scores[key];
    if (typeof val !== 'number' || val < 1 || val > 5 || !Number.isInteger(val)) {
      scores[key] = Math.max(1, Math.min(5, Math.round(val || 3)));
    }
  }
}
