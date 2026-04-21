/** Hugging Face Inference API — free open-source Whisper fallback.
 *
 *  Uses `openai/whisper-large-v3` hosted on HF Inference. Free tier with rate
 *  limits; higher limits available with a free `HF_API_TOKEN`.
 *
 *  Docs: https://huggingface.co/docs/api-inference/
 */

const HF_ENDPOINT = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3';
const TIMEOUT_MS = 30_000;

export async function transcribeWithHuggingFace(audio: Buffer): Promise<string | null> {
  const token = process.env.HF_API_TOKEN;
  const headers: Record<string, string> = { 'Content-Type': 'audio/ogg' };
  if (token && !token.includes('your-free-token')) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(HF_ENDPOINT, {
      method: 'POST',
      headers,
      body: new Uint8Array(audio),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 503) {
      // Model is cold-loading on HF side — one retry after short wait
      console.warn('[STT/hf] model loading (503), retrying once');
      await new Promise((r) => setTimeout(r, 4_000));
      const retry = await fetch(HF_ENDPOINT, {
        method: 'POST',
        headers,
        body: new Uint8Array(audio),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!retry.ok) return null;
      const data = (await retry.json()) as { text?: string };
      return data.text?.trim() || null;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[STT/hf] ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch (err) {
    console.warn('[STT/hf] failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
