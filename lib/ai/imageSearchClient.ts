/**
 * Image Search Client — fetches high-quality stock photos from Unsplash or Pexels.
 *
 * Instead of generating images with AI, this searches for relevant existing photos.
 * Much faster and free-tier friendly. Best for dev/demo when image generation isn't needed.
 *
 * Provider priority:
 * 1. Pexels (PEXELS_API_KEY) — 200 req/hour, great quality
 * 2. Unsplash (UNSPLASH_ACCESS_KEY) — 50 req/hour free tier
 * 3. Fallback SVG placeholder
 */

const MAX_QUERY_LENGTH = 100;

interface ImageSearchOptions {
  prompt: string;
  style?: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';
  width?: number;
  height?: number;
}

/**
 * Extract short search keywords from a verbose AI image prompt.
 * AI prompts are long and descriptive — stock photo APIs work better with concise queries.
 */
function extractSearchQuery(prompt: string): string {
  // Strip common AI image prompt noise
  const noise = [
    /child[- ]?friendly/gi,
    /colorful illustration/gi,
    /safe for children/gi,
    /cartoon style/gi,
    /detailed illustration/gi,
    /watercolor|pixel[- ]?art|comic style|manga style/gi,
    /illustration of/gi,
    /style illustration:/gi,
    /high quality/gi,
    /vibrant colors?/gi,
    /bright colors?/gi,
    /whimsical/gi,
    /[,;.!]+/g,
  ];

  let query = prompt;
  for (const pattern of noise) {
    query = query.replace(pattern, ' ');
  }

  // Collapse whitespace, trim, and limit length
  query = query.replace(/\s+/g, ' ').trim();

  if (query.length > MAX_QUERY_LENGTH) {
    // Take the first N characters, break at word boundary
    query = query.slice(0, MAX_QUERY_LENGTH).replace(/\s\S*$/, '').trim();
  }

  return query || 'children illustration colorful';
}

// ─── Pexels ──────────────────────────────────────────────────

async function searchPexels(query: string, width: number, height: number): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  const orientation = width > height ? 'landscape' : height > width ? 'portrait' : 'square';
  const encoded = encodeURIComponent(query);
  const url = `https://api.pexels.com/v1/search?query=${encoded}&per_page=5&orientation=${orientation}&size=medium`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[ImageSearch/Pexels] ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as { photos: Array<{ src: { medium: string; large: string } }> };
    if (!data.photos?.length) return null;

    // Pick a random photo from results to add variety
    const idx = Math.floor(Math.random() * data.photos.length);
    return data.photos[idx]?.src.medium ?? null;
  } catch (err) {
    console.warn('[ImageSearch/Pexels] Failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Unsplash ────────────────────────────────────────────────

async function searchUnsplash(query: string, width: number, height: number): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const orientation = width > height ? 'landscape' : height > width ? 'portrait' : 'squarish';
  const encoded = encodeURIComponent(query);
  const url = `https://api.unsplash.com/search/photos?query=${encoded}&per_page=5&orientation=${orientation}&content_filter=high`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[ImageSearch/Unsplash] ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as { results: Array<{ urls: { regular: string; small: string } }> };
    if (!data.results?.length) return null;

    const idx = Math.floor(Math.random() * data.results.length);
    // regular is ~1080px wide, good balance of quality/size
    return data.results[idx]?.urls.regular ?? null;
  } catch (err) {
    console.warn('[ImageSearch/Unsplash] Failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Search for a relevant stock photo matching the image prompt.
 * Tries Pexels → Unsplash → fallback SVG.
 * Same interface as generateImage / generateImageFree / generateImageLocal.
 */
export async function searchImage({
  prompt,
  style: _style,
  width = 512,
  height = 384,
}: ImageSearchOptions): Promise<string> {
  const query = extractSearchQuery(prompt);
  console.log(`[ImageSearch] Query: "${query}" (from prompt: "${prompt.slice(0, 60)}...")`);

  // Try Pexels first (higher rate limit)
  const pexelsUrl = await searchPexels(query, width, height);
  if (pexelsUrl) {
    console.log(`[ImageSearch] ✓ Pexels hit`);
    return pexelsUrl;
  }

  // Try Unsplash
  const unsplashUrl = await searchUnsplash(query, width, height);
  if (unsplashUrl) {
    console.log(`[ImageSearch] ✓ Unsplash hit`);
    return unsplashUrl;
  }

  // Fallback — SVG placeholder
  console.warn(`[ImageSearch] No results for "${query}", using fallback`);
  return fallbackDataUri(width, height);
}

function fallbackDataUri(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#f3e8ff"/><stop offset="100%" style="stop-color:#fef3c7"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
    <text x="50%" y="45%" text-anchor="middle" font-size="48" fill="#a78bfa">🖼️</text>
    <text x="50%" y="60%" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#9ca3af">Image coming soon</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
