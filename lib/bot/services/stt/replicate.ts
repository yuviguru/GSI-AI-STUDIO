/** Replicate Whisper — final STT fallback.
 *
 *  Uses `openai/whisper` on Replicate. Pay-per-second but covered by the free
 *  credit pool for MVP volume. Reuses `REPLICATE_API_TOKEN` already in env.
 *
 *  Replicate is async — we create a prediction, then poll for completion.
 */

const REPLICATE_ENDPOINT = 'https://api.replicate.com/v1/predictions';
const WHISPER_VERSION =
  '4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2'; // openai/whisper v3 stable

const CREATE_TIMEOUT_MS = 10_000;
const POLL_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_500;

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: { transcription?: string } | string | null;
  error?: string | null;
  urls?: { get?: string };
}

export async function transcribeWithReplicate(audio: Buffer): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token || token.includes('your-token')) return null;

  // Replicate wants a URL or data URI, not a Buffer. Inline as base64 data URI.
  const dataUri = `data:audio/ogg;base64,${audio.toString('base64')}`;

  try {
    const createRes = await fetch(REPLICATE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: WHISPER_VERSION,
        input: { audio: dataUri, model: 'base', language: 'auto' },
      }),
      signal: AbortSignal.timeout(CREATE_TIMEOUT_MS),
    });

    if (!createRes.ok) {
      const body = await createRes.text().catch(() => '');
      console.warn(`[STT/replicate] create ${createRes.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const prediction = (await createRes.json()) as ReplicatePrediction;
    const pollUrl = prediction.urls?.get;
    if (!pollUrl) return null;

    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Token ${token}` },
        signal: AbortSignal.timeout(CREATE_TIMEOUT_MS),
      });
      if (!pollRes.ok) continue;
      const status = (await pollRes.json()) as ReplicatePrediction;
      if (status.status === 'succeeded') {
        const out = status.output;
        if (typeof out === 'string') return out.trim() || null;
        if (out && typeof out === 'object' && 'transcription' in out) {
          return out.transcription?.trim() || null;
        }
        return null;
      }
      if (status.status === 'failed' || status.status === 'canceled') {
        console.warn('[STT/replicate] prediction failed:', status.error);
        return null;
      }
    }

    console.warn('[STT/replicate] poll timeout');
    return null;
  } catch (err) {
    console.warn('[STT/replicate] failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
