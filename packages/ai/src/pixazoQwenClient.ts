/** Pixazo Qwen-Image-Edit — identity-preserving image editing.
 *
 *  Reference-conditioned image-to-image on the SAME Pixazo APIM gateway + key
 *  as Flux Schnell (`Ocp-Apim-Subscription-Key`). Given a reference image URL
 *  of the hero plus a scene instruction, it returns a new image with that
 *  character rendered on the new page — how we keep a kid's book character
 *  consistent across pages WITHOUT a per-character LoRA.
 *
 *  Sync response; ~$0.045/image (all resolutions).
 *  Docs: https://www.pixazo.ai/models/qwen-image#doc-qwen-image-image-edit-code
 */

const DEFAULT_ENDPOINT =
  'https://gateway.pixazo.ai/qwen-image/v1/generateMultimodeTextToImageEditRequest';
const TIMEOUT_MS = 60_000; // edit models are slower than Flux Schnell's 4-step

export interface QwenEditOptions {
  /** Public URL of the reference image (the hero anchor portrait). */
  referenceImageUrl: string;
  /** Scene instruction — what the character is doing / where. */
  prompt: string;
  negativePrompt?: string;
}

/** Pull the edited image URL out of the Qwen multimode response:
 *  `output.choices[0].message.content[].image`. Defensive against drift. */
function extractQwenImage(data: unknown): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const output = d.output as Record<string, unknown> | undefined;
    const choices = output?.choices;
    if (Array.isArray(choices) && choices.length > 0) {
      const message = (choices[0] as Record<string, unknown>)?.message as
        | Record<string, unknown>
        | undefined;
      const content = message?.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part && typeof part === 'object') {
            const img = (part as Record<string, unknown>).image;
            if (typeof img === 'string' && (img.startsWith('http') || img.startsWith('data:'))) {
              return img;
            }
          }
        }
      }
    }
    // Fallbacks for shape drift.
    for (const k of ['image', 'url', 'image_url']) {
      const v = d[k];
      if (typeof v === 'string' && (v.startsWith('http') || v.startsWith('data:'))) return v;
    }
  }
  throw new Error(
    `Pixazo Qwen: unexpected response shape (keys: ${
      data && typeof data === 'object' ? Object.keys(data as object).join(',') : typeof data
    })`,
  );
}

export async function editWithPixazoQwen({
  referenceImageUrl,
  prompt,
  negativePrompt = '',
}: QwenEditOptions): Promise<string> {
  const apiKey = process.env.PIXAZO_API_KEY;
  if (!apiKey) throw new Error('PIXAZO_API_KEY not set');
  const endpoint = process.env.PIXAZO_QWEN_ENDPOINT || DEFAULT_ENDPOINT;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    body: JSON.stringify({
      model: 'qwen-image-edit',
      input: {
        messages: [
          {
            role: 'user',
            content: [{ image: referenceImageUrl }, { text: prompt }],
          },
        ],
      },
      parameters: { negative_prompt: negativePrompt, watermark: false },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pixazo Qwen ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as unknown;
  return extractQwenImage(data);
}
