const SAFETY_APPEND = ', child-friendly, colorful illustration, safe for children, cartoon style';
const MAX_PROMPT_LENGTH = 200;
const FETCH_TIMEOUT = 60_000; // 60s — Pollinations can take a while to generate
const MAX_RETRIES = 2;

interface ImageOptions {
  prompt: string;
  style?: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';
  width?: number;
  height?: number;
  seed?: number;
}

/**
 * Generate an image using Pollinations.ai — completely free, no API key needed.
 * Pre-fetches the image server-side and returns a base64 data URI so the browser
 * can display it immediately (no waiting for on-demand generation).
 */
export async function generateImageFree({
  prompt,
  style = 'cartoon',
  width = 512,
  height = 384,
  seed: providedSeed,
}: ImageOptions): Promise<string> {
  const trimmedPrompt = prompt.length > MAX_PROMPT_LENGTH
    ? prompt.slice(0, MAX_PROMPT_LENGTH).replace(/\s\S*$/, '')
    : prompt;

  const safePrompt = `${style} style illustration: ${trimmedPrompt}${SAFETY_APPEND}`;
  const encoded = encodeURIComponent(safePrompt);
  const seed = providedSeed ?? Math.floor(Math.random() * 100000);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

  // Fetch the image server-side with retries
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'image/*' },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`[Pollinations] Attempt ${attempt + 1} got status ${res.status}`);
        if (attempt < MAX_RETRIES) continue;
        return fallbackDataUri(width, height);
      }

      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const base64 = Buffer.from(buffer).toString('base64');
      return `data:${contentType};base64,${base64}`;
    } catch (err) {
      console.warn(`[Pollinations] Attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
      if (attempt < MAX_RETRIES) continue;
      return fallbackDataUri(width, height);
    }
  }

  return fallbackDataUri(width, height);
}

/** Simple SVG fallback as data URI — always works, no external dependency */
function fallbackDataUri(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#f3e8ff"/><stop offset="100%" style="stop-color:#fef3c7"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
    <text x="50%" y="45%" text-anchor="middle" font-size="48" fill="#a78bfa">📖</text>
    <text x="50%" y="60%" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#9ca3af">Use your imagination!</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
