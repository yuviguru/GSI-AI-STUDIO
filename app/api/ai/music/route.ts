import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { musicInputSchema } from '@/lib/validators';
import { filterInput, filterOutput } from '@/lib/safety/inputFilter';
import { checkRateLimit, trackCreation, enforceIpRateLimit } from '@/lib/firebase/sessionService';
import { saveCreation } from '@/lib/firebase/creationService';
import { generateJsonWithClaude } from '@/lib/ai/claudeClient';
import { generateJsonWithGroq } from '@/lib/ai/groqClient';
import { generateMusic } from '@/lib/ai/musicClient';
import { MUSIC_SYSTEM_PROMPT, buildMusicUserPrompt } from '@/lib/ai/prompts/musicPrompt';
import type { AiXrayData, MusicContent } from '@/types';

/** Shape returned by LLM for music metadata */
interface LlmMusicResponse {
  title: string;
  lyrics: string;
  bpm: number;
  styleDescription: string;
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
 * POST /api/ai/music
 * Generate a song using LLM (lyrics/metadata) + music generator (audio).
 * See: docs/api-contracts.md#post-apiaimusic
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
    const input = musicInputSchema.parse(body);

    // 3. Safety filter
    if (input.theme) filterInput(input.theme);
    if (input.lyricsPrompt) filterInput(input.lyricsPrompt);

    // 4. Check rate limit (IP first, then per-session)
    const ipAddress =
      request.headers.get('x-nf-client-connection-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null;
    await enforceIpRateLimit(ipAddress);
    await checkRateLimit(sessionId);

    // 5. Generate music metadata via LLM
    const generateJson = shouldUseGroq() ? generateJsonWithGroq : generateJsonWithClaude;
    const llmResponse = await generateJson<LlmMusicResponse>({
      systemPrompt: MUSIC_SYSTEM_PROMPT,
      userMessage: buildMusicUserPrompt({
        mood: input.mood,
        genre: input.genre,
        theme: input.theme,
        duration: input.duration,
        instruments: input.instruments,
        lyricsPrompt: input.lyricsPrompt,
        ageGroup: input.ageGroup,
      }),
      maxTokens: 2048,
    });

    // 6. Safety-filter LLM output
    const filteredLyrics = filterOutput(llmResponse.lyrics);
    const filteredStyle = filterOutput(llmResponse.styleDescription);

    // 7. Generate audio via music client
    const musicResult = await generateMusic({
      styleDescription: filteredStyle,
      duration: input.duration,
      mood: input.mood,
      genre: input.genre,
      bpm: llmResponse.bpm,
    });

    // 8. Build music content
    const modelName = shouldUseGroq() ? 'llama-3.3-70b' : 'claude-sonnet';
    console.log(`[Music] LLM: ${modelName}, Audio: ${musicResult.provider}`);

    const musicContent: MusicContent & { title: string; waveformData: number[] } = {
      title: llmResponse.title,
      audioUrl: musicResult.audioUrl,
      duration: musicResult.duration,
      lyrics: filteredLyrics,
      bpm: llmResponse.bpm,
      genre: input.genre,
      mood: input.mood,
      instruments: input.instruments ?? [],
      waveformData: musicResult.waveformData,
    };

    // 9. Build AI X-Ray metadata
    const aiXray: AiXrayData = {
      model: modelName,
      concept: llmResponse.aiXray.concept,
      explanation: llmResponse.aiXray.explanation,
      curriculumTag: llmResponse.aiXray.curriculumTag,
      aiPoints: 15,
    };

    // 10. Save creation to Firestore
    // Strip large binary data (base64 audio, waveform) — Firestore has a 1MB doc limit
    const { audioUrl: _audioUrl, waveformData: _waveform, ...savableContent } = musicContent;
    const { id: creationId, shareUrl } = await saveCreation({
      type: 'music',
      title: llmResponse.title,
      prompt: input.theme ?? `${input.mood} ${input.genre}`,
      content: savableContent as unknown as Record<string, unknown>,
      media: musicResult.audioUrl.startsWith('data:')
        ? []
        : [{ url: musicResult.audioUrl, type: 'audio/mpeg', alt: `${llmResponse.title} audio` }],
      aiMetadata: aiXray as unknown as Record<string, unknown>,
      aiConceptsTaught: ['generative_ai', 'text_to_music', 'pattern_recognition_audio'],
      sessionId,
      remixedFromId: input.remixedFromId,
    });

    // 11. Track creation for rate limiting
    await trackCreation(sessionId);

    return apiSuccess({ music: musicContent, aiXray, creationId, shareUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
