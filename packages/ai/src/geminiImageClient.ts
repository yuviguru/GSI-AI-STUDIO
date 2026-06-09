/** Google Gemini Flash Image ("Nano Banana") — PREMIUM reference-conditioned
 *  image generation/editing. Native multimodal: preserves a character's
 *  identity across scenes from a single reference image — the strongest
 *  consistency option, offered as a high-credit tier.
 *
 *  Uses GEMINI_API_KEY (same key as the audio path). The model id iterates
 *  quickly (gemini-2.5-flash-image → newer), so it's env-overridable via
 *  GEMINI_IMAGE_MODEL without a code change.
 */

const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const TIMEOUT_MS = 60_000;

export interface GeminiImageOptions {
  prompt: string;
  /** Optional reference image URL — when set, identity is preserved from it. */
  referenceImageUrl?: string;
}

async function fetchAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`Gemini image: failed to fetch reference (${r.status})`);
  const buf = Buffer.from(await r.arrayBuffer());
  const mimeType = r.headers.get('content-type')?.split(';')[0] || 'image/png';
  return { data: buf.toString('base64'), mimeType };
}

/** Find the inline image part in the generateContent response → data URI. */
function extractGeminiImage(data: unknown): string {
  const candidates = (data as { candidates?: unknown })?.candidates;
  if (Array.isArray(candidates)) {
    for (const c of candidates) {
      const parts = (c as { content?: { parts?: unknown } })?.content?.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          const inline =
            (p as { inlineData?: { data?: string; mimeType?: string } }).inlineData ??
            (p as { inline_data?: { data?: string; mime_type?: string } }).inline_data;
          const b64 = (inline as { data?: string } | undefined)?.data;
          if (typeof b64 === 'string' && b64.length > 0) {
            const mime =
              (inline as { mimeType?: string; mime_type?: string } | undefined)?.mimeType ??
              (inline as { mime_type?: string } | undefined)?.mime_type ??
              'image/png';
            return `data:${mime};base64,${b64}`;
          }
        }
      }
    }
  }
  throw new Error('Gemini image: no image part in response');
}

export function isGeminiImageConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function generateWithGeminiImage({
  prompt,
  referenceImageUrl,
}: GeminiImageOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (referenceImageUrl) {
    const { data, mimeType } = await fetchAsBase64(referenceImageUrl);
    parts.push({ inlineData: { mimeType, data } });
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini image ${res.status}: ${body.slice(0, 200)}`);
  }
  return extractGeminiImage(await res.json());
}
