/** Image / PDF OCR service for forwarded homework.
 *
 *  v1 uses Google Cloud Vision via the REST API (no SDK dependency — a plain
 *  `fetch` keeps the bundle thin). Handles:
 *    - Photos (JPEG/PNG) — `DOCUMENT_TEXT_DETECTION`
 *    - PDFs — single-page synchronous OCR via `DOCUMENT_TEXT_DETECTION` on
 *      the bytes (Vision handles single-page PDFs up to 2000 px)
 *
 *  Equation / diagram / handwriting handling (Mathpix) is deferred to v1.1
 *  per the plan file. When Vision's confidence is low, callers should prompt
 *  the kid to type the question instead.
 *
 *  Environment:
 *    GOOGLE_CLOUD_VISION_KEY — Google Cloud API key with Vision API enabled.
 *    Missing key → returns null so the caller can prompt "please type it".
 *
 *  @see /docs/architecture.md "Google Cloud Vision | OCR for forwarded homework"
 */

const VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
const TIMEOUT_MS = 20_000;
/** Anything below this mean page-level confidence is treated as "rough" —
 *  the caller will still receive the text but should consider prompting
 *  the kid to confirm or retype. Vision returns confidence per block /
 *  paragraph / word; we average page-level symbols for a single scalar. */
const LOW_CONFIDENCE_THRESHOLD = 0.75;

export interface OcrResult {
  text: string;
  /** Mean per-symbol confidence across the page (0-1). `null` when Vision
   *  did not return confidence (e.g. very short responses). */
  confidence: number | null;
  /** True when confidence is below `LOW_CONFIDENCE_THRESHOLD`. Caller
   *  should prompt "can you confirm or type this?" rather than feeding
   *  questionable text into the LLM parser. */
  lowConfidence: boolean;
}

/** OCR an image (or single-page PDF). Input is raw bytes — the caller
 *  already downloaded the file from Telegram. Returns null when:
 *    - `GOOGLE_CLOUD_VISION_KEY` is not set (env misconfig or local dev)
 *    - Vision returned no text (truly blank image)
 *    - Vision returned a network/4xx/5xx error
 *  Callers should respond with "please type the question" in these cases. */
export async function extractTextFromImage(bytes: Buffer): Promise<OcrResult | null> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_KEY;
  if (!apiKey || apiKey.includes('your-vision-key')) {
    return null;
  }

  try {
    const res = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        requests: [
          {
            image: { content: bytes.toString('base64') },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
            imageContext: {
              // Restrict language hints to the v1 languages — avoids Vision
              // "helpfully" detecting random Arabic-looking scribbles.
              languageHints: ['en', 'hi'],
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(
        `[OCR/vision] ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
      );
      return null;
    }

    const data = (await res.json()) as VisionResponse;
    return parseVisionResponse(data);
  } catch (err) {
    console.warn('[OCR/vision] failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Private ───────────────────────────────────────────────────────────────

interface VisionResponse {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
      pages?: Array<{
        blocks?: Array<{
          paragraphs?: Array<{
            words?: Array<{
              symbols?: Array<{ confidence?: number }>;
            }>;
          }>;
        }>;
      }>;
    };
    error?: { message?: string };
  }>;
}

function parseVisionResponse(data: VisionResponse): OcrResult | null {
  const first = data.responses?.[0];
  if (!first) return null;
  if (first.error) {
    console.warn('[OCR/vision] response error:', first.error.message);
    return null;
  }
  const text = first.fullTextAnnotation?.text?.trim();
  if (!text) return null;

  // Average symbol-level confidence. Vision populates confidence most
  // reliably at the symbol level; skip anything without a confidence.
  let count = 0;
  let sum = 0;
  for (const page of first.fullTextAnnotation?.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const word of para.words ?? []) {
          for (const sym of word.symbols ?? []) {
            if (typeof sym.confidence === 'number') {
              sum += sym.confidence;
              count += 1;
            }
          }
        }
      }
    }
  }
  const confidence = count > 0 ? sum / count : null;
  const lowConfidence =
    confidence !== null && confidence < LOW_CONFIDENCE_THRESHOLD;

  return { text, confidence, lowConfidence };
}
