import type {
  BeatTheAiCategory,
  BeatTheAiDifficulty,
  BeatTheAiPrompt,
  BeatTheAiXray,
} from '@/types/beatTheAi.types';
import { generateWithClaude } from '@/lib/ai/claudeClient';
import { generateWithGroq } from '@/lib/ai/groqClient';
import { filterOutput } from '@/lib/safety/inputFilter';

// ─── System Prompts by Difficulty ───────────────────────────

const DIFFICULTY_PROMPTS: Record<BeatTheAiDifficulty, string> = {
  easy: `You are a basic AI writing assistant for kids. Write simply and predictably. Use simple vocabulary, short sentences, and straightforward structure. Your response should be decent but not impressive — a creative kid could easily beat you.`,
  medium: `You are a creative AI assistant. Write with good vocabulary and some surprising elements. Show decent creativity and structure. Your response should be good quality — a talented kid would need to try hard to beat you.`,
  hard: `You are an expert creative writer. Use vivid language, humor, cultural references, and emotional depth. Your response should be excellent — only the most skilled and creative kids can beat you at this level.`,
};

const CATEGORY_FORMAT: Record<BeatTheAiCategory, string> = {
  story_sprint: `Write a 3-5 sentence story with a clear beginning, middle, and end. Make it engaging and complete.`,
  quiz_whiz: `Create 3 quiz questions. For each question, provide 4 options (mark the correct one with *), and a brief one-line explanation. Format:
Q1: [question]
a) [option] b) [option] c) [option]* d) [option]
Explanation: [why]`,
  caption_battle: `Write 1-2 witty, clever sentences as a caption. Be funny and creative.`,
  rhyme_time: `Write a 4-line rhyming poem. Use either AABB or ABAB rhyme scheme. Make it flow naturally.`,
};

const XRAY_PROMPTS: Record<BeatTheAiCategory, BeatTheAiXray> = {
  story_sprint: {
    concept: 'Natural Language Generation',
    explanation: 'AI writes stories by predicting the most likely next word based on patterns from millions of stories it has read. But it cannot truly imagine or feel emotions like you can!',
    curriculumTag: 'CBSE-AI-NLP',
  },
  quiz_whiz: {
    concept: 'Knowledge Retrieval',
    explanation: 'AI stores facts from its training data and retrieves them to create questions. But it can sometimes mix up facts or miss the latest discoveries that you might know!',
    curriculumTag: 'CBSE-AI-KR',
  },
  caption_battle: {
    concept: 'Creative Text Generation',
    explanation: 'AI generates witty text by combining patterns it has seen. But true humor often comes from real-life experiences and emotions — something only humans have!',
    curriculumTag: 'CBSE-AI-NLP',
  },
  rhyme_time: {
    concept: 'Pattern Matching in Language',
    explanation: 'AI finds rhyming words by matching sound patterns in its vocabulary. But writing a poem with real feeling and personal meaning is a uniquely human skill!',
    curriculumTag: 'CBSE-AI-NLP',
  },
};

function shouldUseGroq(): boolean {
  return !!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-api');
}

export interface AiOpponentResult {
  text: string;
  xray: BeatTheAiXray;
  model: string;
}

/** Generate AI's response for a Beat the AI round */
export async function generateAiResponse(
  prompt: BeatTheAiPrompt,
  difficulty: BeatTheAiDifficulty
): Promise<AiOpponentResult> {
  const systemPrompt = [
    DIFFICULTY_PROMPTS[difficulty],
    CATEGORY_FORMAT[prompt.category],
    'Respond with ONLY your creative response. No preamble, no explanation, no meta-commentary.',
    prompt.isIndiaThemed
      ? 'Include Indian cultural references where natural.'
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const generate = shouldUseGroq() ? generateWithGroq : generateWithClaude;

  const raw = await generate({
    systemPrompt,
    userMessage: prompt.text,
    maxTokens: 1024,
    temperature: difficulty === 'easy' ? 0.5 : difficulty === 'medium' ? 0.7 : 0.9,
  });

  const text = filterOutput(raw.trim());
  const model = shouldUseGroq() ? 'llama-3.3-70b' : 'claude-sonnet';

  return {
    text,
    xray: XRAY_PROMPTS[prompt.category],
    model,
  };
}
