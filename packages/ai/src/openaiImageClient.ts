/** OpenAI gpt-image — PREMIUM reference-conditioned image generation/editing.
 *  Passing a reference image to the edits endpoint keeps a character on-model
 *  across scenes. High-credit tier. Uses OPENAI_API_KEY; model id is
 *  env-overridable via OPENAI_IMAGE_MODEL (gpt-image-1 → newer).
 */

const DEFAULT_MODEL = 'gpt-image-1';
const TIMEOUT_MS = 60_000;

export interface OpenAiImageOptions {
  prompt: string;
  /** Optional reference image URL — routes to the edits endpoint when set. */
  referenceImageUrl?: string;
  /** Square/portrait/landscape pixel dims; mapped to a supported OpenAI size. */
  width?: number;
  height?: number;
}

/** OpenAI only accepts a fixed set of sizes — map our trim dims to the nearest. */
function mapSize(width?: number, height?: number): string {
  if (!width || !height || width === height) return '1024x1024';
  return width > height ? '1536x1024' : '1024x1536';
}

function extractOpenAiImage(data: unknown): string {
  const arr = (data as { data?: unknown })?.data;
  if (Array.isArray(arr) && arr.length > 0) {
    const first = arr[0] as { b64_json?: string; url?: string };
    if (typeof first.b64_json === 'string') return `data:image/png;base64,${first.b64_json}`;
    if (typeof first.url === 'string' && first.url.startsWith('http')) return first.url;
  }
  throw new Error('OpenAI image: no image in response');
}

export function isOpenAiImageConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function generateWithOpenAiImage({
  prompt,
  referenceImageUrl,
  width,
  height,
}: OpenAiImageOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const model = process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL;
  const size = mapSize(width, height);

  if (referenceImageUrl) {
    // Reference edit — multipart. gpt-image keeps the reference subject on-model.
    const ref = await fetch(referenceImageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!ref.ok) throw new Error(`OpenAI image: failed to fetch reference (${ref.status})`);
    const mime = ref.headers.get('content-type')?.split(';')[0] || 'image/png';
    const blob = new Blob([await ref.arrayBuffer()], { type: mime });
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', prompt);
    form.append('size', size);
    form.append('image', blob, 'reference.png');
    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenAI image edit ${res.status}: ${body.slice(0, 200)}`);
    }
    return extractOpenAiImage(await res.json());
  }

  // Plain text→image.
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, size }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI image ${res.status}: ${body.slice(0, 200)}`);
  }
  return extractOpenAiImage(await res.json());
}
