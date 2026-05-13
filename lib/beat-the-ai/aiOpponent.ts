import type {
  BeatTheAiCategory,
  BeatTheAiDifficulty,
  BeatTheAiPrompt,
  BeatTheAiXray,
} from '@gsi/types';
import { generateWithClaude } from '@/lib/ai/claudeClient';
import { generateWithGroq } from '@/lib/ai/groqClient';
import { filterOutput } from '@gsi/safety';

// ─── System Prompts by Difficulty ───────────────────────────

const DIFFICULTY_PROMPTS: Record<BeatTheAiDifficulty, string> = {
  easy: `You are a basic AI writing assistant for kids. Write simply and predictably. Use simple vocabulary, short sentences, and straightforward structure. Your response should be decent but not impressive — a creative kid could easily beat you.`,
  medium: `You are a creative AI assistant. Write with good vocabulary and some surprising elements. Show decent creativity and structure. Your response should be good quality — a talented kid would need to try hard to beat you.`,
  hard: `You are an expert creative writer. Use vivid language, humor, cultural references, and emotional depth. Your response should be excellent — only the most skilled and creative kids can beat you at this level.`,
};

const CATEGORY_FORMAT: Record<BeatTheAiCategory, string> = {
  story_sprint: `Write a 3-5 sentence story with a clear beginning, middle, and end. Make it engaging and complete.`,
  rhyme_time: `Write a 4-line rhyming poem. Use either AABB or ABAB rhyme scheme. Make it flow naturally.`,
  fact_or_bluff: `Write 2-3 convincing sentences. Whether it's a real fact or a bluff, make it sound completely believable. Add a small detail that makes it extra convincing.`,
  comeback_king: `Write ONE witty comeback line. Be clever, funny, and sharp — but always keep it friendly and kid-appropriate. No insults.`,
  explain_it: `Explain in 2-3 simple sentences using everyday analogies a young child would understand. Make it fun and accurate.`,
  debate_champ: `Argue the OPPOSITE side of what the kid is assigned. Give 2-3 strong, persuasive points. Be convincing but fair.`,
  math_wizard: `Show your reasoning step by step in 2-3 sentences. Be clear and accurate. If it's an estimation, state your assumptions.`,
  science_detective: `Write a scientific hypothesis in 2-3 sentences. Use cause-and-effect reasoning. Mention at least one real scientific principle.`,
  code_cracker: `Solve the puzzle and explain your reasoning in 1-2 clear sentences. Show the logical steps.`,
};

const XRAY_PROMPTS: Record<BeatTheAiCategory, BeatTheAiXray> = {
  story_sprint: {
    concept: 'Natural Language Generation',
    explanation: 'AI writes stories by predicting the most likely next word based on patterns from millions of stories it has read. But it cannot truly imagine or feel emotions like you can!',
    curriculumTag: 'CBSE-AI-NLP',
  },
  rhyme_time: {
    concept: 'Pattern Matching in Language',
    explanation: 'AI finds rhyming words by matching sound patterns in its vocabulary. But writing a poem with real feeling and personal meaning is a uniquely human skill!',
    curriculumTag: 'CBSE-AI-NLP',
  },
  fact_or_bluff: {
    concept: 'Language Model Confidence',
    explanation: 'AI can write convincingly about anything — even made-up facts! It doesn\'t "know" what\'s true; it just predicts likely-sounding text. That\'s why fact-checking AI is so important!',
    curriculumTag: 'CBSE-AI-Ethics',
  },
  comeback_king: {
    concept: 'Context Understanding',
    explanation: 'AI analyzes the context of a statement to generate a relevant response. But real wit comes from understanding social situations and timing — something humans are naturally better at!',
    curriculumTag: 'CBSE-AI-NLP',
  },
  explain_it: {
    concept: 'Text Simplification',
    explanation: 'AI can rephrase complex ideas using simpler words by mapping difficult concepts to easier vocabulary. But the best explanations come from truly understanding something — not just rewording it!',
    curriculumTag: 'CBSE-AI-NLP',
  },
  debate_champ: {
    concept: 'Argument Generation',
    explanation: 'AI can argue any side of a debate by finding supporting patterns in its training data. But it doesn\'t have real opinions or beliefs — it just generates convincing-sounding arguments!',
    curriculumTag: 'CBSE-AI-NLP',
  },
  math_wizard: {
    concept: 'Computational Thinking',
    explanation: 'AI solves math by recognizing problem patterns and applying learned formulas. But for creative estimation and real-world reasoning, human intuition often finds clever shortcuts AI would miss!',
    curriculumTag: 'CBSE-AI-CT',
  },
  science_detective: {
    concept: 'Prediction Models',
    explanation: 'AI makes predictions by finding patterns in data. Scientists also use models, but they design experiments to TEST their hypotheses — something AI cannot do on its own!',
    curriculumTag: 'CBSE-AI-ML',
  },
  code_cracker: {
    concept: 'Pattern Recognition',
    explanation: 'AI recognizes patterns in sequences and text by comparing them to millions of examples. But some puzzles need lateral thinking and "aha!" moments that come more naturally to humans!',
    curriculumTag: 'CBSE-AI-ML',
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
