import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { sceneEmotionsSchema } from '@/lib/validators';
import { getBook } from '@gsi/firebase/bookService';
import { enforceIpRateLimit } from '@gsi/firebase/sessionService';
import { llmRouter } from '@gsi/ai/router';
import {
  getEmotionPreset,
  emotionFromTextHeuristic,
  sceneMoodFromEmotions,
  EMOTION_KEY_LIST,
} from '@gsi/ai/prompts/emotionDirection';
import { ipFromRequest } from '@/lib/api/requestUtils';
import type { BookCharacter } from '@gsi/types';

/**
 * POST /api/ai/scene-emotions (BOOK-012)
 *
 * Suggest a dominant facial emotion per selected character for a page, from the
 * page's CURRENT text — so the editor's emotion chips default sensibly (and a
 * rewritten page re-derives, guard C). Best-effort + cheap: a small LLM call
 * proposes, we validate every result against the preset vocabulary, and fall
 * back to a zero-cost keyword heuristic for anything missing/invalid (and if
 * the LLM is unavailable). Not billed — it's a tiny text suggestion, not an
 * image generation — but IP-rate-limited so it can't be spammed.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('X-Session-Id');
    if (!sessionId) throw new AppException('UNAUTHORIZED', 'Missing session', 401);

    const input = sceneEmotionsSchema.parse(await request.json());
    await enforceIpRateLimit(ipFromRequest(request));

    const { book } = await getBook(input.bookId, { sessionId });
    const selected: BookCharacter[] = input.characterIds
      .map((id) => book.characters.find((c) => c.id === id))
      .filter((c): c is BookCharacter => c !== undefined);

    const heuristic = emotionFromTextHeuristic(input.text);

    if (selected.length === 0) {
      return apiSuccess({ emotions: [], mood: sceneMoodFromEmotions([heuristic]) });
    }

    const llmByName = await suggestEmotions(input.text, selected).catch(() => null);

    const emotions = selected.map((c) => {
      const raw = llmByName?.[c.name.trim().toLowerCase()];
      const key = getEmotionPreset(raw)?.key ?? heuristic;
      return { characterId: c.id, emotion: key };
    });

    return apiSuccess({
      emotions,
      mood: sceneMoodFromEmotions(emotions.map((e) => e.emotion)),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Best-effort per-character emotion suggestion. Returns a name→emotion map
 *  (lowercased names) or null on any failure — caller falls back. */
async function suggestEmotions(
  text: string,
  characters: BookCharacter[],
): Promise<Record<string, string> | null> {
  if (text.trim().length < 12) return null; // too little to reason about
  const names = characters.map((c) => c.name).join(', ');
  const system =
    `You read ONE page of a children's book and decide each named character's dominant facial emotion ON THIS PAGE. ` +
    `Reply with STRICT JSON mapping each character's name (lowercase) to exactly ONE emotion from this list: ${EMOTION_KEY_LIST}. ` +
    `Choose the emotion that truly fits the moment — a villain scheming is "angry", a scary reveal is "scared", a loss is "sad", a triumph is "excited". No prose, JSON only.`;
  const user = `Characters: ${names}\nPage text: """${text.slice(0, 1200)}"""\nJSON:`;

  const out = await llmRouter.generateJson<Record<string, unknown>>({
    systemPrompt: system,
    userMessage: user,
    maxTokens: 200,
    temperature: 0.2,
  });
  if (!out || typeof out !== 'object') return null;

  const norm: Record<string, string> = {};
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'string') norm[k.trim().toLowerCase()] = v;
  }
  return norm;
}
