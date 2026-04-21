/** Groq Whisper transcription — primary STT provider.
 *
 *  Groq hosts `whisper-large-v3-turbo` with an OpenAI-compatible endpoint.
 *  Free tier covers ~7,200 seconds of audio / day — plenty for MVP voice notes.
 *
 *  Docs: https://console.groq.com/docs/speech-text
 */

const GROQ_STT_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_STT_MODEL = 'whisper-large-v3-turbo';
const TIMEOUT_MS = 20_000;

export async function transcribeWithGroq(audio: Buffer): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your-groq-key')) return null;

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: 'audio/ogg' }), 'voice.ogg');
  form.append('model', GROQ_STT_MODEL);
  form.append('response_format', 'json');

  try {
    const res = await fetch(GROQ_STT_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[STT/groq] ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch (err) {
    console.warn('[STT/groq] failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
