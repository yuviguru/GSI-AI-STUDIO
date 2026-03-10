import type {
  BeatTheAiCategory,
  BeatTheAiFeedback,
  BeatTheAiPrompt,
  BeatTheAiScores,
} from '@/types/beatTheAi.types';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { filterOutput } from '@/lib/safety/inputFilter';

// ─── Category-specific rubric guidance ───────────────────────

const CATEGORY_RUBRIC: Record<BeatTheAiCategory, string> = {
  story_sprint: `For stories, judge:
- creativity: Originality of plot, characters, and setting
- funFactor: How engaging and entertaining the story is
- accuracy: Story structure (beginning, middle, end) and coherence
- heart: Emotional depth, personal voice, and cultural references`,

  quiz_whiz: `For quiz questions, judge:
- creativity: Originality and cleverness of the questions
- funFactor: How interesting and engaging the questions are to answer
- accuracy: Correctness of answers and quality of explanations
- heart: Educational value and relevance to the topic`,

  caption_battle: `For captions, judge:
- creativity: Originality and unexpected humor
- funFactor: How funny and entertaining it is
- accuracy: Relevance to the described scene
- heart: Personal flair and relatable humor`,

  rhyme_time: `For poems, judge:
- creativity: Original imagery and word choices
- funFactor: How enjoyable and musical it sounds
- accuracy: Rhyme quality and rhythm/meter
- heart: Emotional depth and personal feeling`,
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
