/** Pixazo — free AI image generation.
 *
 *  Uses Pixazo's Flux Schnell free tier. Azure APIM-style auth with the
 *  `Ocp-Apim-Subscription-Key` header. Free-tier rate limits apply but no
 *  per-request cost, which makes this the preferred AI generator when
 *  local ComfyUI isn't running.
 *
 *  Docs: https://www.pixazo.ai/api/free
 */

const PIXAZO_FLUX_SCHNELL = 'https://gateway.pixazo.ai/flux-schnell/v1/generateImage';
const TIMEOUT_MS = 45_000;

const SAFETY_APPEND = ', child-friendly, colorful illustration, safe for children, cartoon style';
const NEGATIVE_PROMPT =
  'violence, weapons, blood, scary, realistic human faces, nudity, nsfw, dark, horror';

interface ImageOptions {
  prompt: string;
  style?: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';
  width?: number;
  height?: number;
}

/**
 * Pixazo's response shape isn't fully documented publicly — handles the
 * common variants: image_url / url / output / images[0].url / base64 data.
 * Returns a URL (or data URI) or throws.
 */
function extractImageFromResponse(data: unknown): string {
  if (typeof data === 'string' && data.startsWith('http')) return data;

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;

    // Common single-URL shapes
    for (const key of ['image_url', 'imageUrl', 'url', 'output', 'image']) {
      const v = d[key];
      if (typeof v === 'string' && (v.startsWith('http') || v.startsWith('data:'))) {
        return v;
      }
    }

    // Base64 field
    if (typeof d.base64 === 'string') {
      return `data:image/png;base64,${d.base64}`;
    }
    if (typeof d.b64_json === 'string') {
      return `data:image/png;base64,${d.b64_json}`;
    }

    // Array variants: images[], data[], output[]
    for (const key of ['images', 'data', 'output']) {
      const arr = d[key];
      if (Array.isArray(arr) && arr.length > 0) {
        const first = arr[0];
        if (typeof first === 'string' && (first.startsWith('http') || first.startsWith('data:'))) {
          return first;
        }
        if (first && typeof first === 'object') {
          const inner = first as Record<string, unknown>;
          for (const ikey of ['url', 'image_url', 'b64_json', 'base64']) {
            const v = inner[ikey];
            if (typeof v === 'string') {
              if (v.startsWith('http') || v.startsWith('data:')) return v;
              if (ikey === 'b64_json' || ikey === 'base64') return `data:image/png;base64,${v}`;
            }
          }
        }
      }
    }
  }

  throw new Error(`Pixazo: unexpected response shape (keys: ${
    data && typeof data === 'object' ? Object.keys(data as object).join(',') : typeof data
  })`);
}

export function isPixazoConfigured(): boolean {
  const key = process.env.PIXAZO_API_KEY;
  return !!key && !key.includes('REPLACE') && key.length > 10;
}

export async function generateWithPixazo({
  prompt,
  style = 'cartoon',
  width = 1024,
  height = 1024,
}: ImageOptions): Promise<string> {
  const apiKey = process.env.PIXAZO_API_KEY;
  if (!apiKey) throw new Error('PIXAZO_API_KEY not set');

  const safePrompt = `${style} style illustration: ${prompt}${SAFETY_APPEND}`;

  const res = await fetch(PIXAZO_FLUX_SCHNELL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    body: JSON.stringify({
      prompt: safePrompt,
      negative_prompt: NEGATIVE_PROMPT,
      width,
      height,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pixazo ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }

  // Try JSON first (documented shape); fall back to binary if Pixazo ever
  // returns raw image bytes.
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = (await res.json()) as unknown;
    return extractImageFromResponse(data);
  }

  if (contentType.startsWith('image/')) {
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = contentType.split(';')[0]!;
    return `data:${mime};base64,${buf.toString('base64')}`;
  }

  // Last-ditch: try JSON parse on arbitrary content-type
  const text = await res.text();
  try {
    return extractImageFromResponse(JSON.parse(text));
  } catch {
    throw new Error(`Pixazo: unexpected content-type "${contentType}", body starts "${text.slice(0, 80)}"`);
  }
}
