const SAFETY_APPEND = ', child-friendly, colorful illustration, safe for children, cartoon style';

interface ImageOptions {
  prompt: string;
  style?: 'watercolor' | 'cartoon' | 'pixel-art' | 'comic';
  width?: number;
  height?: number;
}

/**
 * Generate an image using Pollinations.ai — completely free, no API key needed.
 * Returns a URL that generates the image on first browser load.
 */
export async function generateImageFree({
  prompt,
  style = 'cartoon',
  width = 768,
  height = 512,
}: ImageOptions): Promise<string> {
  const safePrompt = `${style} style illustration: ${prompt}${SAFETY_APPEND}`;
  const encoded = encodeURIComponent(safePrompt);
  const seed = Math.floor(Math.random() * 100000);

  // Pollinations generates images on-demand when the URL is loaded by the browser
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
}
